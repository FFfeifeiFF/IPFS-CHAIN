package template

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/gin-gonic/gin"
	shell "github.com/ipfs/go-ipfs-api"
	"io"
	"io/ioutil"
	"log"
	"math/big"
	"net/http"
	"strings"
	"time"
)

// Transaction 结构体（Ganache 返回的交易数据）
type Transaction struct {
	Hash  string `json:"hash"`
	Input string `json:"input"` // 交易输入数据（可能包含 IPFS 哈希）
}

// 通过交易哈希查询交易详情
func getTransactionByHash(txHash string) (*Transaction, error) {
	// Ganache 默认 RPC 地址（如果是默认配置）
	url := "http://127.0.0.1:7545"

	// 构造 JSON-RPC 请求
	requestBody := map[string]interface{}{
		"jsonrpc": "2.0",
		"method":  "eth_getTransactionByHash",
		"params":  []interface{}{txHash},
		"id":      1,
	}

	// 转换为 JSON
	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("JSON 编码失败: %v", err)
	}

	// 发送 HTTP POST 请求
	resp, err := http.Post(url, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return nil, fmt.Errorf("RPC 请求失败: %v", err)
	}
	defer resp.Body.Close()

	// 读取响应
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("读取响应失败: %v", err)
	}

	// 解析 JSON-RPC 响应
	var rpcResponse struct {
		Result *Transaction `json:"result"`
		Error  struct {
			Message string `json:"message"`
		} `json:"error"`
	}

	if err := json.Unmarshal(body, &rpcResponse); err != nil {
		return nil, fmt.Errorf("JSON 解析失败: %v", err)
	}

	if rpcResponse.Error.Message != "" {
		return nil, fmt.Errorf("RPC 错误: %s", rpcResponse.Error.Message)
	}

	return rpcResponse.Result, nil
}
func mustNewType(t string) abi.Type {
	ty, err := abi.NewType(t, "", nil)
	if err != nil {
		panic(err)
	}
	return ty
}

// 区块链记录和数据库存储,积分变化的部分
func recordTransactionToBlockchainAndDB(
	c *gin.Context,
	db *sql.DB,
	username string,
	operation string, // "download"或"upload"或"upload_reward"
	pointsChange int64,
) error {
	// 1. 连接Ganache
	client, err := ethclient.Dial(ibcGanacheURL)
	if err != nil {
		return fmt.Errorf("连接区块链失败: %v", err)
	}

	// 2. 加载合约
	contractAddress := common.HexToAddress(ibcContractAddress)
	contract, err := NewContract(contractAddress, client)
	if err != nil {
		return fmt.Errorf("加载合约失败: %v", err)
	}

	privateKey, err := crypto.HexToECDSA(ibcPrivateKey)
	if err != nil {
		return fmt.Errorf("私钥解析失败: %v", err)
	}

	// 4. 准备交易
	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, big.NewInt(1337))
	if err != nil {
		return fmt.Errorf("创建交易签名者失败: %v", err)
	}
	auth.Value = big.NewInt(0) // 不发送ETH
	auth.GasLimit = uint64(300000)

	// 5. 发送交易到区块链
	tx, err := contract.RecordTransaction(auth, username, operation, big.NewInt(pointsChange))
	if err != nil {
		return fmt.Errorf("区块链交易失败: %v", err)
	}

	// 6. 等待交易确认
	receipt, err := bind.WaitMined(context.Background(), client, tx)
	if err != nil {
		return fmt.Errorf("等待交易确认失败: %v", err)
	}
	fmt.Println(receipt)
	// 7. 将交易记录存入数据库
	_, err = db.Exec(`
		INSERT INTO blockchain_transactions (
			tx_hash, 
			user_id, 
			timestamp
		) VALUES (?, 
			(SELECT id FROM user WHERE username = ?), 
			?)`,
		tx.Hash().Hex(),
		username,
		time.Now().Unix(),
	)
	if err != nil {
		return fmt.Errorf("保存交易记录失败: %v", err)
	}

	return nil
}

// --- 辅助函数：根据用户名获取用户 ID ---
func getUserIDByUsername(db *sql.DB, username string) (int, error) {
	var userID int
	query := "SELECT id FROM user WHERE username = ?"
	err := db.QueryRow(query, username).Scan(&userID) // 使用 QueryRow 获取单行结果
	if err != nil {
		if err == sql.ErrNoRows {
			// 用户不存在是业务逻辑错误，明确返回
			return 0, fmt.Errorf("用户 '%s' 不存在于数据库中", username)
		}
		// 其他数据库错误
		log.Printf("错误: 查询用户 ID 时出错 (Username: %s): %v", username, err)
		return 0, fmt.Errorf("数据库查询用户 ID 失败: %w", err)
	}
	return userID, nil
}

// --- 新增: 记录操作到 SBC 链 ---
func recordOperationOnSBC(db *sql.DB, username, operationType, targetIdentifier, details string) error {
	log.Printf("尝试在 SBC 记录操作: User=%s, Type=%s, Target=%s, Details=%s",
		username, operationType, targetIdentifier, details)
	//数据库
	userID, err := getUserIDByUsername(db, username)
	if err != nil {
		// 如果用户不存在，直接返回错误，不进行后续操作
		// 错误已在 getUserIDByUsername 中记录
		return fmt.Errorf("数据库用户查找失败，无法继续操作: %w", err)
	}
	log.Printf("数据库检查：用户 %s (ID: %d) 存在", username, userID)

	//2.交互
	// 2.1. 连接 SBC Ganache
	client, err := ethclient.Dial(sbcGanacheURL)
	if err != nil {
		// 记录错误，但不一定需要中断主流程
		log.Printf("错误: 连接 SBC 区块链失败: %v", err)
		return fmt.Errorf("连接 SBC 区块链失败: %w", err)
	}
	defer client.Close()
	// 2.2. 加载 SBC 操作账户私钥
	privateKey, err := crypto.HexToECDSA(sbcPrivateKey)
	if err != nil {
		log.Printf("错误: 解析 SBC 私钥失败: %v", err)
		return fmt.Errorf("解析 SBC 私钥失败: %w", err)
	}

	// 2.3. 准备交易选项 (TransactOpts)
	chainID := big.NewInt(1337) // 使用 SBC 的 Chain ID
	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		log.Printf("错误: 创建 SBC 交易签名者失败: %v", err)
		return fmt.Errorf("创建 SBC 交易签名者失败: %w", err)
	}

	// 设置 Gas Price 和 Nonce
	ctx := context.Background()
	gasPrice, err := client.SuggestGasPrice(ctx)
	if err != nil {
		log.Printf("警告: 无法获取 SBC 建议 Gas Price: %v. 可能使用默认值或导致失败.", err)
		// 可以考虑设置一个默认值，或者如果 Gas Price 至关重要则返回错误
	} else {
		auth.GasPrice = gasPrice
	}

	nonce, err := client.PendingNonceAt(ctx, crypto.PubkeyToAddress(privateKey.PublicKey))
	if err != nil {
		log.Printf("错误: 无法获取 SBC Nonce: %v", err)
		return fmt.Errorf("获取 SBC Nonce 失败: %w", err) // Nonce 错误通常比较严重
	}
	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)     // 交易不发送 ETH
	auth.GasLimit = uint64(300000) // 根据合约方法复杂度调整

	// 2.4. 加载 SBC 合约实例 (使用 abigen 生成的代码)
	contractAddress := common.HexToAddress(sbcContractAddress)
	instance, err := NewTemplate(contractAddress, client) // 使用生成的 New 函数
	if err != nil {
		log.Printf("错误: 加载 SBC 合约实例失败: %v", err)
		return fmt.Errorf("加载 SBC 合约实例失败: %w", err)
	}

	// 2.5. 调用合约的 recordOperation 方法
	tx, err := instance.RecordOperation(auth, username, operationType, targetIdentifier, details)
	if err != nil {
		// 记录详细错误，帮助调试
		log.Printf("错误: 发送 SBC 记录操作交易失败: User=%s, Type=%s, Target=%s, Error=%v",
			username, operationType, targetIdentifier, err)
		return fmt.Errorf("发送 SBC 记录操作交易失败: %w", err)
	}
	// 获取交易哈希，这是要存入数据库的关键信息
	txHash := tx.Hash().Hex()
	log.Printf("SBC 记录操作交易已发送: TxHash=%s", tx.Hash().Hex())

	// 可选: 等待交易被挖出 (如果需要确认记录成功)
	// receipt, err := bind.WaitMined(context.Background(), client, tx)
	// if err != nil {
	//     log.Printf("警告: 等待 SBC 交易 %s 确认失败: %v", tx.Hash().Hex(), err)
	//     // 即使确认失败，可能也已成功，只记录警告
	// } else if receipt.Status == 0 {
	//     log.Printf("警告: SBC 交易 %s 执行失败 (状态 0)", tx.Hash().Hex())
	// } else {
	//     log.Printf("SBC 交易 %s 确认成功", tx.Hash().Hex())
	// }

	// --- 3. 数据库记录 ---
	// 3.1 准备 SQL 插入语句
	// 使用预处理语句 (Prepared Statement) 防止 SQL 注入
	insertQuery := `
		INSERT INTO sbc_operation_log
			(user_id, sbc_tx_hash, operation_type, target_identifier)
		VALUES (?, ?, ?, ?)`
	stmt, err := db.PrepareContext(ctx, insertQuery) // 使用 PrepareContext 更佳
	if err != nil {
		log.Printf("严重错误: 准备数据库插入语句失败 (TxHash: %s): %v", txHash, err)
		// SBC 交易已发送，但数据库无法准备插入，这是一个关键错误，需要记录或告警
		// 返回错误，表明操作未完全成功
		return fmt.Errorf("数据库日志记录准备失败 (SBC Tx 已发送: %s): %w", txHash, err)
	}
	defer stmt.Close() // 确保语句最终被关闭

	// 3.2 执行插入操作
	_, err = stmt.ExecContext(ctx, userID, txHash, operationType, targetIdentifier)
	if err != nil {
		// 检查可能的数据库错误，例如 sbc_tx_hash 的 UNIQUE 约束冲突
		// (可以根据具体的 driver 返回的 error 类型或 code 来判断)
		log.Printf("严重错误: 插入 SBC 操作日志到数据库失败: UserID=%d, TxHash=%s, Type=%s, Target=%s, Error=%v",
			userID, txHash, operationType, targetIdentifier, err)
		// SBC 交易已发送，但数据库记录失败，操作不一致，返回错误
		return fmt.Errorf("数据库日志记录执行失败 (SBC Tx 已发送: %s): %w", txHash, err)
	}

	log.Printf("数据库记录成功: LogID (自动生成), UserID=%d, TxHash=%s", userID, txHash)

	return nil // 即使等待确认失败，也认为发送成功
}

func DownloadFile(c *gin.Context) {
	var ipfsHash string
	id := c.DefaultQuery("id", "0")
	username := c.DefaultQuery("username", "")
	isCheck := c.DefaultQuery("check", "false") == "true" // 检查模式标志
	fmt.Println(isCheck)
	//fmt.Println(username)
	//连接数据库
	dsn := "root:123456@tcp(127.0.0.1:3307)/golan"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库连接失败"})
		return
	}
	defer db.Close()

	// 查询当前页的文章的TX值
	query := `
    SELECT m.hash, m.points, u.username
    FROM message m
    JOIN user u ON m.user_id = u.id
    WHERE m.message_id = ?  
`
	var hash string
	var articlePoints int
	var ownerUsername string
	err = db.QueryRow(query, id).Scan(&hash, &articlePoints, &ownerUsername) // yourID 是你要查询的ID参数
	//fmt.Println(hash)
	//fmt.Println(points)
	if err != nil {
		if err == sql.ErrNoRows {
			fmt.Println("没有找到对应的记录")
			c.JSON(http.StatusNotFound, gin.H{"error": "记录不存在"})
		} else {
			fmt.Println("数据库查询失败:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询失败"})
		}
		return
	}

	// 2. 查询用户积分
	var userPoints int
	err = db.QueryRow(`
        SELECT points 
        FROM user 
        WHERE username = ?`, username).Scan(&userPoints)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "查询用户积分失败"})
		}
		return
	}
	// --- 判断下载者是否是文件所有者 ---
	isOwnerDownloading := (username == ownerUsername)
	fmt.Println(555)
	fmt.Println(isOwnerDownloading)
	// 3. 检查积分是否足够
	if userPoints < articlePoints {
		c.JSON(http.StatusPaymentRequired, gin.H{
			"error":           "积分不足",
			"required_points": articlePoints,
			"current_points":  userPoints,
		})
		return
	}

	// 如果是检查模式，只返回可下载信息
	// --- 处理检查模式 ---
	if isCheck {
		if isOwnerDownloading {
			// 所有者检查自己的文件，总是可以下载，所需积分为0
			c.JSON(http.StatusOK, gin.H{
				"can_download":    true,
				"required_points": 0, // 所有者下载免费
				"current_points":  userPoints,
				"is_owner":        true,
			})
		} else {
			// 非所有者检查，按正常逻辑判断
			canDownload := userPoints >= articlePoints
			c.JSON(http.StatusOK, gin.H{
				"can_download":    canDownload,
				"required_points": articlePoints,
				"current_points":  userPoints,
				"is_owner":        false,
			})
		}
		return // 检查模式响应后结束请求
	}
	// --- 处理下载流程 (非检查模式) ---
	var sbcTargetIdentifier string // 用于SBC记录的目标标识符

	if isOwnerDownloading {
		// --- 情况 1: 所有者下载自己的文件 ---
		log.Printf("用户 %s 正在下载自己的文件 (ID: %s)", username, id)

		// 不需要进行积分转移
		// 只需要记录一次区块链交易，标记为自下载，积分为0
		err = recordTransactionToBlockchainAndDB(
			c,
			db,
			username,        // 执行操作的用户是自己
			"self_download", // 定义一个新的操作类型表示“自下载”
			0,               // 积分变化量为 0
		)
		if err != nil {
			// 区块链记录失败通常不应阻止下载，但需要记录日志
			log.Printf("警告: 用户 %s 的自下载区块链记录失败 (文件ID: %s): %v", username, id, err)
		}
		uploadTx, err := getTransactionByHash(hash) // hash 是从 message 表查出来的 articleTxHash
		if err != nil {
			log.Printf("错误: 下载前获取原始交易失败 (Tx: %s): %v", hash, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取文件源信息失败"})
			return
		}
		if uploadTx == nil || uploadTx.Input == "" || len(uploadTx.Input) <= 10 {
			log.Printf("错误: 无效的文件源交易数据 (Tx: %s)", hash)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "无效的文件源交易数据"})
			return
		}
		ipfsHash, _, err = decodeStoreFileTx(uploadTx.Input) // *** 调用下面新增的辅助函数 ***
		if err != nil {
			log.Printf("错误: 下载前解析 IPFS Hash 失败 (Tx: %s): %v", hash, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "解析文件源信息失败"})
			return
		}
		sbcTargetIdentifier = ipfsHash // SBC记录下载的目标是IPFS Hash
		// *** 在执行下载前，记录 SBC 操作 ***
		errSBC := recordOperationOnSBC(db, username, "self_download", sbcTargetIdentifier, "无操作")
		if errSBC != nil {
			log.Printf("警告: 记录 SBC 自下载操作失败: %v", errSBC)
			// 通常只记录警告，不中断下载
		}
	} else {
		// --- 情况 2: 非所有者下载文件 ---
		log.Printf("用户 %s 正在下载 %s 的文件 (ID: %s), 需要 %d 积分", username, ownerUsername, id, articlePoints)

		// 1. 再次检查积分 (非检查模式下是最终确认)
		if userPoints < articlePoints {
			c.JSON(http.StatusPaymentRequired, gin.H{
				"error":           "积分不足",
				"required_points": articlePoints,
				"current_points":  userPoints,
			})
			return
		}

		// 2. 执行数据库积分转移
		txDB, err := db.Begin() // 启动数据库事务
		if err != nil {
			log.Printf("数据库事务启动失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库事务启动失败"})
			return
		}
		// 使用 defer txDB.Rollback() 保证在出错或未Commit时回滚
		defer txDB.Rollback()

		// 从下载者扣除积分
		_, err = txDB.Exec(`UPDATE user SET points = points - ? WHERE username = ?`, articlePoints, username)
		if err != nil {
			log.Printf("数据库扣除用户 %s 积分失败: %v", username, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "扣除积分失败"})
			return
		}

		// 给文件所有者增加积分
		_, err = txDB.Exec(`UPDATE user SET points = points + ? WHERE username = ?`, articlePoints, ownerUsername)
		if err != nil {
			log.Printf("数据库增加用户 %s 积分失败: %v", ownerUsername, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "增加所有者积分失败"})
			return
		}

		// 提交数据库事务
		if err = txDB.Commit(); err != nil {
			log.Printf("数据库事务提交失败: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库事务提交失败"})
			return
		}
		log.Printf("数据库积分转移成功: %s (-%d) -> %s (+%d)", username, articlePoints, ownerUsername, articlePoints)

		// 3. 记录两次区块链交易
		// 记录下载者的扣分交易
		err = recordTransactionToBlockchainAndDB(
			c,
			db,
			username,
			"download",
			-int64(articlePoints), // 负数表示扣分
		)
		if err != nil {
			log.Printf("警告: 用户 %s 的下载扣分区块链记录失败 (文件ID: %s): %v", username, id, err)
			// 根据业务需求决定是否需要中断操作
		}

		// 记录所有者的奖励交易
		err = recordTransactionToBlockchainAndDB(
			c,
			db,
			ownerUsername,
			"upload_reward",
			int64(articlePoints), // 正数表示奖励
		)
		if err != nil {
			log.Printf("警告: 用户 %s 的上传奖励区块链记录失败 (文件ID: %s): %v", ownerUsername, id, err)
		}
		// *** 获取 IPFS Hash (同上) ***
		uploadTx, err := getTransactionByHash(hash)
		if err != nil {
			log.Printf("错误: 下载前获取原始交易失败 (Tx: %s): %v", hash, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取文件源信息失败"})
			return
		}
		if uploadTx == nil || uploadTx.Input == "" || len(uploadTx.Input) <= 10 {
			log.Printf("错误: 无效的文件源交易数据 (Tx: %s)", hash)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "无效的文件源交易数据"})
			return
		}
		ipfsHash, _, err = decodeStoreFileTx(uploadTx.Input) // *** 调用下面新增的辅助函数 ***
		if err != nil {
			log.Printf("错误: 下载前解析 IPFS Hash 失败 (Tx: %s): %v", hash, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "解析文件源信息失败"})
			return
		}
		sbcTargetIdentifier = ipfsHash

		// *** 在执行下载前，记录 SBC 操作 ***
		errSBC := recordOperationOnSBC(db, username, "download", sbcTargetIdentifier, "无操作")
		if errSBC != nil {
			log.Printf("警告: 记录 SBC 下载操作失败: %v", errSBC)
		}
	}

	// 2. 通过 Ganache RPC 获取交易详情
	tx, err := getTransactionByHash(hash)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取交易失败: " + err.Error()})
		return
	}

	// 3. 解析交易输入数据（调用智能合约的 ABI 数据）
	contractAbi, err := abi.JSON(strings.NewReader(FileStorageMetaData.ABI))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "ABI 解析失败"})
		return
	}
	// 4. 解码交易输入数据
	if len(tx.Input) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "不是合约调用交易"})
		return
	}
	methodSig := tx.Input[:10] // 前 4 字节（0x + 8字符）
	method, err := contractAbi.MethodById(common.FromHex(methodSig))

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "无法识别交易方法"})
		return
	}
	if method.Name != "storeFile" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "交易不是 StoreFile 调用"})
		return
	}
	data := common.FromHex(tx.Input[10:])
	args := abi.Arguments{
		{Name: "_user", Type: mustNewType("string")},
		{Name: "_filename", Type: mustNewType("string")},
		{Name: "_ipfsHash", Type: mustNewType("string")},
		{Name: "_description", Type: mustNewType("string")},
	}
	decoded, err := args.Unpack(data)
	//4.去IPFS下载
	ipfsHash1 := decoded[2].(string)
	fmt.Println(ipfsHash1)
	sh := shell.NewShell("localhost:5001") // IPFS API 默认端口
	data2, err := sh.Cat(ipfsHash1)        // 返回 io.ReadCloser
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "IPFS 文件读取失败: " + err.Error()})
		return
	}
	defer data2.Close() // 重要！必须关闭 ReadCloser

	// 获取文件名（从智能合约参数中提取）
	filename := decoded[1].(string) // _filename 是第二个参数

	// 设置响应头，告诉浏览器这是文件下载
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Header("Content-Type", "application/octet-stream") // 二进制流，通用文件类型

	// 直接将文件流式传输到客户端
	_, err = io.Copy(c.Writer, data2)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "文件传输失败: " + err.Error()})
		return
	}
}

// 返回 ipfsHash, filename, error
func decodeStoreFileTx(txInput string) (string, string, error) {
	// *** 确保 FileStorageMetaData.ABI 定义了正确的 CBC 合约 ABI ***
	// var FileStorageMetaData = struct{ ABI string }{ABI: `...`}
	if FileStorageMetaData.ABI == "" {
		return "", "", fmt.Errorf("CBC 合约 ABI 未定义")
	}

	contractAbi, err := abi.JSON(strings.NewReader(FileStorageMetaData.ABI))
	if err != nil {
		return "", "", fmt.Errorf("ABI 解析失败: %w", err)
	}

	if len(txInput) <= 10 {
		return "", "", fmt.Errorf("交易输入数据过短")
	}

	methodSig := txInput[:10]
	method, err := contractAbi.MethodById(common.FromHex(methodSig))
	if err != nil {
		return "", "", fmt.Errorf("无法识别交易方法 (Sig: %s): %w", methodSig, err)
	}

	if method.Name != "storeFile" { // 确认方法名
		return "", "", fmt.Errorf("交易不是 StoreFile 调用 (是 %s)", method.Name)
	}

	data := common.FromHex(txInput[10:])
	args := abi.Arguments{
		{Name: "_user", Type: mustNewType("string")},
		{Name: "_filename", Type: mustNewType("string")},
		{Name: "_ipfsHash", Type: mustNewType("string")},
		{Name: "_description", Type: mustNewType("string")},
	}
	decoded, err := args.Unpack(data)
	if err != nil {
		return "", "", fmt.Errorf("解码交易输入失败: %w", err)
	}

	if len(decoded) < 3 {
		return "", "", fmt.Errorf("解码后的参数数量不足")
	}

	ipfsHash, okIpfs := decoded[2].(string)
	filename, okFilename := decoded[1].(string)

	if !okIpfs || !okFilename {
		return "", "", fmt.Errorf("解码参数类型断言失败")
	}

	return ipfsHash, filename, nil
}

package template

import (
	"bytes"
	"context"
	"database/sql"
	"fmt"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/gin-gonic/gin"
	shell "github.com/ipfs/go-ipfs-api"
	"io"
	"log"
	"math/big"
	"net/http"
	"time"
)

// FileMetadata 定义存储到数据库的文件元数据结构
type FileMetadata struct {
	Filename    string    `json:"filename"`
	UploadDate  time.Time `json:"uploadDate"`
	IPFSHash    string    `json:"ipfsHash"`
	Description string    `json:"description"`
}

// Ganache配置
const (
	//CBC
	cbcGanacheURL      = "http://localhost:7545"                                            // Ganache默认RPC地址
	cbcPrivateKey      = "c8f1739afbad21898b0481ffd4ef13cc959f5d8fd1aa944e694bbac0f9ce4da5" // 替换为你的Ganache账户私钥
	cbcContractAddress = "0x8E224fc83924b7e8fDe212b05Cc2690225C7722D"                       // 替换为你的智能合约地址

	//SBC
	sbcGanacheURL      = "http://localhost:7547" // 假设SBC使用不同端口
	sbcPrivateKey      = "bef04f3f3b4987e8354e5ebbe7461e0216d35d464cb46420d7c49825065397f3"
	sbcContractAddress = "0x6906CF457d423D73209446b7A7D60BfeB37F9aC5"

	//IBC
	ibcGanacheURL      = "http://localhost:7546" // 假设IBC使用不同端口
	ibcPrivateKey      = "7acc49c100e782cd7f2ed18174cb131d94d42182a6d5751c85710520b8899931"
	ibcContractAddress = "0x61E7E7Ca5a4a2d8Cc801747d46FD57EB3d647d85"

	defaultChainID = 1337
)

// 上传文件
func UploadFile(c *gin.Context) {
	// 解析表单数据
	if err := c.Request.ParseMultipartForm(10 << 20); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file"})
		return
	}

	// 获取上传的文件
	file, header, err := c.Request.FormFile("file")

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid file"})
		return
	}
	defer file.Close()

	username := c.Request.FormValue("username")
	description := c.Request.FormValue("description")
	// 创建一个缓冲区来读取文件内容
	buffer := new(bytes.Buffer)
	if _, err := io.Copy(buffer, file); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to read file"})
		return
	}

	// 上传文件到IPFS
	ipfsHash, err := uploadFileToIPFS(buffer)

	if err != nil {
		log.Printf("Failed to upload to IPFS: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to upload to IPFS"})
		return
	}
	// 创建一个 IPFS Shell 实例
	sh := shell.NewShell("localhost:5001")

	// 将文件复制到 MFS
	filename := header.Filename // 获取原始文件名
	mfsPath := "/" + filename   // 将文件保存在 MFS 根目录，使用原始文件名
	err = sh.FilesCp(context.Background(), "/ipfs/"+ipfsHash, mfsPath)
	if err != nil {
		log.Printf("Failed to copy file to MFS: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to copy file to MFS"})
		return
	}

	// 返回 IPFS 哈希值和 MFS 路径
	//c.JSON(http.StatusOK, gin.H{"hash": ipfsHash, "mfs_path": mfsPath})

	txHash, err := storeOnBlockchain(username, header.Filename, ipfsHash, description)
	if err != nil {
		log.Printf("Failed to store on blockchain: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":     "File uploaded to IPFS but failed to store on blockchain",
			"ipfs_hash": ipfsHash,
			"mfs_path":  mfsPath,
		})
		return
	}

	//连接数据库
	dsn := "root:123456@tcp(127.0.0.1:3307)/golan"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库连接失败"})
		return
	}
	defer db.Close()

	var sbcTxHash string
	var sbcErr error
	//上传到SBC中
	log.Printf("尝试在 SBC 链上为 IPFS 哈希 %s 记录 'upload' 操作", ipfsHash)
	operationType := "upload"
	// details 字段可以包含额外信息，例如文件名
	details := fmt.Sprintf("文件名: %s", filename)
	sbcTxHash, sbcErr = recordOperationuploadOnSBC(username, operationType, ipfsHash, details)
	if err != nil {
		log.Printf("错误: 在 SBC 上记录哈希 %s 的操作失败 (在 CBC 成功之后, CBC Tx: %s): %v", ipfsHash, txHash, sbcErr)
		// 这是部分成功的状态：文件已在 IPFS，元数据已在 CBC，但操作日志在 SBC 上失败。
		c.JSON(http.StatusInternalServerError, gin.H{
			"warning":     "文件已上传且元数据已存储在 CBC，但在 SBC 区块链上记录操作失败",
			"ipfs_hash":   ipfsHash,
			"mfs_path":    mfsPath,
			"cbc_tx_hash": txHash,         // 包含成功的 CBC 交易哈希
			"sbc_error":   sbcErr.Error(), // 提供 SBC 的具体错误信息
		})
		return
	}
	log.Printf("成功在 SBC 链上记录操作 (交易哈希: %s)", sbcTxHash)

	// 6. --- 新增：将 SBC 操作日志保存到数据库 ---
	log.Printf("尝试将 SBC 操作日志 (Tx: %s) 保存到数据库", sbcTxHash)
	// 6.1 获取用户 ID
	//fmt.Println(888)
	//fmt.Println(username)
	//fmt.Println(888)
	//fmt.Println(description)
	userID, err := getUserIDByUsername(db, username)
	if err != nil {
		log.Printf("错误: 无法为用户名 '%s' 获取用户 ID: %v", username, err)
		// 如果找不到用户，可能返回 400 Bad Request 或 500 Internal Server Error，取决于业务逻辑
		c.JSON(http.StatusInternalServerError, gin.H{
			"warning":     "链上操作成功，但查找用户信息失败，无法保存数据库日志",
			"ipfs_hash":   ipfsHash,
			"mfs_path":    mfsPath,
			"cbc_tx_hash": txHash,
			"sbc_tx_hash": sbcTxHash,
			"db_error":    err.Error(), // 包含查找用户失败的信息
		})
		return
	}
	log.Printf("成功获取用户 '%s' 的 ID: %d", username, userID)

	// 6.2 保存日志
	// target_identifier 在数据库中是 IPFS 哈希
	err = saveSBCOperationLog(db, userID, sbcTxHash, operationType, ipfsHash)
	if err != nil {
		log.Printf("错误: 保存 SBC 操作日志 (Tx: %s) 到数据库失败: %v", sbcTxHash, err)
		// 链上操作已完成，但数据库记录失败，这是内部错误
		c.JSON(http.StatusInternalServerError, gin.H{
			"warning":     "链上操作成功，但保存操作日志到数据库失败",
			"ipfs_hash":   ipfsHash,
			"mfs_path":    mfsPath,
			"cbc_tx_hash": txHash,
			"sbc_tx_hash": sbcTxHash,
			"db_error":    err.Error(), // 包含数据库插入失败的信息
		})
		return
	}
	log.Printf("成功将 SBC 操作日志 (Tx: %s) 保存到数据库", sbcTxHash)

	c.JSON(http.StatusOK, gin.H{
		"hash":      ipfsHash,
		"mfs_path":  mfsPath,
		"tx_hash":   txHash,
		"message":   "File uploaded and recorded on blockchain successfully",
		"filename":  header.Filename,
		"timestamp": time.Now().Format(time.RFC3339),
	})

	// 返回IPFS哈希值
	//c.JSON(http.StatusOK, gin.H{"hash": ipfsHash})
}

// 上传文件到IPFS
func uploadFileToIPFS(file io.Reader) (string, error) {
	// 创建一个IPFS Shell实例，连接到本地运行的IPFS节点
	sh := shell.NewShell("localhost:5001")

	// 将文件上传到IPFS
	hash, err := sh.Add(file)
	if err != nil {
		return "", fmt.Errorf("failed to upload file to IPFS: %w", err)
	}
	err = sh.Pin(hash)
	if err != nil {
		log.Printf("Failed to pin file %s: %v", hash, err) // 更详细的日志
		return "", fmt.Errorf("failed to pin file: %w", err)
	} else {
		log.Printf("Successfully pinned file %s", hash) // 成功 pinned 的日志
	}

	return hash, nil
}

// 初始化区块链客户端
func initBlockchainClient() (*ethclient.Client, *bind.TransactOpts, error) {
	// 连接到Ganache
	client, err := ethclient.Dial(cbcGanacheURL)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to connect to Ganache: %v", err)
	}

	// 加载私钥
	cbcPrivateKeyECDSA, err := crypto.HexToECDSA(cbcPrivateKey)
	if err != nil {
		return nil, nil, fmt.Errorf("invalid private key: %v", err)
	}

	// 获取链ID (Ganache通常使用)
	chainID := big.NewInt(1337)

	// 创建交易签名者
	auth, err := bind.NewKeyedTransactorWithChainID(cbcPrivateKeyECDSA, chainID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to create transactor: %v", err)
	}

	return client, auth, nil
}

// 存储文件信息到区块链
func storeOnBlockchain(user, filename, ipfsHash, description string) (string, error) {
	client, auth, err := initBlockchainClient()
	if err != nil {
		return "", err
	}

	// 加载合约
	address := common.HexToAddress(cbcContractAddress)
	instance, err := NewFileStorage(address, client)
	if err != nil {
		return "", fmt.Errorf("failed to load contract: %v", err)
	}

	// 3. 验证合约代码是否存在
	code, err := client.CodeAt(context.Background(), address, nil)
	if err != nil {
		log.Fatalf("检查合约代码失败: %v", err)
	}
	if len(code) == 0 {
		log.Fatal("合约地址不存在代码，请确认合约已部署且地址正确")
	}

	// 调用合约方法
	tx, err := instance.StoreFile(auth, user, filename, ipfsHash, description)
	if err != nil {
		return "", fmt.Errorf("failed to send transaction: %v", err)
	}

	// 返回交易哈希
	return tx.Hash().Hex(), nil
}

// 上传操作
func recordOperationuploadOnSBC(username, operationType, targetIdentifier, details string) (string, error) {
	//2.交互
	// 2.1. 连接 SBC Ganache
	client, err := ethclient.Dial(sbcGanacheURL)
	if err != nil {
		// 记录错误，但不一定需要中断主流程
		log.Printf("错误: 连接 SBC 区块链失败: %v", err)
	}
	defer client.Close()
	// 2.2. 加载 SBC 操作账户私钥
	privateKey, err := crypto.HexToECDSA(sbcPrivateKey)
	if err != nil {
		log.Printf("错误: 解析 SBC 私钥失败: %v", err)
	}

	// 2.3. 准备交易选项 (TransactOpts)
	chainID := big.NewInt(1337) // 使用 SBC 的 Chain ID
	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		log.Printf("错误: 创建 SBC 交易签名者失败: %v", err)
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
	}
	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)     // 交易不发送 ETH
	auth.GasLimit = uint64(300000) // 根据合约方法复杂度调整

	// 2.4. 加载 SBC 合约实例 (使用 abigen 生成的代码)
	contractAddress := common.HexToAddress(sbcContractAddress)
	instance, err := NewTemplate(contractAddress, client) // 使用生成的 New 函数
	if err != nil {
		log.Printf("错误: 加载 SBC 合约实例失败: %v", err)
	}

	// 5. 调用 SBC 合约方法 (recordOperation)
	log.Printf("正在调用 SBC 链上的 recordOperation: User=%s, Type=%s, Target=%s, Details=%s", username, operationType, targetIdentifier, details)
	tx, err := instance.RecordOperation(auth, username, operationType, targetIdentifier, details)
	if err != nil {
		// 记录详细错误，帮助调试
		log.Printf("错误: 发送 SBC 记录操作交易失败: User=%s, Type=%s, Target=%s, Error=%v",
			username, operationType, targetIdentifier, err)
	}

	// 6. 返回 SBC 交易哈希
	txHash := tx.Hash().Hex()
	log.Printf("成功发送交易到 SBC, 交易哈希: %s", txHash)
	return txHash, nil
}

// 保存 SBC 操作日志到数据库
func saveSBCOperationLog(db *sql.DB, userID int, sbcTxHash, operationType, targetIdentifier string) error {
	query := `
        INSERT INTO sbc_operation_log (user_id, sbc_tx_hash, operation_type, target_identifier)
        VALUES (?, ?, ?, ?)
    `
	// recorded_at 会使用数据库默认的 CURRENT_TIMESTAMP

	_, err := db.ExecContext(context.Background(), query, userID, sbcTxHash, operationType, targetIdentifier)
	if err != nil {
		// 可以检查具体的 MySQL 错误号，例如唯一键冲突 (1062)
		// if mysqlErr, ok := err.(*mysql.MySQLError); ok && mysqlErr.Number == 1062 {
		//     return fmt.Errorf("SBC 交易哈希 '%s' 已存在", sbcTxHash)
		// }
		return fmt.Errorf("插入 SBC 操作日志到数据库失败: %w", err)
	}
	return nil
}

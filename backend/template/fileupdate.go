package template

import (
	"context"
	"crypto/ecdsa"
	"database/sql"
	"fmt"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/gin-gonic/gin"
	"log"
	"math/big"
	"net/http"
	"strconv"
	"strings"
)

// --- 新增：用于绑定 PUT 请求体的结构体 ---
type UpdateArticlePayload struct {
	// 使用 binding:"required" 来确保这些字段在请求体中存在
	Title string `json:"title" binding:"required"`
	// 如果 points 可以为 0 但必须存在，可以使用指针 *int
	// 但前端传递的是数字，int 配合 binding:"required" 通常足够
	// 可以添加 gte=0 表示大于等于0
	Points   int    `json:"points" binding:"required,gte=0"`
	Summary  string `json:"summary" binding:"required"`
	Username string `json:"username" binding:"required"` // 新增 Username 字段
}

// --- 数据库 DSN ---
//const dsn = "root:123456@tcp(127.0.0.1:3307)/golan?parseTime=true"
const dsn = "block:bsPCcLmcwdcWGcWX@tcp(8.148.71.83:3306)/blockchain"
// --- 辅助函数：根据用户名获取用户 ID ---
func getUserIdByUsername(db *sql.DB, ctx context.Context, username string) (int, error) {
	var userId int
	query := "SELECT id FROM user WHERE username = ?"
	err := db.QueryRowContext(ctx, query, username).Scan(&userId)
	if err != nil {
		if err == sql.ErrNoRows {
			return 0, fmt.Errorf("未找到用户 '%s'", username)
		}
		return 0, fmt.Errorf("查询用户 %s 的 ID 失败: %w", username, err)
	}
	return userId, nil
}

// --- 辅助函数：在 SBC 上记录操作并写入数据库日志 ---
func recordAndLogOperation(
	ctx context.Context, // 使用 Gin 请求的 context
	db *sql.DB, // 数据库连接
	operationUsername string, // 执行操作的用户名
	operationType string, // 操作类型 ("DELETE" 或 "UPDATE")
	targetIdentifier string, // 目标标识符 (例如，文章 ID 字符串)
	details string, // 可选的区块链日志详情
) error {

	// 1. 获取用于数据库日志的用户 ID
	userId, err := getUserIdByUsername(db, ctx, operationUsername)
	if err != nil {
		// 在服务端记录错误，但可能不希望整个请求失败？
		// 或者返回错误以表明日志记录步骤失败。根据需求决定。
		fmt.Printf("获取用户 %s 的 ID 时出错: %v\n", operationUsername, err)
		// 在这里返回错误将导致主处理函数响应错误
		return fmt.Errorf("无法记录操作: %w", err)
	}

	// 2. 连接到以太坊节点
	client, err := ethclient.DialContext(ctx, sbcGanacheURL)
	if err != nil {
		return fmt.Errorf("连接到 SBC 节点失败: %w", err)
	}
	defer client.Close() // 确保最终关闭客户端连接

	// 3. 加载私钥并创建认证选项 (Auth Options)
	privateKey, err := crypto.HexToECDSA(sbcPrivateKey)
	if err != nil {
		return fmt.Errorf("加载私钥失败: %w", err)
	}

	publicKey := privateKey.Public()
	publicKeyECDSA, ok := publicKey.(*ecdsa.PublicKey)
	if !ok {
		return fmt.Errorf("公钥转换为 ECDSA 时出错")
	}
	fromAddress := crypto.PubkeyToAddress(*publicKeyECDSA)

	nonce, err := client.PendingNonceAt(ctx, fromAddress)
	if err != nil {
		return fmt.Errorf("获取 nonce 失败: %w", err)
	}

	gasPrice, err := client.SuggestGasPrice(ctx)
	if err != nil {
		return fmt.Errorf("建议 gas price 失败: %w", err)
	}

	chainID, err := client.ChainID(ctx)
	if err != nil {
		return fmt.Errorf("获取 chain ID 失败: %w", err)
	}

	// 使用 bind.NewKeyedTransactorWithChainID 以支持 EIP-155
	auth, err := bind.NewKeyedTransactorWithChainID(privateKey, chainID)
	if err != nil {
		return fmt.Errorf("创建 transactor 失败: %w", err)
	}
	auth.Nonce = big.NewInt(int64(nonce))
	auth.Value = big.NewInt(0)     // 对于非 payable 函数，值为 0 ETH
	auth.GasLimit = uint64(300000) // 根据需要调整 gas limit (可以估算)
	auth.GasPrice = gasPrice
	auth.Context = ctx // 传递 context 以支持取消操作

	// 4. 加载合约实例
	contractAddress := common.HexToAddress(sbcContractAddress)
	// 使用 NewTemplate (假设生成的代码在同一个包中)
	instance, err := NewTemplate(contractAddress, client)
	if err != nil {
		return fmt.Errorf("实例化合约失败: %w", err)
	}

	// 5. 调用智能合约的 recordOperation 函数
	fmt.Printf("尝试在 SBC 上记录操作: user=%s, type=%s, target=%s\n",
		operationUsername, operationType, targetIdentifier)

	tx, err := instance.RecordOperation(auth, operationUsername, operationType, targetIdentifier, details)
	if err != nil {
		// 检查特定错误，例如资金不足
		if strings.Contains(err.Error(), "insufficient funds") {
			return fmt.Errorf("SBC 交易失败: gas 不足: %w", err)
		}
		return fmt.Errorf("SBC 交易提交失败: %w", err)
	}

	txHash := tx.Hash().Hex()
	fmt.Printf("SBC 交易已提交: %s\n", txHash)

	// 6. 将记录插入到你的 SQL 数据库的 `sbc_operation_log` 表中
	logQuery := `
		INSERT INTO sbc_operation_log (user_id, sbc_tx_hash, operation_type, target_identifier)
		VALUES (?, ?, ?, ?)
	`
	_, err = db.ExecContext(ctx, logQuery, userId, txHash, operationType, targetIdentifier)
	if err != nil {
		// 记录这个严重错误！操作已在链上发生，但链下日志未记录成功。
		fmt.Printf("严重错误: 成功发送 TX (%s) 后，将 SBC 日志插入数据库失败: %v\n", txHash, err)
		// 决定这是否应导致 API 请求失败。
		// 返回主操作成功但突出显示此错误可能更好。
		return fmt.Errorf("操作完成，但记录到数据库失败: %w", err)
	}

	fmt.Printf("成功将操作记录到数据库: user_id=%d, tx=%s\n", userId, txHash)
	return nil // 成功
}

func FileUpdate(c *gin.Context) { // Encapsulate in a handler function
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("pageSize", "10")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize < 1 {
		pageSize = 10
	}
	// --- End Pagination Params ---

	// --- Filter Parameter (Username) ---
	filterUsername := c.Query("username") // 从查询参数获取 username
	// --- End Filter Parameter ---
	// --- 验证 username 是否存在 ---
	if filterUsername == "" {
		log.Println("警告: FileUpdate 请求缺少 'username' 查询参数")
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少用户信息"})
		return
	}
	// 连接数据库
	//dsn := "root:123456@tcp(127.0.0.1:3307)/golan?parseTime=true" // Added parseTime=true for time.Time scanning
	dsn := "block:bsPCcLmcwdcWGcWX@tcp(8.148.71.83:3306)/blockchain"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		fmt.Println("数据库连接失败:", err) // Log error server-side
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库连接失败"})
		return
	}
	defer db.Close()

	// Ping DB to ensure connection is valid
	if err := db.Ping(); err != nil {
		fmt.Println("数据库 Ping 失败:", err) // Log error server-side
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库连接失败"})
		return
	}

	// 计算 LIMIT 和 OFFSET
	offset := (page - 1) * pageSize

	// --- MODIFIED QUERY: Added WHERE clause ---
	// 查询当前页的文章并连接用户表获取用户名, 并根据用户名过滤
	query := `
		SELECT m.message_id, m.message_name, u.username, m.date, m.summary, m.points
		FROM message m
		INNER JOIN user u ON m.user_id = u.id
		WHERE u.username = ?  -- Added WHERE clause
		ORDER BY m.message_id DESC -- Optional: Add ordering for consistent pagination
		LIMIT ? OFFSET ?
	`
	// --- Pass the username filter value as the first parameter ---
	rows, err := db.Query(query, filterUsername, pageSize, offset)
	if err != nil {
		fmt.Println("数据库查询失败:", err) // Log error server-side
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询失败"})
		return
	}
	defer rows.Close()

	var articles []Article
	for rows.Next() {
		var article Article
		// Ensure scan types match DB column types and Article struct types
		// If m.date is DATETIME or TIMESTAMP, use *sql.NullTime or time.Time
		err := rows.Scan(&article.ID, &article.Title, &article.Author, &article.Date, &article.Summary, &article.Points)
		if err != nil {
			fmt.Println("数据扫描失败:", err) // Log error server-side
			c.JSON(http.StatusInternalServerError, gin.H{"error": "数据扫描失败"})
			return
		}
		articles = append(articles, article)
	}

	if err := rows.Err(); err != nil {
		fmt.Println("遍历数据失败:", err) // Log error server-side
		c.JSON(http.StatusInternalServerError, gin.H{"error": "遍历数据失败"})
		return
	}
	// 打印查询到的文章数据
	// fmt.Println("查询到的文章数据：", articles) // Usually avoid logging full data in production

	// --- MODIFIED TOTAL COUNT QUERY: Added JOIN and WHERE clause ---
	// 查询符合条件的总记录数
	var totalCount int
	countQuery := `
		SELECT COUNT(*)
		FROM message m
		INNER JOIN user u ON m.user_id = u.id
		WHERE u.username = ? -- Added WHERE clause
	`
	// --- Pass the username filter value ---
	err = db.QueryRow(countQuery, filterUsername).Scan(&totalCount)
	if err != nil {
		fmt.Println("获取总记录数失败:", err) // Log error server-side
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取总记录数失败"})
		return
	}
	// fmt.Printf("Response: %+v\n", PagedResponse{ // Avoid logging full data in production
	// 	TotalCount: totalCount,
	// 	Data:       articles,
	// })

	// 返回 JSON 响应
	c.JSON(http.StatusOK, PagedResponse{
		TotalCount: totalCount,
		Data:       articles,
	})
}

func DeleteArticleHandler(c *gin.Context) { // 处理 DELETE /fileupdate/:articleId 请求

	// 1. 从 URL 路径参数中提取 articleId
	articleIdStr := c.Param("articleId")
	articleId, err := strconv.Atoi(articleIdStr)
	if err != nil {
		// 如果 ID 不是有效的整数
		fmt.Println("无效的文章 ID 格式:", articleIdStr, err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的文章 ID 格式"})
		return
	}

	operationUsername := c.Query("username")

	// 2. 连接数据库
	//dsn := "root:123456@tcp(127.0.0.1:3307)/golan?parseTime=true"
	dsn := "block:bsPCcLmcwdcWGcWX@tcp(8.148.71.83:3306)/blockchain"
	db, err := sql.Open("mysql", dsn) // 使用相同的 dsn
	if err != nil {
		fmt.Println("数据库连接失败:", err)                                      // 服务端记录日志
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库操作失败"}) // 给客户端的通用错误信息
		return
	}
	defer db.Close()

	// 可选: Ping 数据库确保连接可用
	if err := db.PingContext(c.Request.Context()); err != nil {
		fmt.Println("数据库 Ping 失败:", err)                                  // 服务端记录日志
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库操作失败"}) // 给客户端的通用错误信息
		return
	}

	// 3. 准备 DELETE SQL 语句
	// 假设你的表是 'message'，主键是 'message_id'
	query := "DELETE FROM message WHERE message_id = ?"

	// 4. 执行 DELETE 语句
	// 使用 ExecContext 以便更好地处理上下文 (例如请求取消)
	result, err := db.ExecContext(c.Request.Context(), query, articleId)
	if err != nil {
		fmt.Println("数据库删除操作失败:", err)                                    // 服务端记录日志
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除文章时出错"}) // 给客户端的通用错误信息
		return
	}

	// 5. 检查是否有行受到影响 (即是否真的删除了数据)
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		// 这个错误不太常见，但也可能发生
		fmt.Println("检查受影响行数时出错:", err)                                    // 服务端记录日志
		c.JSON(http.StatusInternalServerError, gin.H{"error": "删除文章状态未知"}) // 给客户端的通用错误信息
		return
	}

	if rowsAffected == 0 {
		// 如果没有行被删除，很可能是因为提供的 ID 不存在
		fmt.Println("未找到要删除的文章，ID:", articleId)                  // 服务端记录日志
		c.JSON(http.StatusNotFound, gin.H{"error": "未找到要删除的文章"}) // 返回 404 Not Found
		return
	}

	// --- 5. 在 SBC 上记录操作并写入数据库日志 ---
	fmt.Println("文章已从数据库删除，尝试记录到 SBC...")
	// 将 Gin 请求的 context 传递给辅助函数
	loggingErr := recordAndLogOperation(
		c.Request.Context(), // 传递 context
		db,                  // 传递数据库连接 (确保此时还未关闭)
		operationUsername,   // 传递识别出的用户名
		"DELETE",            // 操作类型
		articleIdStr,        // 目标标识符 (文章 ID 字符串)
		fmt.Sprintf("删除了文章 ID: %d", articleId), // 可选详情
	)

	if loggingErr != nil {
		// 记录错误，但可能仍为 DELETE 操作本身返回成功
		fmt.Printf("错误: 文章 %d 删除成功，但日志记录失败: %v\n", articleId, loggingErr)
		// 返回特定错误或带警告的成功消息
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "文章删除成功，但操作记录失败",
			"error":   loggingErr.Error(), // 可以选择性地暴露错误信息
		})
		return
	}
}

// --- 新增: 处理更新文章的 Handler ---// 处理 PUT /fileupdate/:articleId 请求
func UpdateArticleHandler(c *gin.Context) {

	// 1. 从 URL 路径参数中提取 articleId
	articleIdStr := c.Param("articleId")
	articleId, err := strconv.Atoi(articleIdStr)
	if err != nil {
		fmt.Println("无效的文章 ID 格式:", articleIdStr, err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的文章 ID 格式"})
		return
	}

	// 2. 绑定并验证请求体 JSON 数据
	var payload UpdateArticlePayload
	// ShouldBindJSON 会解析 JSON 并根据 struct tag (binding:"required") 进行验证
	if err := c.ShouldBindJSON(&payload); err != nil {
		fmt.Println("请求体绑定或验证失败:", err) // 服务端记录详细错误
		// 向客户端返回具体的验证错误信息通常更有帮助
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求数据无效: " + err.Error()})
		return
	}
	operationUsername := payload.Username
	// 3. 连接数据库
	//dsn := "root:123456@tcp(127.0.0.1:3307)/golan?parseTime=true"
	dsn := "block:bsPCcLmcwdcWGcWX@tcp(8.148.71.83:3306)/blockchain"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		fmt.Println("数据库连接失败:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库操作失败"})
		return
	}
	defer db.Close()

	// 可选: Ping 数据库
	if err := db.PingContext(c.Request.Context()); err != nil {
		fmt.Println("数据库 Ping 失败:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库操作失败"})
		return
	}

	// 4. 准备 UPDATE SQL 语句
	// 确保字段名 (message_name, points, summary, message_id) 与你的数据库表结构匹配
	query := `
		UPDATE message
		SET message_name = ?, points = ?, summary = ?
		WHERE message_id = ?
	`

	// 5. 执行 UPDATE 语句
	result, err := db.ExecContext(c.Request.Context(), query, payload.Title, payload.Points, payload.Summary, articleId)
	if err != nil {
		fmt.Println("数据库更新操作失败:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新文章时出错"})
		return
	}

	// 6. 检查是否有行受到影响
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		fmt.Println("检查更新影响行数时出错:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "更新文章状态未知"})
		return
	}

	if rowsAffected == 0 {
		// 如果没有行被更新，说明提供的 articleId 可能不存在
		fmt.Println("未找到要更新的文章，ID:", articleId)
		c.JSON(http.StatusNotFound, gin.H{"error": "未找到要更新的文章"}) // 返回 404 Not Found
		return
	}
	// --- 6. 在 SBC 上记录操作并写入数据库日志 ---
	fmt.Println("文章已在数据库更新，尝试记录到 SBC...")
	loggingErr := recordAndLogOperation(
		c.Request.Context(), // 传递 context
		db,                  // 传递数据库连接
		operationUsername,   // 传递识别出的用户名
		"UPDATE",            // 操作类型
		articleIdStr,        // 目标标识符 (文章 ID 字符串)
		fmt.Sprintf("更新了文章 ID: %d, 新标题: %s", articleId, payload.Title), // 可选详情
	)

	if loggingErr != nil {
		fmt.Printf("错误: 文章 %d 更新成功，但日志记录失败: %v\n", articleId, loggingErr)
		c.JSON(http.StatusInternalServerError, gin.H{
			"message": "文章更新成功，但操作记录失败",
			"error":   loggingErr.Error(), // 可以选择性地暴露错误信息
		})
		return
	}
	// 7. 返回成功响应
	fmt.Println("成功更新文章，ID:", articleId)
	c.JSON(http.StatusOK, gin.H{"message": "文章更新成功"}) // 返回 200 OK
}

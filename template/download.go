package template

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"fmt"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/gin-gonic/gin"
	shell "github.com/ipfs/go-ipfs-api"
	"io"
	"io/ioutil"
	"net/http"
	"strings"
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
func DownloadFile(c *gin.Context) {
	id := c.DefaultQuery("id", "0")
	fmt.Println(id)
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
    SELECT m.hash
    FROM message m
    WHERE m.message_id = ?  
`
	var hash string
	err = db.QueryRow(query, id).Scan(&hash) // yourID 是你要查询的ID参数
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
	ipfsHash := decoded[2].(string)
	fmt.Println(ipfsHash)
	sh := shell.NewShell("localhost:5001") // IPFS API 默认端口
	data2, err := sh.Cat(ipfsHash)         // 返回 io.ReadCloser
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

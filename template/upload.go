package template

import (
	"bytes"
	"context"
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
	sbcContractAddress = "0x...SBC合约地址"

	//IBC
	ibcGanacheURL      = "http://localhost:7546" // 假设IBC使用不同端口
	ibcPrivateKey      = "7acc49c100e782cd7f2ed18174cb131d94d42182a6d5751c85710520b8899931"
	ibcContractAddress = "0x...IBC合约地址"
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

//积分增减

//

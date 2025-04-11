package template

import (
	"database/sql"
	"fmt"
	"github.com/gin-gonic/gin"
	"log"
	"net/http"
	"time"
)

type UploadRequest struct {
	Username    string    `json:"user"`
	Filename    string    `json:"filename"`
	UploadDate  time.Time `json:"uploadDate"`
	IPFSHash    string    `json:"ipfsHash"`
	Description string    `json:"description"`
	TxHash      string    `json:"txHash"`
}

func Db(c *gin.Context) {
	var req UploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 打印接收到的数据
	log.Printf("Received upload request: %+v", req)

	dsn := "root:123456@tcp(127.0.0.1:3307)/golan"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		c.JSON(http.StatusInternalServerError, RegisterResponse{Success: false, Error: "数据库连接失败"})
		return
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		c.JSON(http.StatusInternalServerError, RegisterResponse{Success: false, Error: "数据库连接失败"})
		return
	}
	fmt.Println("Successfully connected to MySQL!")
	_, err = db.Exec("INSERT INTO message (user_id, message_name, date,hash,summary) VALUES (?,?,?, ?, ?)", req.Username, req.Filename, req.UploadDate, req.TxHash, req.Description)
	if err != nil {
		fmt.Println("数据库写入错误:", err)
		c.JSON(http.StatusInternalServerError, RegisterResponse{Success: false, Error: "注册失败，数据库写入错误"})
		return
	}
	// 假设注册成功
	c.JSON(http.StatusOK, RegisterResponse{Success: true, Message: "注册成功"})
}

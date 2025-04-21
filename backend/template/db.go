package template

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type UploadRequest struct {
	Username    string    `json:"user"`
	Filename    string    `json:"filename"`
	UploadDate  time.Time `json:"uploadDate"`
	IPFSHash    string    `json:"ipfsHash"`
	Description string    `json:"description"`
	TxHash      string    `json:"txHash"`
	Points      int       `json:"points"`
	FileType    string    `json:"fileType"`
}

func Db(c *gin.Context) {
	var req UploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 打印接收到的数据
	log.Printf("Received upload request: %+v", req)

	//dsn := "root:123456@tcp(127.0.0.1:3307)/golan"
	dsn := "block:bsPCcLmcwdcWGcWX@tcp(8.148.71.83:3306)/blockchain"
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
	fmt.Println(req)

	var userID int
	err = db.QueryRow("SELECT id FROM user WHERE username = ?", req.Username).Scan(&userID)
	if err != nil {
		if err == sql.ErrNoRows {
			fmt.Println("用户不存在:", req.Username)
			c.JSON(http.StatusBadRequest, RegisterResponse{Success: false, Error: "用户不存在"})
		} else {
			fmt.Println("查询用户ID错误:", err)
			c.JSON(http.StatusInternalServerError, RegisterResponse{Success: false, Error: "查询用户信息失败"})
		}
		return
	}

	fmt.Printf("找到用户ID: %d 对应用户名: %s\n", userID, req.Username)

	_, err = db.Exec("INSERT INTO message (user_id, message_name, date,hash,summary,points,filetype) VALUES (?,?,?, ?,?, ?,?)", userID, req.Filename, req.UploadDate, req.TxHash, req.Description, req.Points, req.FileType)
	if err != nil {
		fmt.Println("数据库写入错误:", err)
		c.JSON(http.StatusInternalServerError, RegisterResponse{Success: false, Error: "注册失败，数据库写入错误"})
		return
	}
	// 假设注册成功
	c.JSON(http.StatusOK, RegisterResponse{Success: true, Message: "注册成功"})
}

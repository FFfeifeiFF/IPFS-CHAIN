package template

import (
	"database/sql"
	"fmt"
	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"golang.org/x/crypto/bcrypt"
	"net/http"
)

// 定义接收前端数据的结构体
type RegisterRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

// 定义返回前端数据的结构体
type RegisterResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

// 注册后端
func RegisterHandler(c *gin.Context) {
	if c.Request.Method != http.MethodPost {
		c.JSON(http.StatusMethodNotAllowed, RegisterResponse{Success: false, Error: "方法不允许"})
		return
	}

	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, RegisterResponse{Success: false, Error: "请求体解析失败"})
		return
	}

	// 在这里连接数据库，进行用户名、邮箱是否已存在的验证
	// 并将用户信息插入数据库
	//dsn := "root:123456@tcp(127.0.0.1:3307)/golan"
	dsn := "block:bsPCcLmcwdcWGcWX@tcp(8.148.71.83:3306)/blockchain"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		c.JSON(http.StatusInternalServerError, RegisterResponse{Success: false, Error: "数据库连接失败"})
		return
	}
	defer db.Close()

	// if err := db.Ping(); err != nil {
	if err := db.Ping(); err != nil {
		c.JSON(http.StatusInternalServerError, RegisterResponse{Success: false, Error: "数据库连接失败"})
		return
	}
	fmt.Println("Successfully connected to MySQL!")

	//开始验证
	var count int
	//验证用户名唯一
	err = db.QueryRow("SELECT COUNT(*) FROM user WHERE username = ?", req.Username).Scan(&count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, RegisterResponse{Success: false, Error: "数据库查询错误"})
		return
	}
	if count > 0 {
		c.JSON(http.StatusBadRequest, RegisterResponse{Success: false, Error: "用户名已存在"})
		return
	}
	//验证邮箱唯一
	err = db.QueryRow("SELECT COUNT(*) FROM user WHERE emile = ?", req.Email).Scan(&count)
	if err != nil {
		c.JSON(http.StatusInternalServerError, RegisterResponse{Success: false, Error: "数据库查询错误"})
		return
	}
	if count > 0 {
		c.JSON(http.StatusBadRequest, RegisterResponse{Success: false, Error: "邮箱已被注册"})
		return
	}

	//插入
	hashedPassword, err := hashPassword(req.Password) // 密码哈希处理（见下方函数）
	if err != nil {
		c.JSON(http.StatusInternalServerError, RegisterResponse{Success: false, Error: "密码处理失败"})
		return
	}

	_, err = db.Exec("INSERT INTO user (username, emile, password) VALUES (?, ?, ?)", req.Username, req.Email, hashedPassword)
	if err != nil {
		fmt.Println("数据库写入错误:", err)
		c.JSON(http.StatusInternalServerError, RegisterResponse{Success: false, Error: "注册失败，数据库写入错误"})
		return
	}
	// 假设注册成功
	c.JSON(http.StatusOK, RegisterResponse{Success: true, Message: "注册成功"})
}
func hashPassword(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hashedPassword), nil
}


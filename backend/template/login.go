package template

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// 定义前端接受前端数据的结构体
type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// 定义后端发送数据的结构体
type LoginResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Error   string `json:"error,omitempty"`
}

func LoginHandler(c *gin.Context) {
	if c.Request.Method != http.MethodPost {
		c.JSON(http.StatusMethodNotAllowed, RegisterResponse{Success: false, Error: "方法不允许"})
		return
	}

	var req RegisterRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, RegisterResponse{Success: false, Error: "请求体解析失败"})
		return
	}

	//dsn := "root:123456@tcp(127.0.0.1:3307)/golan"
	dsn := "block:bsPCcLmcwdcWGcWX@tcp(8.148.71.83:3306)/blockchain"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		c.JSON(http.StatusInternalServerError, RegisterResponse{Success: false, Error: "数据库连接失败"})
		return
	}
	defer db.Close()

	fmt.Println("Successfully connected to MySQL!")
	fmt.Println(req.Username)
	var storedHashedPassword string
	err = db.QueryRow("SELECT password FROM user WHERE username = ?", req.Username).Scan(&storedHashedPassword)
	if err != nil {
		if err == sql.ErrNoRows {
			c.JSON(http.StatusBadRequest, LoginResponse{Success: false, Error: "用户名不存在"})
			return
		}
		c.JSON(http.StatusInternalServerError, LoginResponse{Success: false, Error: "数据库查询错误"})
		return
	}

	// 验证密码
	err = bcrypt.CompareHashAndPassword([]byte(storedHashedPassword), []byte(req.Password))
	if err != nil {
		c.JSON(http.StatusBadRequest, LoginResponse{Success: false, Error: "密码不正确"})
		return
	}
	// 登录成功
	c.JSON(http.StatusOK, LoginResponse{Success: true, Message: "登录成功"})
}

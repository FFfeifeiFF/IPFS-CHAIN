package template

import (
	"database/sql"
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time" // 用于 JWT 过期

	// 引入 CORS 中间件
	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql" // MySQL 驱动
	"github.com/golang-jwt/jwt/v5"     // JWT 库
	"golang.org/x/crypto/bcrypt"       // 密码哈希库
)

// --- 全局变量 ---
var db *sql.DB                                                // 数据库连接池
var jwtSecretKey = []byte("your_very_secret_key_change_this") // !!危险!! 仅供演示，应来自环境变量

// --- 结构体定义 ---

// 用于绑定 PUT 请求的 JSON Body
type UpdateProfileRequest struct {
	Username        string `json:"username"`                           // 允许为空，表示不更改
	NewUsername     string `json:"newUsername"`                        // 允许为空，表示不更改
	NewEmail        string `json:"newEmail"`                           // 允许为空，表示不更改
	CurrentPassword string `json:"currentPassword" binding:"required"` // 当前密码必须提供
	NewPassword     string `json:"newPassword"`                        // 允许为空，表示不更改
}

// JWT Claims 结构
type Claims struct {
	Username string `json:"username"`
	jwt.RegisteredClaims
}

// --- 初始化 ---
func initDB() {
	var err error
	// 从环境变量或配置读取更安全
	// dsn := os.Getenv("DB_DSN")
	dsn := "root:123456@tcp(127.0.0.1:3307)/golan?charset=utf8mb4&parseTime=True&loc=Local"
	db, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}

	// 设置数据库连接池参数
	db.SetConnMaxLifetime(time.Minute * 3)
	db.SetMaxOpenConns(10)
	db.SetMaxIdleConns(10)

	// 尝试 Ping 数据库确保连接成功
	err = db.Ping()
	if err != nil {
		log.Fatalf("无法连接到数据库: %v", err)
	}
	log.Println("数据库连接成功！")
}

// --- 中间件 ---

// AuthMiddleware 验证 JWT Token
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "缺少认证 Header"})
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if !(len(parts) == 2 && parts[0] == "Bearer") {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "认证 Header 格式错误"})
			return
		}

		tokenString := parts[1]
		claims := &Claims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			// 确保使用的是预期的签名算法
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
				return nil, fmt.Errorf("非预期的签名方法: %v", token.Header["alg"])
			}
			return jwtSecretKey, nil
		})

		if err != nil {
			if errors.Is(err, jwt.ErrTokenExpired) {
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token 已过期"})
			} else {
				log.Printf("Token 解析错误: %v", err)
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "无效的 Token"})
			}
			return
		}

		if !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "无效的 Token"})
			return
		}

		// 将验证通过的用户名存入 Context，方便后续 Handler 使用
		c.Set("username", claims.Username)
		c.Next() // 继续处理请求
	}
}

// --- 路由处理函数 ---

// getProfileHandler 处理 GET /changeprofile?username=xxx
func GetProfileHandler(c *gin.Context) {
	initDB()
	targetUsername := c.Query("username")
	fmt.Println(targetUsername,111)
	fmt.Println(targetUsername)
	if targetUsername == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "缺少 username 查询参数"})
		return
	}

	var email string
	query := "SELECT emile FROM user WHERE username = ?"
	err := db.QueryRowContext(c.Request.Context(), query, targetUsername).Scan(&email)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": fmt.Sprintf("用户 '%s' 不存在", targetUsername)})
		} else {
			log.Printf("数据库查询错误 (getProfileHandler): %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户信息时出错"})
		}
		return
	}

	// 返回从数据库获取的用户名和邮箱
	c.JSON(http.StatusOK, gin.H{
		"username": targetUsername,
		"email":    email,
	})
}

// updateProfileHandler 处理 PUT /changeprofile
func UpdateProfileHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req UpdateProfileRequest
		// 绑定请求体 JSON 到结构体
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": fmt.Sprintf("请求体解析失败: %v", err)})
			return
		}
		// 从中间件获取当前登录的用户名
		currentUsername := req.Username

		if currentUsername == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少用户名"})
			return
		}

		// --- 1. 验证当前密码 ---
		var currentPasswordHash, currentEmail string
		query := "SELECT password, emile FROM user WHERE username = ?"
		err := db.QueryRowContext(c.Request.Context(), query, currentUsername).Scan(&currentPasswordHash, &currentEmail)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				c.JSON(http.StatusNotFound, gin.H{"error": "当前用户不存在"}) // 理论上不应发生，因为 JWT 验证了
			} else {
				log.Printf("数据库查询错误 (updateProfileHandler - get hash): %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "验证用户时出错"})
			}
			return
		}

		// 比较哈希密码和提供的当前密码
		err = bcrypt.CompareHashAndPassword([]byte(currentPasswordHash), []byte(req.CurrentPassword))
		if err != nil {
			// 如果 err 是 bcrypt.ErrMismatchedHashAndPassword，说明密码不匹配
			if errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "当前密码不正确"})
			} else {
				// 其他 bcrypt 错误
				log.Printf("密码比较时出错: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "密码验证时发生内部错误"})
			}
			return
		}

		// --- 2. 准备更新字段和参数 ---
		updateFields := []string{}    // 要更新的数据库字段
		updateArgs := []interface{}{} // 对应字段的值
		responseUpdate := gin.H{}     // 用于构建成功响应的消息体

		// 检查是否需要更新用户名
		if req.NewUsername != "" && req.NewUsername != currentUsername {
			// 检查新用户名是否已被占用
			var existsCount int
			checkQuery := "SELECT COUNT(*) FROM user WHERE username = ? AND username != ?"
			err = db.QueryRowContext(c.Request.Context(), checkQuery, req.NewUsername, currentUsername).Scan(&existsCount)
			if err != nil {
				log.Printf("数据库查询错误 (updateProfileHandler - check username): %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "检查用户名可用性时出错"})
				return
			}
			if existsCount > 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "新的用户名已被占用"})
				return
			}
			updateFields = append(updateFields, "username = ?")
			updateArgs = append(updateArgs, req.NewUsername)
			responseUpdate["newUsername"] = req.NewUsername // 添加到成功响应中
		}

		// 检查是否需要更新邮箱
		if req.NewEmail != "" && req.NewEmail != currentEmail {
			// (可选但推荐) 在这里添加邮箱格式验证
			// if !isValidEmail(req.NewEmail) {
			//  c.JSON(http.StatusBadRequest, gin.H{"error": "新邮箱格式无效"})
			//  return
			// }

			// 检查新邮箱是否已被占用
			var existsCount int
			checkQuery := "SELECT COUNT(*) FROM user WHERE emile = ? AND username != ?" // 排除自己
			err = db.QueryRowContext(c.Request.Context(), checkQuery, req.NewEmail, currentUsername).Scan(&existsCount)
			if err != nil {
				log.Printf("数据库查询错误 (updateProfileHandler - check email): %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "检查邮箱可用性时出错"})
				return
			}
			if existsCount > 0 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "新的邮箱已被占用"})
				return
			}
			updateFields = append(updateFields, "emile = ?")
			updateArgs = append(updateArgs, req.NewEmail)
			responseUpdate["newEmail"] = req.NewEmail // 添加到成功响应中
		}

		// 检查是否需要更新密码
		if req.NewPassword != "" {
			// (可选但推荐) 在这里添加密码复杂度验证，例如长度
			if len(req.NewPassword) < 6 {
				c.JSON(http.StatusBadRequest, gin.H{"error": "新密码长度不能少于6位"})
				return
			}
			// 哈希新密码
			newPasswordHash, err := bcrypt.GenerateFromPassword([]byte(req.NewPassword), bcrypt.DefaultCost)
			if err != nil {
				log.Printf("密码哈希失败: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "处理新密码时出错"})
				return
			}
			updateFields = append(updateFields, "password = ?")
			updateArgs = append(updateArgs, string(newPasswordHash))
			// 不在响应中返回新密码
		}

		// --- 3. 执行更新 ---
		if len(updateFields) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "没有提供任何需要更改的信息"})
			return
		}

		// 构建最终的 UPDATE 语句
		updateQuery := fmt.Sprintf("UPDATE user SET %s WHERE username = ?", strings.Join(updateFields, ", "))
		updateArgs = append(updateArgs, currentUsername) // 添加 WHERE 条件的值

		// 执行更新
		result, err := db.ExecContext(c.Request.Context(), updateQuery, updateArgs...)
		if err != nil {
			log.Printf("数据库更新错误 (updateProfileHandler): %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "更新用户信息失败"})
			return
		}

		rowsAffected, err := result.RowsAffected()
		if err != nil {
			log.Printf("获取影响行数错误: %v", err)
			// 即使这里出错，更新可能已经成功，所以还是返回成功，但记录日志
		}

		if rowsAffected == 0 {
			// 可能是并发问题或者 WHERE 条件没匹配上（理论上不应该）
			log.Printf("警告: 更新操作影响了 0 行，用户: %s", currentUsername)
			// 可以选择返回错误或警告
			// c.JSON(http.StatusInternalServerError, gin.H{"error": "更新操作未影响任何记录"})
			// return
		}

		// --- 4. 返回成功响应 ---
		// 如果用户名被更改，需要生成新的 JWT 吗？取决于你的认证策略
		// 如果需要，在这里重新生成包含新用户名的 token 并返回

		successMessage := "个人资料更新成功！"
		responseUpdate["message"] = successMessage // 添加通用成功消息
		c.JSON(http.StatusOK, responseUpdate)
	}
}

package template

import (
	"database/sql"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql" // 确保你的 MySQL 驱动已导入
)

// UserProfileResponse 定义了返回给前端的用户资料结构
type UserProfileResponse struct {
	Username string `json:"username"`
	Points   int    `json:"points"`
	// 可以根据需要添加其他字段，例如 Level, Avatar 等
	// Level string `json:"level,omitempty"`
}

// GetUserProfileHandler 创建一个 Gin 处理函数，用于获取用户资料
// 它接收一个数据库连接池 (*sql.DB) 作为依赖
func GetUserProfileHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 从查询参数中获取用户名
		username := c.Query("username") // 获取 ?username=... 的值

		// 2. 验证用户名是否为空
		if username == "" {
			log.Println("获取用户资料请求失败：缺少用户名参数")
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少用户名参数"})
			return // 提前返回
		}

		log.Printf("收到获取用户 '%s' 资料的请求", username)

		// 3. 准备 SQL 查询语句
		// 选择你需要在前端显示的字段，这里至少需要 points
		query := "SELECT username, points FROM user WHERE username = ?"

		// 4. 执行数据库查询
		var userProfile UserProfileResponse // 用于存储查询结果
		// 使用 QueryRowContext，如果请求被取消，它可以取消数据库查询
		err := db.QueryRowContext(c.Request.Context(), query, username).Scan(
			&userProfile.Username,
			&userProfile.Points,
		)

		// 5. 处理查询结果和错误
		if err != nil {
			// 5.1. 检查是否是因为用户不存在导致的错误
			if err == sql.ErrNoRows {
				log.Printf("用户 '%s' 未在数据库中找到", username)
				c.JSON(http.StatusNotFound, gin.H{"error": "用户未找到"})
			} else {
				// 5.2. 其他数据库查询错误
				log.Printf("查询用户 '%s' 资料时数据库出错: %v", username, err)
				// 不向客户端暴露详细的数据库错误
				c.JSON(http.StatusInternalServerError, gin.H{"error": "查询用户资料失败"})
			}
			return // 发生错误后返回
		}

		// 6. 查询成功，返回用户信息
		log.Printf("成功获取用户 '%s' 的资料: Points=%d", userProfile.Username, userProfile.Points)
		c.JSON(http.StatusOK, userProfile) // 返回 200 OK 和用户资料 JSON
	}
}

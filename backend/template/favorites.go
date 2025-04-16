package template

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// 收藏相关结构体
type Favorite struct {
	ID        int64  `json:"id"`
	UserID    int    `json:"userId"`
	ArticleID int    `json:"articleId"`
	CreatedAt string `json:"createdAt"`
}

// 收藏文章的返回结构
type FavoriteArticle struct {
	ID      int    `json:"id"`
	Title   string `json:"title"`
	Author  string `json:"author"`
	Date    string `json:"date"`
	Summary string `json:"summary"`
	Points  int    `json:"points"`
}

// AddFavoriteHandler 添加收藏
func AddFavoriteHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取请求体参数
		var request struct {
			Username  string `json:"username"`
			ArticleID int    `json:"articleId"`
		}

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求数据"})
			return
		}

		// 查询用户ID
		var userID int
		err := db.QueryRow("SELECT id FROM user WHERE username = ?", request.Username).Scan(&userID)
		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
			} else {
				log.Printf("查询用户ID错误: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询失败"})
			}
			return
		}

		// 检查文章是否存在
		var articleExists bool
		err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM message WHERE message_id = ?)", request.ArticleID).Scan(&articleExists)
		if err != nil {
			log.Printf("检查文章存在性错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询失败"})
			return
		}

		if !articleExists {
			c.JSON(http.StatusNotFound, gin.H{"error": "文章不存在"})
			return
		}

		// 检查是否已经收藏
		var favoriteExists bool
		err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM favorites WHERE user_id = ? AND article_id = ?)", userID, request.ArticleID).Scan(&favoriteExists)
		if err != nil {
			log.Printf("检查收藏存在性错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询失败"})
			return
		}

		if favoriteExists {
			c.JSON(http.StatusConflict, gin.H{"error": "已收藏该文章", "alreadyFavorited": true})
			return
		}

		// 添加收藏记录
		result, err := db.Exec("INSERT INTO favorites (user_id, article_id) VALUES (?, ?)", userID, request.ArticleID)
		if err != nil {
			log.Printf("添加收藏错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "添加收藏失败"})
			return
		}

		// 获取新增记录ID
		favoriteID, _ := result.LastInsertId()

		c.JSON(http.StatusOK, gin.H{
			"message":     "收藏成功",
			"id":          favoriteID,
			"userId":      userID,
			"articleId":   request.ArticleID,
			"isFavorited": true,
		})
	}
}

// RemoveFavoriteHandler 取消收藏
func RemoveFavoriteHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取请求体参数
		var request struct {
			Username  string `json:"username"`
			ArticleID int    `json:"articleId"`
		}

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求数据"})
			return
		}

		// 查询用户ID
		var userID int
		err := db.QueryRow("SELECT id FROM user WHERE username = ?", request.Username).Scan(&userID)
		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
			} else {
				log.Printf("查询用户ID错误: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询失败"})
			}
			return
		}

		// 删除收藏记录
		result, err := db.Exec("DELETE FROM favorites WHERE user_id = ? AND article_id = ?", userID, request.ArticleID)
		if err != nil {
			log.Printf("删除收藏错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "取消收藏失败"})
			return
		}

		// 检查是否真的删除了记录
		rowsAffected, _ := result.RowsAffected()
		if rowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "未找到收藏记录"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"message":     "取消收藏成功",
			"isFavorited": false,
		})
	}
}

// CheckFavoriteHandler 检查是否已收藏
func CheckFavoriteHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		username := c.Query("username")
		articleIDStr := c.Query("articleId")

		if username == "" || articleIDStr == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少用户名或文章ID"})
			return
		}

		// 转换文章ID为整数
		articleID, err := strconv.Atoi(articleIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的文章ID"})
			return
		}

		// 查询用户ID
		var userID int
		err = db.QueryRow("SELECT id FROM user WHERE username = ?", username).Scan(&userID)
		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
			} else {
				log.Printf("查询用户ID错误: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询失败"})
			}
			return
		}

		// 检查是否已经收藏
		var favoriteExists bool
		err = db.QueryRow("SELECT EXISTS(SELECT 1 FROM favorites WHERE user_id = ? AND article_id = ?)", userID, articleID).Scan(&favoriteExists)
		if err != nil {
			log.Printf("检查收藏存在性错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"isFavorited": favoriteExists,
		})
	}
}

// GetUserFavoritesHandler 获取用户收藏列表
func GetUserFavoritesHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		username := c.Query("username")
		if username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少用户名参数"})
			return
		}

		// 查询用户ID
		var userID int
		err := db.QueryRow("SELECT id FROM user WHERE username = ?", username).Scan(&userID)
		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
			} else {
				log.Printf("查询用户ID错误: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询失败"})
			}
			return
		}

		// 查询用户收藏的文章列表
		query := `
			SELECT f.id, m.message_id, m.message_name, u.username, m.date, m.summary, m.points
			FROM favorites f
			JOIN message m ON f.article_id = m.message_id
			JOIN user u ON m.user_id = u.id
			WHERE f.user_id = ?
			ORDER BY f.created_at DESC
		`
		rows, err := db.Query(query, userID)
		if err != nil {
			log.Printf("查询收藏文章列表错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取收藏列表失败"})
			return
		}
		defer rows.Close()

		var favorites []map[string]interface{}
		for rows.Next() {
			var favorite struct {
				ID        int64
				ArticleID int
				Title     string
				Author    string
				Date      string
				Summary   string
				Points    int
			}

			err := rows.Scan(
				&favorite.ID,
				&favorite.ArticleID,
				&favorite.Title,
				&favorite.Author,
				&favorite.Date,
				&favorite.Summary,
				&favorite.Points,
			)

			if err != nil {
				log.Printf("扫描收藏文章数据错误: %v", err)
				continue
			}

			favoriteMap := map[string]interface{}{
				"favoriteId": favorite.ID,
				"id":         favorite.ArticleID,
				"title":      favorite.Title,
				"author":     favorite.Author,
				"date":       favorite.Date,
				"summary":    favorite.Summary,
				"points":     favorite.Points,
			}

			favorites = append(favorites, favoriteMap)
		}

		c.JSON(http.StatusOK, gin.H{
			"favorites": favorites,
			"count":     len(favorites),
		})
	}
} 
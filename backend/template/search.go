package template

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
)

// 检索到的数据库内容
type SearchResult struct {
	ID      int    `json:"id"`
	Title   string `json:"title"`
	Author  string `json:"author"`
	Date    string `json:"date"`
	Summary string `json:"summary"`
	Points  int    `json:"points"`
}

func GetSearchsHandler(c *gin.Context) {
	// 获取搜索关键词
	searchTerm := c.Query("q")

	if searchTerm == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "搜索关键词不能为空"})
		return
	}

	// 连接数据库
	dsn := "root:123456@tcp(127.0.0.1:3307)/golan"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库连接失败"})
		return
	}
	defer db.Close()

	//查询找到的东西
	// 查询当前页的文章并连接用户表获取用户名
	query := `
		SELECT m.message_id, m.message_name, u.username, m.date, m.summary,m.points
		FROM message m
		INNER JOIN user u ON m.user_id = u.id
		WHERE m.message_name LIKE ? OR u.username LIKE ? OR m.summary LIKE ?
		`

	rows, err := db.Query(query, "%"+searchTerm+"%", "%"+searchTerm+"%", "%"+searchTerm+"%")
	if err != nil {
		fmt.Println("数据库查询错误:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "搜索失败"})
		return
	}
	defer rows.Close()

	var searchResults []SearchResult
	for rows.Next() {
		var result SearchResult
		if err := rows.Scan(&result.ID, &result.Title, &result.Author, &result.Date, &result.Summary, &result.Points); err != nil {
			fmt.Println("扫描数据错误:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "处理搜索结果失败"})
			return
		}
		searchResults = append(searchResults, result)
	}

	if err := rows.Err(); err != nil {
		fmt.Println("遍历数据错误:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "处理搜索结果失败"})
		return
	}

	c.JSON(http.StatusOK, searchResults)
}

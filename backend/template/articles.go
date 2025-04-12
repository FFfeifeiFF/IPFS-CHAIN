package template

import (
	"database/sql"
	"fmt"
	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"net/http"
	"strconv"
)

// 数据库内容
type Article struct {
	ID      int    `json:"id"`
	Title   string `json:"title"`
	Author  string `json:"author"`
	Date    string `json:"date"`
	Summary string `json:"summary"`
	Points  int    `json:"points"`
}

// 分页响应结构体
type PagedResponse struct {
	TotalCount int       `json:"totalCount"`
	Data       []Article `json:"data"`
}

// 获取分页文章的 Handler
func GetArticlesHandler(c *gin.Context) {
	// 获取分页参数
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("pageSize", "5")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize < 1 || pageSize > 50 {
		pageSize = 5
	}

	// 连接数据库
	dsn := "root:123456@tcp(127.0.0.1:3307)/golan"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库连接失败"})
		return
	}
	defer db.Close()

	// 计算 LIMIT 和 OFFSET
	offset := (page - 1) * pageSize

	// 查询当前页的文章并连接用户表获取用户名
	query := `
		SELECT m.message_id, m.message_name, u.username, m.date, m.summary,m.points
		FROM message m
		INNER JOIN user u ON m.user_id = u.id
		LIMIT ? OFFSET ?
	`
	rows, err := db.Query(query, pageSize, offset)
	if err != nil {
		fmt.Println("数据库查询失败:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询失败"})
		return
	}
	defer rows.Close()

	var articles []Article
	for rows.Next() {
		var article Article
		fmt.Println(article)
		err := rows.Scan(&article.ID, &article.Title, &article.Author, &article.Date, &article.Summary, &article.Points)
		if err != nil {
			fmt.Println("数据扫描失败:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "数据扫描失败"})
			return
		}
		articles = append(articles, article)
	}

	if err := rows.Err(); err != nil {
		fmt.Println("遍历数据失败:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "遍历数据失败"})
		return
	}
	// 打印查询到的文章数据
	fmt.Println("查询到的文章数据：", articles)

	// 查询总记录数
	var totalCount int
	err = db.QueryRow("SELECT COUNT(*) FROM message").Scan(&totalCount)
	if err != nil {
		fmt.Println("获取总记录数失败:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取总记录数失败"})
		return
	}
	fmt.Printf("Response: %+v\n", PagedResponse{
		TotalCount: totalCount,
		Data:       articles,
	})
	// 返回 JSON 响应
	c.JSON(http.StatusOK, PagedResponse{
		TotalCount: totalCount,
		Data:       articles,
	})
}

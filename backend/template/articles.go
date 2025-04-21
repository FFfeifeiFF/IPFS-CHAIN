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
	pageSizeStr := c.DefaultQuery("pageSize", "10")
	riskLevelParam := c.Query("riskLevel")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	pageSize, err := strconv.Atoi(pageSizeStr)
	if err != nil || pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	// 连接数据库
	//dsn := "root:123456@tcp(127.0.0.1:3307)/golan"
	dsn := "block:bsPCcLmcwdcWGcWX@tcp(8.148.71.83:3306)/blockchain"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库连接失败: " + err.Error()})
		return
	}
	defer db.Close()

	// 构建基础查询语句
	baseQuery := `
		SELECT m.message_id, m.message_name, u.username, m.date, m.summary, m.points
		FROM message m
		INNER JOIN user u ON m.user_id = u.id
	`
	countQueryBase := "SELECT COUNT(*) FROM message m"
	var whereClause string
	var args []interface{}
	var countArgs []interface{}

	// 根据 riskLevel 构建 WHERE 子句
	switch riskLevelParam {
	case "high":
		whereClause = "WHERE m.points >= ?"
		args = append(args, 15)
		countArgs = append(countArgs, 15)
	case "medium":
		whereClause = "WHERE m.points >= ? AND m.points < ?"
		args = append(args, 5, 15)
		countArgs = append(countArgs, 5, 15)
	case "low":
		whereClause = "WHERE m.points < ?"
		args = append(args, 5)
		countArgs = append(countArgs, 5)
	case "medium,low":
		whereClause = "WHERE m.points < ?"
		args = append(args, 15)
		countArgs = append(countArgs, 15)
	default:
		whereClause = ""
	}

	// 完整查询语句（数据）
	query := baseQuery + " " + whereClause + " ORDER BY m.date DESC LIMIT ? OFFSET ?"
	// 计算 LIMIT 和 OFFSET
	offset := (page - 1) * pageSize
	finalArgs := append(args, pageSize, offset)

	// 查询当前页的文章并连接用户表获取用户名
	fmt.Printf("Executing Query: %s with args %v\n", query, finalArgs)
	rows, err := db.Query(query, finalArgs...)
	if err != nil {
		fmt.Println("数据库查询失败:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询失败: " + err.Error()})
		return
	}
	defer rows.Close()

	var articles []Article
	for rows.Next() {
		var article Article
		err := rows.Scan(&article.ID, &article.Title, &article.Author, &article.Date, &article.Summary, &article.Points)
		if err != nil {
			fmt.Println("数据扫描失败:", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "数据扫描失败: " + err.Error()})
			return
		}
		articles = append(articles, article)
	}

	if err := rows.Err(); err != nil {
		fmt.Println("遍历数据失败:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "遍历数据失败: " + err.Error()})
		return
	}
	// 打印查询到的文章数据
	// fmt.Println("查询到的文章数据：", articles)

	// 查询总记录数 (带 WHERE 条件)
	countQuery := countQueryBase + " " + whereClause
	var totalCount int
	fmt.Printf("Executing Count Query: %s with args %v\n", countQuery, countArgs)
	err = db.QueryRow(countQuery, countArgs...).Scan(&totalCount)
	if err != nil {
		fmt.Println("获取总记录数失败:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "获取总记录数失败: " + err.Error()})
		return
	}
	// 返回 JSON 响应
	c.JSON(http.StatusOK, PagedResponse{
		TotalCount: totalCount,
		Data:       articles,
	})
}

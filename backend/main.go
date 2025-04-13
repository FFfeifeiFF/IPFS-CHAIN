package main

import (
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"gotest/template"
	"net/http"
	"time"
)

// 主函数
func main() {
	// 创建一个默认的 Gin 引擎
	r := gin.Default()

	// **关键修改：将 CORS 中间件放在所有路由定义之前**
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"}, // 允许你的前端域名
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"Accept", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour, // 可选：设置预检请求的缓存时间
	}))

	// 定义一个路由和处理函数
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "pong",
		})
	})

	// 定义 /register 路由和处理函数 (使用 Gin 的方式)
	r.POST("/register", template.RegisterHandler)
	r.POST("/login", template.LoginHandler)
	r.GET("/articles", template.GetArticlesHandler)
	r.GET("/search", template.GetSearchsHandler)
	r.POST("/upload", template.UploadFile) //上传文件到IPFS中
	r.POST("/db", template.Db)
	r.POST("/download", template.DownloadFile)
	r.GET("/fileupdate", template.FileUpdate)
	r.DELETE("/fileupdate/:articleId", template.DeleteArticleHandler)
	r.PUT("/fileupdate/:articleId", template.UpdateArticleHandler)
	// 启动 HTTP 服务，监听 8080 端口
	r.Run(":8080")
}

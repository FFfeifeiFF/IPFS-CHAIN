package main

import (
	"database/sql"
	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"gotest/template"
	"log"
	"net/http"
	"time"
)

var sseBroker *template.Broker

// 主函数
func main() {
	// 创建一个默认的 Gin 引擎
	r := gin.Default()
	// 使用你的实际数据库连接字符串
	dsn := "root:123456@tcp(127.0.0.1:3307)/golan"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatalf("数据库连接失败: %v", err)
	}
	// 推荐设置连接池参数
	db.SetMaxOpenConns(25)
	db.SetMaxIdleConns(25)
	// ... 其他设置

	// 检查数据库连接是否成功
	if err = db.Ping(); err != nil {
		log.Fatalf("无法连接到数据库: %v", err)
	}
	log.Println("数据库连接成功")

	// 在程序退出时关闭数据库连接是一个好习惯
	defer func() {
		if err := db.Close(); err != nil {
			log.Printf("关闭数据库连接时出错: %v", err)
		} else {
			log.Println("数据库连接已关闭")
		}
	}()
	// **关键修改：将 CORS 中间件放在所有路由定义之前**
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"http://localhost:3000"}, // 允许你的前端域名
		AllowMethods:     []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowHeaders:     []string{"*"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour, // 可选：设置预检请求的缓存时间
	}))

	// 定义一个路由和处理函数
	r.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "pong",
		})
	})
	sseBroker = template.NewBroker()
	// 定义 /register 路由和处理函数 (使用 Gin 的方式)
	r.POST("/register", template.RegisterHandler)
	r.POST("/login", template.LoginHandler)
	r.GET("/articles", template.GetArticlesHandler)
	r.GET("/search", template.GetSearchsHandler)
	r.POST("/upload", template.UploadFile) //上传文件到IPFS中
	r.POST("/db", template.Db)
	r.POST("/download", template.DownloadFile(sseBroker))
	r.GET("/fileupdate", template.FileUpdate)
	r.DELETE("/fileupdate/:articleId", template.DeleteArticleHandler)
	r.PUT("/fileupdate/:articleId", template.UpdateArticleHandler)
	r.GET("/subscribe/:username", template.SseSubscribeHandler(sseBroker))
	r.GET("/profile", template.GetUserProfileHandler(db))
	r.PUT("/changeprofile", template.ChangeProfile)
	r.GET("/changeprofile", template.GetUserProfile)
	// 启动 HTTP 服务，监听 8080 端口
	r.Run(":8080")
}

package template

import (
	"encoding/json"
	"fmt"
	"github.com/gin-gonic/gin"
	"io"
	"log"
	"net/http"
	"sync"
	"time"
)

// Notification 结构体 (需要与前端约定好格式)
type Notification struct {
	Type         string    `json:"type"`
	Downloader   string    `json:"downloader,omitempty"` // omitempty 如果不需要可以不传
	ArticleTitle string    `json:"articleTitle,omitempty"`
	ArticleID    int       `json:"articleId,omitempty"`
	Timestamp    time.Time `json:"timestamp"`
	// 可以根据需要添加其他字段, 如原始消息 Message string
}

// Broker 结构体
type Broker struct {
	clients map[string]chan []byte // username -> channel for pre-formatted SSE messages
	mutex   sync.RWMutex
}

// NewBroker 工厂函数
func NewBroker() *Broker {
	return &Broker{
		clients: make(map[string]chan []byte),
	}
}

// AddClient 添加客户端
func (b *Broker) AddClient(username string) chan []byte {
	b.mutex.Lock()
	defer b.mutex.Unlock()
	if ch, ok := b.clients[username]; ok {
		close(ch) // 关闭旧连接
		log.Printf("SSE Broker: 关闭用户 %s 的旧通道", username)
	}
	ch := make(chan []byte, 10) // 带缓冲通道
	b.clients[username] = ch
	log.Printf("SSE Broker: 用户 %s 已连接", username)
	return ch
}

// RemoveClient 移除客户端
func (b *Broker) RemoveClient(username string) {
	b.mutex.Lock()
	defer b.mutex.Unlock()
	if ch, ok := b.clients[username]; ok {
		close(ch) // 关闭通道是关键
		delete(b.clients, username)
		log.Printf("SSE Broker: 用户 %s 已断开连接", username)
	}
}

// GetClientChannel 获取通道 (用于发送)
func (b *Broker) GetClientChannel(username string) (chan []byte, bool) {
	b.mutex.RLock()
	defer b.mutex.RUnlock()
	ch, ok := b.clients[username]
	return ch, ok
}

// SendNotificationToUser 格式化并发送通知
func (b *Broker) SendNotificationToUser(username string, notification Notification) {
	notification.Timestamp = time.Now()
	jsonData, err := json.Marshal(notification)
	if err != nil {
		log.Printf("SSE Broker: 序列化通知失败 for %s: %v", username, err)
		return
	}

	// 构造完整的 SSE 消息
	sseMessage := fmt.Sprintf("event: downloadNotification\ndata: %s\n\n", string(jsonData))

	if ch, ok := b.GetClientChannel(username); ok {
		select {
		case ch <- []byte(sseMessage):
			log.Printf("SSE Broker: 已发送通知 '%s' 给用户 %s", notification.Type, username)
		case <-time.After(1 * time.Second):
			log.Printf("SSE Broker: 发送通知给用户 %s 超时", username)
		default:
			log.Printf("SSE Broker: 用户 %s 的通道已满或关闭", username)
		}
	} else {
		log.Printf("SSE Broker: 用户 %s 未连接，通知丢弃", username)
	}
}

// SseSubscribeHandler 返回处理 SSE 订阅的 Gin HandlerFunc
// 使用 broker *Broker 而非全局变量，更推荐这种方式
func SseSubscribeHandler(broker *Broker) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 1. 获取用户名 (通常来自 URL 路径参数)
		// 假设你的路由是 /notifications/subscribe/:username
		username := c.Param("username")
		if username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少用户名参数"})
			c.Abort() // 终止请求处理
			return
		}

		// --- TODO: 在这里添加认证逻辑 ---
		// 验证当前请求是否真的属于这个 username (比如检查 JWT Token 或 Session)
		// 如果认证失败，应该返回 401 或 403 并 c.Abort()

		// 2. 设置 SSE 相关的 HTTP 头部
		c.Writer.Header().Set("Content-Type", "text/event-stream")
		c.Writer.Header().Set("Cache-Control", "no-cache")
		c.Writer.Header().Set("Connection", "keep-alive")
		// 允许跨域 (根据你的前端地址修改或使用更严格的配置)
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")

		// 3. 注册客户端，获取消息通道
		clientChan := broker.AddClient(username)

		// 4. 使用 defer 确保客户端断开连接时，从 Broker 中移除
		defer broker.RemoveClient(username)

		// 5. 使用 Gin 的 Stream 功能来保持连接和处理消息/断开
		log.Printf("SSE Handler: 开始为用户 %s 提供流式服务", username)
		c.Stream(func(w io.Writer) bool {
			select {
			// a. 监听 Broker 发来的消息
			case msg, ok := <-clientChan:
				if !ok {
					// 通道已关闭，意味着 broker.RemoveClient 被调用了
					log.Printf("SSE Handler: 用户 %s 的通道已关闭，终止流", username)
					return false // 返回 false 会让 Gin 关闭连接
				}
				// 将从 Broker 收到的、已经格式化好的 SSE 消息写入响应流
				fmt.Println("测试")
				fmt.Println(msg)
				_, err := w.Write(msg)
				if err != nil {
					// 写入失败，通常是客户端主动断开连接
					log.Printf("SSE Handler: 写入数据给 %s 失败: %v，终止流", username, err)
					return false // 返回 false 关闭连接
				}
				// log.Printf("SSE Handler: 成功发送消息给 %s", username) // 可以取消注释用于调试
				return true // 返回 true 保持连接打开，等待下一条消息

			// b. 监听客户端断开连接 (通过 Gin 的 Context)
			case <-c.Request.Context().Done():
				log.Printf("SSE Handler: 检测到客户端 %s 连接中断 (Context Done)", username)
				return false // 返回 false 关闭连接

			// c. (可选) 发送心跳信号防止连接因空闲超时被断开
			case <-time.After(25 * time.Second): // 每 25 秒发一次
				// SSE 注释以 : 开头，不会触发前端 onmessage 事件
				_, err := w.Write([]byte(": ping\n\n"))
				if err != nil {
					log.Printf("SSE Handler: 发送心跳给 %s 失败: %v，终止流", username, err)
					return false
				}
				// log.Printf("SSE Handler: 已发送心跳给 %s", username) // 可以取消注释用于调试
				return true // 保持连接
			}
		})

		// 当 c.Stream 返回 false 后，会执行到这里
		log.Printf("SSE Handler: 用户 %s 的流式服务已结束", username)

	}
}

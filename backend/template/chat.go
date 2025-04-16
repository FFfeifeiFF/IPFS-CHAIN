package template

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/gorilla/websocket"
)

// Message 消息结构体
type Message struct {
	ID        int64  `json:"id"`
	SenderID  int    `json:"senderId"`
	ReceiverID int   `json:"receiverId"`
	Content   string `json:"content"`
	IsRead    bool   `json:"isRead"`
	CreatedAt string `json:"createdAt"`
	SenderName string `json:"senderName"`
	ReceiverName string `json:"receiverName"`
}

// Conversation 会话结构体
type Conversation struct {
	ID           int64  `json:"id"`
	OtherUserID  int    `json:"otherUserId"`
	OtherUsername string `json:"otherUsername"`
	LastMessage  string `json:"lastMessage"`
	UnreadCount  int    `json:"unreadCount"`
	LastMessageTime string `json:"lastMessageTime"`
}

// WebSocket 相关结构和变量
var wsUpgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // 允许所有源
	},
}

// 存储每个用户的WebSocket连接
var (
	clients = make(map[string]*websocket.Conn)
	mutex   = &sync.Mutex{}
)

// WebSocketMessage 结构体
type WebSocketMessage struct {
	Type    string      `json:"type"`
	Data    interface{} `json:"data"`
}

// SendMessageHandler 发送消息API
func SendMessageHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var request struct {
			SenderUsername   string `json:"senderUsername"`
			ReceiverUsername string `json:"receiverUsername"`
			Content  string `json:"content"`
		}
		
		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求数据"})
			return
		}
		
		// 验证发送者和接收者是否存在
		var senderID, receiverID int
		err := db.QueryRow("SELECT id FROM user WHERE username = ?", request.SenderUsername).Scan(&senderID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "发送者不存在"})
			return
		}
		
		err = db.QueryRow("SELECT id FROM user WHERE username = ?", request.ReceiverUsername).Scan(&receiverID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "接收者不存在"})
			return
		}
		
		// 验证他们是否是好友
		var friendshipCount int
		err = db.QueryRow(`
			SELECT COUNT(*) FROM friendships 
			WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
			AND status = 'accepted'
		`, senderID, receiverID, receiverID, senderID).Scan(&friendshipCount)
		
		if err != nil {
			log.Printf("检查好友关系错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询失败"})
			return
		}
		
		if friendshipCount == 0 {
			c.JSON(http.StatusForbidden, gin.H{"error": "只能向好友发送消息"})
			return
		}
		
		// 保存消息
		result, err := db.Exec(
			"INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)",
			senderID, receiverID, request.Content,
		)
		
		if err != nil {
			log.Printf("保存消息错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "发送消息失败"})
			return
		}
		
		messageID, _ := result.LastInsertId()
		
		// 更新或创建会话
		_, err = db.Exec(`
			INSERT INTO conversations (user1_id, user2_id, last_message_id) 
			VALUES (?, ?, ?)
			ON DUPLICATE KEY UPDATE last_message_id = ?, updated_at = CURRENT_TIMESTAMP
		`, senderID, receiverID, messageID, messageID)
		
		if err != nil {
			log.Printf("更新会话错误: %v", err)
		}
		
		c.JSON(http.StatusOK, gin.H{
			"id": messageID,
			"message": "消息已发送",
		})
	}
}

// GetMessagesHandler 获取消息历史
func GetMessagesHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		senderUsername := c.Query("username")
		receiverUsername := c.Query("friendUsername")
		
		if senderUsername == "" || receiverUsername == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少发送者或接收者用户名"})
			return
		}
		
		// 获取用户ID
		var senderID, receiverID int
		err := db.QueryRow("SELECT id FROM user WHERE username = ?", senderUsername).Scan(&senderID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "发送者不存在"})
			return
		}
		
		err = db.QueryRow("SELECT id FROM user WHERE username = ?", receiverUsername).Scan(&receiverID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "接收者不存在"})
			return
		}
		
		// 获取消息历史
		query := `
			SELECT m.id, m.sender_id, m.receiver_id, m.content, m.is_read, m.created_at
			FROM messages m
			WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
			ORDER BY m.created_at ASC
			LIMIT 100
		`
		
		rows, err := db.Query(query, senderID, receiverID, receiverID, senderID)
		if err != nil {
			log.Printf("查询消息历史错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取消息历史失败"})
			return
		}
		defer rows.Close()
		
		var messages []map[string]interface{}
		for rows.Next() {
			var msg struct {
				ID        int64
				SenderID  int
				ReceiverID int
				Content   string
				IsRead    bool
				CreatedAt string
			}
			
			err := rows.Scan(
				&msg.ID, &msg.SenderID, &msg.ReceiverID, &msg.Content, 
				&msg.IsRead, &msg.CreatedAt,
			)
			
			if err != nil {
				log.Printf("扫描消息数据错误: %v", err)
				continue
			}
			
			// 构建前端需要的消息格式
			message := map[string]interface{}{
				"id": msg.ID,
				"content": msg.Content,
				"is_read": msg.IsRead,
				"created_at": msg.CreatedAt,
			}
			
			// 添加发送者和接收者信息
			if msg.SenderID == senderID {
				message["sender"] = map[string]interface{}{
					"username": senderUsername,
				}
				message["receiver"] = map[string]interface{}{
					"username": receiverUsername,
				}
			} else {
				message["sender"] = map[string]interface{}{
					"username": receiverUsername,
				}
				message["receiver"] = map[string]interface{}{
					"username": senderUsername,
				}
			}
			
			messages = append(messages, message)
		}
		
		// 标记消息为已读（当当前用户是接收者时）
		_, err = db.Exec(
			"UPDATE messages SET is_read = TRUE WHERE sender_id = ? AND receiver_id = ? AND is_read = FALSE",
			receiverID, senderID,
		)
		
		if err != nil {
			log.Printf("标记消息已读错误: %v", err)
		}
		
		c.JSON(http.StatusOK, gin.H{
			"messages": messages,
			"count": len(messages),
		})
	}
}

// GetUnreadCountHandler 获取未读消息数
func GetUnreadCountHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		username := c.Query("username")
		
		if username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少用户名参数"})
			return
		}
		
		// 获取用户ID
		var userID int
		err := db.QueryRow("SELECT id FROM user WHERE username = ?", username).Scan(&userID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
			return
		}
		
		// 查询未读消息数
		var unreadCount int
		err = db.QueryRow(
			"SELECT COUNT(*) FROM messages WHERE receiver_id = ? AND is_read = FALSE",
			userID,
		).Scan(&unreadCount)
		
		if err != nil {
			log.Printf("查询未读消息数错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取未读消息数失败"})
			return
		}
		
		c.JSON(http.StatusOK, gin.H{
			"count": unreadCount,
		})
	}
}

// 处理WebSocket连接
func HandleChatWebSocket(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		username := c.Query("username")
		if username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "用户名不能为空"})
			return
		}

		// 升级HTTP连接为WebSocket
		conn, err := wsUpgrader.Upgrade(c.Writer, c.Request, nil)
		if err != nil {
			log.Printf("WebSocket升级错误: %v", err)
			return
		}
		
		// 存储连接
		mutex.Lock()
		// 如果用户已有连接，关闭旧连接
		if oldConn, exists := clients[username]; exists {
			defer oldConn.Close()
		}
		clients[username] = conn
		mutex.Unlock()
		
		log.Printf("用户 %s 已连接WebSocket", username)
		
		// 发送连接成功消息
		welcome := WebSocketMessage{
			Type: "connection",
			Data: map[string]interface{}{
				"message": "WebSocket连接已建立",
				"timestamp": time.Now().Format(time.RFC3339),
			},
		}
		err = conn.WriteJSON(welcome)
		if err != nil {
			log.Printf("发送欢迎消息错误: %v", err)
		}
		
		// 监听WebSocket消息
		go handleWebSocketMessages(conn, username, db)
	}
}

// 处理接收到的WebSocket消息
func handleWebSocketMessages(conn *websocket.Conn, username string, db *sql.DB) {
	defer func() {
		conn.Close()
		mutex.Lock()
		delete(clients, username)
		mutex.Unlock()
		log.Printf("用户 %s WebSocket连接已关闭", username)
	}()
	
	for {
		_, msgBytes, err := conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("读取WebSocket消息错误: %v", err)
			}
			break
		}
		
		// 解析消息
		var wsMsg WebSocketMessage
		if err := json.Unmarshal(msgBytes, &wsMsg); err != nil {
			log.Printf("解析WebSocket消息错误: %v", err)
			continue
		}
		
		// 处理不同类型的消息
		switch wsMsg.Type {
		case "chat":
			handleChatMessage(wsMsg.Data, username, db)
		default:
			log.Printf("未知消息类型: %s", wsMsg.Type)
		}
	}
}

// 处理聊天消息
func handleChatMessage(data interface{}, senderUsername string, db *sql.DB) {
	// 将data转换为map
	msgData, ok := data.(map[string]interface{})
	if !ok {
		log.Printf("消息数据格式错误")
		return
	}
	
	// 获取接收者用户名和消息内容
	receiverUsername, ok1 := msgData["receiverUsername"].(string)
	content, ok2 := msgData["content"].(string)
	
	if !ok1 || !ok2 || receiverUsername == "" || content == "" {
		log.Printf("消息缺少必要字段")
		return
	}
	
	// 获取用户ID
	var senderID, receiverID int
	err := db.QueryRow("SELECT id FROM user WHERE username = ?", senderUsername).Scan(&senderID)
	if err != nil {
		log.Printf("获取发送者ID错误: %v", err)
		return
	}
	
	err = db.QueryRow("SELECT id FROM user WHERE username = ?", receiverUsername).Scan(&receiverID)
	if err != nil {
		log.Printf("获取接收者ID错误: %v", err)
		return
	}
	
	// 验证好友关系
	var friendshipCount int
	err = db.QueryRow(`
		SELECT COUNT(*) FROM friendships 
		WHERE ((requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?))
		AND status = 'accepted'
	`, senderID, receiverID, receiverID, senderID).Scan(&friendshipCount)
	
	if err != nil || friendshipCount == 0 {
		log.Printf("非好友关系，不能发送消息")
		return
	}
	
	// 保存消息到数据库
	result, err := db.Exec(
		"INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)",
		senderID, receiverID, content,
	)
	
	if err != nil {
		log.Printf("保存消息错误: %v", err)
		return
	}
	
	messageID, _ := result.LastInsertId()
	
	// 构建要发送的消息对象
	timestamp := time.Now().Format(time.RFC3339)
	messageObj := map[string]interface{}{
		"id": messageID,
		"sender": map[string]interface{}{
			"username": senderUsername,
		},
		"receiver": map[string]interface{}{
			"username": receiverUsername,
		},
		"content": content,
		"is_read": false,
		"created_at": timestamp,
	}
	
	// 发送给接收者（如果在线）
	sendMessageToUser(receiverUsername, WebSocketMessage{
		Type: "new_message",
		Data: messageObj,
	})
	
	// 发送给发送者确认
	sendMessageToUser(senderUsername, WebSocketMessage{
		Type: "message_sent",
		Data: messageObj,
	})
}

// 向指定用户发送WebSocket消息
func sendMessageToUser(username string, message WebSocketMessage) {
	mutex.Lock()
	conn, exists := clients[username]
	mutex.Unlock()
	
	if !exists {
		return
	}
	
	if err := conn.WriteJSON(message); err != nil {
		log.Printf("发送WebSocket消息错误: %v", err)
	}
} 
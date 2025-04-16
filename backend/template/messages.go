package template

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// Message 结构体表示消息数据
type Messages struct {
	ID        int       `json:"id"`
	Sender    string    `json:"sender"`
	Receiver  string    `json:"receiver"`
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp"`
}

// GetxinxiMessagesHandler 处理获取消息的请求
func GetxinxiMessagesHandler(c *gin.Context, db *sql.DB) {
	// 从请求中获取当前用户和聊天对象
	currentUser := c.Query("username")
	chatWith := c.Query("friendUsername")
	fmt.Println(currentUser, chatWith)
	
	if currentUser == "" || chatWith == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Missing username or friendUsername parameter",
		})
		return
	}

	// 先查询用户ID
	var currentUserID, chatWithID int
	err := db.QueryRow("SELECT id FROM user WHERE username = ?", currentUser).Scan(&currentUserID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Error getting current user ID: %v", err),
		})
		return
	}

	err = db.QueryRow("SELECT id FROM user WHERE username = ?", chatWith).Scan(&chatWithID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Error getting friend user ID: %v", err),
		})
		return
	}

	// 查询数据库获取消息历史
	// 查询条件：(sender=currentUser AND receiver=chatWith) OR (sender=chatWith AND receiver=currentUser)
	query := `
		SELECT id, sender_id, receiver_id, content, created_at
		FROM messages
		WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
		ORDER BY created_at ASC
	`

	rows, err := db.Query(query, currentUserID, chatWithID, chatWithID, currentUserID)
	fmt.Println(rows)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Database error: %v", err),
		})
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
			CreatedAt string
		}
		
		if err := rows.Scan(&msg.ID, &msg.SenderID, &msg.ReceiverID, &msg.Content, &msg.CreatedAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": fmt.Sprintf("Error scanning message: %v", err),
			})
			return
		}
		
		// 构建前端需要的消息格式
		message := map[string]interface{}{
			"id": msg.ID,
			"content": msg.Content,
			"created_at": msg.CreatedAt,
			"is_read": true, // 默认已读
		}
		
		// 添加发送者和接收者信息
		if msg.SenderID == currentUserID {
			message["sender"] = map[string]interface{}{
				"username": currentUser,
			}
			message["receiver"] = map[string]interface{}{
				"username": chatWith,
			}
		} else {
			message["sender"] = map[string]interface{}{
				"username": chatWith,
			}
			message["receiver"] = map[string]interface{}{
				"username": currentUser,
			}
		}
		
		messages = append(messages, message)
	}

	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Error iterating messages: %v", err),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"messages": messages,
	})
}

// SendxinxiMessageHandler 处理发送新消息的请求
func SendxinxiMessageHandler(c *gin.Context, db *sql.DB) {
	var messageRequest struct {
		SenderUsername   string `json:"senderUsername"`
		ReceiverUsername string `json:"receiverUsername"`
		Content  string `json:"content"`
	}

	if err := c.ShouldBindJSON(&messageRequest); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Invalid request body: %v", err),
		})
		return
	}

	// 验证请求数据
	if messageRequest.SenderUsername == "" || messageRequest.ReceiverUsername == "" || messageRequest.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "SenderUsername, receiverUsername, and content are required",
		})
		return
	}

	// 查询用户ID
	var senderID, receiverID int
	err := db.QueryRow("SELECT id FROM user WHERE username = ?", messageRequest.SenderUsername).Scan(&senderID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Error getting sender ID: %v", err),
		})
		return
	}

	err = db.QueryRow("SELECT id FROM user WHERE username = ?", messageRequest.ReceiverUsername).Scan(&receiverID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Error getting receiver ID: %v", err),
		})
		return
	}

	// 保存消息到数据库
	stmt, err := db.Prepare("INSERT INTO messages (sender_id, receiver_id, content, created_at) VALUES (?, ?, ?, ?)")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Error preparing statement: %v", err),
		})
		return
	}
	defer stmt.Close()

	now := time.Now()
	result, err := stmt.Exec(senderID, receiverID, messageRequest.Content, now)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Error saving message: %v", err),
		})
		return
	}

	// 获取新消息ID
	messageID, err := result.LastInsertId()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("Error getting message ID: %v", err),
		})
		return
	}

	// 返回新消息信息
	c.JSON(http.StatusOK, gin.H{
		"id": messageID,
		"message": "消息已发送",
	})
}

// 创建表的SQL语句
const CreateMessagesTableSQL = `
CREATE TABLE IF NOT EXISTS messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sender VARCHAR(255) NOT NULL,
    receiver VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    timestamp DATETIME NOT NULL,
    INDEX idx_sender_receiver (sender, receiver),
    INDEX idx_timestamp (timestamp)
);
` 
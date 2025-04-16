package template

import (
	"database/sql"
	"log"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// 好友关系结构
type Friendship struct {
	ID          int64  `json:"id"`
	RequesterID int    `json:"requesterId"`
	AddresseeID int    `json:"addresseeId"`
	Status      string `json:"status"` // pending或accepted
	CreatedAt   string `json:"createdAt"`
	UpdatedAt   string `json:"updatedAt"`
}

// 用户基本信息
type UserInfo struct {
	ID       int    `json:"id"`
	Username string `json:"username"`
}

// 好友请求响应结构
type FriendRequestResponse struct {
	ID         int64  `json:"id"`
	Requester  UserInfo `json:"requester"`
	Status     string `json:"status"`
	CreateTime string `json:"createTime"`
}

// GetFriendsHandler 获取用户的好友列表
func GetFriendsHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		username := c.Query("username")
		if username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少用户名参数"})
			return
		}

		// 1. 首先获取当前用户的ID
		var userID int
		err := db.QueryRow("SELECT id FROM user WHERE username = ?", username).Scan(&userID)
		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
				return
			}
			log.Printf("查询用户ID错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询失败"})
			return
		}

		// 2. 查询该用户的所有好友（A->B和B->A的accepted关系）
		query := `
		SELECT u.id, u.username 
		FROM user u
		JOIN friendships f ON (u.id = f.addressee_id AND f.requester_id = ? OR u.id = f.requester_id AND f.addressee_id = ?)
		WHERE f.status = 'accepted'
		`
		rows, err := db.Query(query, userID, userID)
		if err != nil {
			log.Printf("查询好友列表错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取好友列表失败"})
			return
		}
		defer rows.Close()

		// 3. 将结果组装成好友列表
		friends := []UserInfo{}
		for rows.Next() {
			var friend UserInfo
			if err := rows.Scan(&friend.ID, &friend.Username); err != nil {
				log.Printf("扫描好友数据错误: %v", err)
				continue
			}
			// 跳过自己
			if friend.ID != userID {
				friends = append(friends, friend)
			}
		}

		c.JSON(http.StatusOK, gin.H{
			"friends": friends,
			"count":   len(friends),
		})
	}
}

// GetFriendRequestsHandler 获取用户收到的好友请求
func GetFriendRequestsHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		username := c.Query("username")
		if username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少用户名参数"})
			return
		}

		// 1. 获取用户ID
		var userID int
		err := db.QueryRow("SELECT id FROM user WHERE username = ?", username).Scan(&userID)
		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
				return
			}
			log.Printf("查询用户ID错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询失败"})
			return
		}

		// 2. 查询所有发给该用户且状态为pending的好友请求
		query := `
		SELECT f.id, f.requester_id, u.username, f.created_at
		FROM friendships f
		JOIN user u ON f.requester_id = u.id
		WHERE f.addressee_id = ? AND f.status = 'pending'
		ORDER BY f.created_at DESC
		`
		rows, err := db.Query(query, userID)
		if err != nil {
			log.Printf("查询好友请求错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取好友请求失败"})
			return
		}
		defer rows.Close()

		// 3. 组装好友请求列表
		requests := []FriendRequestResponse{}
		for rows.Next() {
			var request FriendRequestResponse
			var requesterID int
			var requesterName string
			
			if err := rows.Scan(&request.ID, &requesterID, &requesterName, &request.CreateTime); err != nil {
				log.Printf("扫描好友请求数据错误: %v", err)
				continue
			}
			
			request.Requester = UserInfo{
				ID: requesterID,
				Username: requesterName,
			}
			request.Status = "pending"
			
			requests = append(requests, request)
		}

		c.JSON(http.StatusOK, gin.H{
			"requests": requests,
			"count":    len(requests),
		})
	}
}

// SearchUsersHandler 搜索用户
func SearchUsersHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		query := c.Query("query")
		currentUsername := c.Query("username") // 当前登录用户

		if query == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "搜索关键词不能为空"})
			return
		}

		if currentUsername == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "当前用户名不能为空"})
			return
		}

		// 1. 获取当前用户ID
		var currentUserID int
		err := db.QueryRow("SELECT id FROM user WHERE username = ?", currentUsername).Scan(&currentUserID)
		if err != nil {
			log.Printf("查询当前用户ID错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询失败"})
			return
		}

		// 2. 搜索用户（排除自己）
		searchQuery := `
		SELECT id, username FROM user 
		WHERE username LIKE ? AND username != ?
		LIMIT 10
		`
		rows, err := db.Query(searchQuery, "%"+query+"%", currentUsername)
		if err != nil {
			log.Printf("搜索用户错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "搜索用户失败"})
			return
		}
		defer rows.Close()

		// 3. 组装搜索结果
		var users []map[string]interface{}
		for rows.Next() {
			var user UserInfo
			if err := rows.Scan(&user.ID, &user.Username); err != nil {
				log.Printf("扫描用户数据错误: %v", err)
				continue
			}

			// 检查好友关系状态
			var friendshipStatus string = "none" // 默认无关系
			var existingCount int
			
			checkQuery := `
			SELECT COUNT(*), 
				   CASE 
					   WHEN status = 'accepted' THEN 'friends'
					   WHEN status = 'pending' AND requester_id = ? THEN 'pending'
					   WHEN status = 'pending' AND addressee_id = ? THEN 'request'
				   END AS relationship
			FROM friendships 
			WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)
			`
			
			var relationship sql.NullString
			err := db.QueryRow(checkQuery, currentUserID, currentUserID, currentUserID, user.ID, user.ID, currentUserID).Scan(&existingCount, &relationship)
			if err == nil && existingCount > 0 && relationship.Valid {
				friendshipStatus = relationship.String
			}

			userWithStatus := map[string]interface{}{
				"id":           user.ID,
				"username":     user.Username,
				"friendStatus": friendshipStatus,
			}
			users = append(users, userWithStatus)
		}

		c.JSON(http.StatusOK, gin.H{
			"users": users,
			"count": len(users),
		})
	}
}

// SendFriendRequestHandler 发送好友请求
func SendFriendRequestHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取请求体
		var request struct {
			Username       string `json:"username"`       // 当前用户
			TargetUsername string `json:"targetUsername"` // 要添加的好友
		}

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求数据"})
			return
		}

		// 1. 获取两个用户的ID
		var senderID, receiverID int
		err := db.QueryRow("SELECT id FROM user WHERE username = ?", request.Username).Scan(&senderID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "发送者用户不存在"})
			return
		}

		err = db.QueryRow("SELECT id FROM user WHERE username = ?", request.TargetUsername).Scan(&receiverID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "目标用户不存在"})
			return
		}

		// 2. 检查是否已存在好友关系
		var existingCount int
		err = db.QueryRow(
			"SELECT COUNT(*) FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)",
			senderID, receiverID, receiverID, senderID,
		).Scan(&existingCount)

		if err != nil {
			log.Printf("检查好友关系错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询失败"})
			return
		}

		if existingCount > 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "已存在好友关系或请求"})
			return
		}

		// 3. 插入好友请求记录
		_, err = db.Exec(
			"INSERT INTO friendships (requester_id, addressee_id, status) VALUES (?, ?, 'pending')",
			senderID, receiverID,
		)

		if err != nil {
			log.Printf("创建好友请求错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "创建好友请求失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "好友请求已发送"})
	}
}

// RespondToFriendRequestHandler 响应好友请求
func RespondToFriendRequestHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		requestIDStr := c.Param("requestId")
		requestID, err := strconv.ParseInt(requestIDStr, 10, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求ID"})
			return
		}

		// 获取请求体
		var response struct {
			Accept    bool   `json:"accept"`    // true接受，false拒绝
			Username  string `json:"username"`  // 当前用户（接收者）
		}

		if err := c.ShouldBindJSON(&response); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求数据"})
			return
		}

		// 1. 验证请求的有效性（确保请求存在且状态为pending）
		var addresseeID int
		var currentStatus string
		err = db.QueryRow(
			"SELECT addressee_id, status FROM friendships WHERE id = ?",
			requestID,
		).Scan(&addresseeID, &currentStatus)

		if err != nil {
			if err == sql.ErrNoRows {
				c.JSON(http.StatusNotFound, gin.H{"error": "好友请求不存在"})
			} else {
				log.Printf("查询好友请求错误: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询失败"})
			}
			return
		}

		// 验证当前状态为pending
		if currentStatus != "pending" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "该请求已被处理"})
			return
		}

		// 2. 验证当前用户是请求的接收者
		var userID int
		err = db.QueryRow("SELECT id FROM user WHERE username = ?", response.Username).Scan(&userID)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "无效的用户"})
			return
		}

		if userID != addresseeID {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "无权处理此请求"})
			return
		}

		// 3. 处理请求
		if response.Accept {
			// 接受请求，将状态更新为accepted
			_, err = db.Exec(
				"UPDATE friendships SET status = 'accepted' WHERE id = ?",
				requestID,
			)
			if err != nil {
				log.Printf("更新好友请求状态错误: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "处理好友请求失败"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "已接受好友请求"})
		} else {
			// 拒绝请求，删除该请求记录
			_, err = db.Exec("DELETE FROM friendships WHERE id = ?", requestID)
			if err != nil {
				log.Printf("删除好友请求错误: %v", err)
				c.JSON(http.StatusInternalServerError, gin.H{"error": "处理好友请求失败"})
				return
			}
			c.JSON(http.StatusOK, gin.H{"message": "已拒绝好友请求"})
		}
	}
}

// GetFriendRequestCountHandler 获取未处理的好友请求数量
func GetFriendRequestCountHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		username := c.Query("username")
		if username == "" {
			c.JSON(http.StatusBadRequest, gin.H{"error": "缺少用户名参数"})
			return
		}

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

		var count int
		err = db.QueryRow(
			"SELECT COUNT(*) FROM friendships WHERE addressee_id = ? AND status = 'pending'",
			userID,
		).Scan(&count)

		if err != nil {
			log.Printf("查询好友请求数量错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "数据库查询失败"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"count": count})
	}
}

// DeleteFriendHandler 删除好友关系
func DeleteFriendHandler(db *sql.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 获取请求体
		var request struct {
			Username       string `json:"username"`       // 当前用户
			FriendUsername string `json:"friendUsername"` // 要删除的好友
		}

		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "无效的请求数据"})
			return
		}

		// 1. 获取两个用户的ID
		var userID, friendID int
		err := db.QueryRow("SELECT id FROM user WHERE username = ?", request.Username).Scan(&userID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "用户不存在"})
			return
		}

		err = db.QueryRow("SELECT id FROM user WHERE username = ?", request.FriendUsername).Scan(&friendID)
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "好友用户不存在"})
			return
		}

		// 2. 删除好友关系（无论谁是请求者，谁是接收者）
		result, err := db.Exec(
			"DELETE FROM friendships WHERE (requester_id = ? AND addressee_id = ?) OR (requester_id = ? AND addressee_id = ?)",
			userID, friendID, friendID, userID,
		)

		if err != nil {
			log.Printf("删除好友关系错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "删除好友关系失败"})
			return
		}

		// 检查是否有行被删除（即是否真的存在好友关系）
		rowsAffected, err := result.RowsAffected()
		if err != nil {
			log.Printf("获取影响行数错误: %v", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "删除好友关系失败"})
			return
		}

		if rowsAffected == 0 {
			c.JSON(http.StatusNotFound, gin.H{"error": "未找到好友关系"})
			return
		}

		c.JSON(http.StatusOK, gin.H{"message": "好友关系已删除"})
	}
} 
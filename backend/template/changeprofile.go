package template // 或者你的实际包名

import (
	"database/sql" // 假设使用标准库的错误类型
	"errors"
	"log"
	"net/http"
	"regexp"
	"strings"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	// 导入你的数据库包和用户模型
	// "your_project/database"
	// "your_project/models"
)

// --- 占位符数据类型 (用你实际的类型替换) ---

type User struct {
	ID           uint
	Username     string
	Email        string
	PasswordHash string
}

// --- 占位符数据库函数 (根据你的数据库实现) ---

// GetUserByID 通过 ID 获取用户
func GetUserByID(userID uint) (*User, error) {
	// TODO: 实现数据库逻辑以通过 ID 获取用户
	// 模拟:
	if userID == 1 {
		// 确保这里的 PasswordHash 是一个真实的 bcrypt 哈希值，否则 CompareHashAndPassword 会失败
		hashedPassword, _ := bcrypt.GenerateFromPassword([]byte("current_password_plain"), bcrypt.DefaultCost) // 仅为示例，实际从数据库读取
		return &User{
			ID:           1,
			Username:     "current_user",
			Email:        "current@example.com",
			PasswordHash: string(hashedPassword), // 从数据库获取的真实哈希
		}, nil
	}
	return nil, sql.ErrNoRows // 模拟用户未找到
}

func GetUserProfile(c *gin.Context) {
	// 1. 从认证中间件获取用户 ID
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户未认证"})
		return
	}
	userID, ok := userIDVal.(uint)
	if !ok {
		log.Printf("无效的用户 ID 类型在上下文中: %T", userIDVal)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "服务器内部错误：无法识别用户"})
		return
	}

	// 2. 从数据库获取用户信息
	user, err := GetUserByID(userID) // 使用你已有的函数
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "未找到用户"})
		} else {
			log.Printf("获取用户 %d 失败: %v", userID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户信息时出错"})
		}
		return
	}

	// 3. 返回需要的用户信息 (不包括密码哈希)
	c.JSON(http.StatusOK, gin.H{
		"username": user.Username,
		"email":    user.Email,
		// 你可以根据需要添加其他允许前端查看的字段
	})
}

// GetUserByUsernameOrEmailExcludingID 检查用户名或邮箱是否被其他用户占用
func GetUserByUsernameOrEmailExcludingID(username, email string, currentUserID uint) (*User, error) {
	// TODO: 实现数据库逻辑，查找用户名或邮箱匹配但 ID 不是 currentUserID 的用户
	// Example: SELECT id, username, email FROM users WHERE (username = ? OR email = ?) AND id != ? LIMIT 1
	if username == "existing_user" && currentUserID != 2 {
		return &User{ID: 2, Username: "existing_user"}, nil // 模拟用户名冲突
	}
	if email == "existing@example.com" && currentUserID != 3 {
		return &User{ID: 3, Email: "existing@example.com"}, nil // 模拟邮箱冲突
	}
	return nil, sql.ErrNoRows // 模拟用户名/邮箱可用
}

// UpdateUserProfile 更新用户的特定字段
func UpdateUserProfile(userID uint, updates map[string]interface{}) error {
	// TODO: 实现数据库逻辑来更新用户字段
	// Example: 构建 UPDATE 查询语句，只更新 'updates' map 中存在的字段
	// 注意防范 SQL 注入，使用 ORM 或预处理语句
	if len(updates) == 0 {
		return nil // 没有需要更新的内容
	}
	log.Printf("模拟更新用户 %d 的数据: %v", userID, updates)
	// return errors.New("database update failed") // 模拟错误
	return nil // 模拟成功
}

func checkPasswordHash(password, hash string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hash), []byte(password))
	if err != nil && !errors.Is(err, bcrypt.ErrMismatchedHashAndPassword) {
		// 记录非密码不匹配的 bcrypt 错误（例如哈希格式错误）
		log.Printf("检查密码哈希时出错: %v", err)
	}
	return err == nil // 只有在完全匹配时才返回 true
}

// --- 请求体结构 ---

type UpdateProfileRequest struct {
	CurrentPassword string `json:"currentPassword" binding:"required"`
	NewUsername     string `json:"newUsername"` // 可选
	NewEmail        string `json:"newEmail"`    // 可选
	NewPassword     string `json:"newPassword"` // 可选
}

// --- 辅助函数：校验邮箱格式 ---
var emailRegex = regexp.MustCompile(`^[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,4}$`)

func isValidEmail(email string) bool {
	return emailRegex.MatchString(email)
}

// --- Gin 处理函数: ChangeProfile ---

func ChangeProfile(c *gin.Context) {
	// 1. 从认证中间件获取用户 ID
	userIDVal, exists := c.Get("userID") // 假设中间件设置了 "userID"
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户未认证"})
		return
	}
	userID, ok := userIDVal.(uint) // 根据你的用户 ID 类型调整
	if !ok {
		log.Printf("无效的用户 ID 类型在上下文中: %T", userIDVal)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "服务器内部错误：无法识别用户"})
		return
	}

	// 2. 绑定 JSON 请求体
	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		// Gin 的 binding:"required" 会处理 currentPassword 为空的情况
		c.JSON(http.StatusBadRequest, gin.H{"error": "请求数据无效: " + err.Error()})
		return
	}

	// 清理和初步校验输入
	req.NewUsername = strings.TrimSpace(req.NewUsername)
	req.NewEmail = strings.TrimSpace(strings.ToLower(req.NewEmail)) // 邮箱通常不区分大小写

	// 3. 从数据库获取当前用户信息
	currentUser, err := GetUserByID(userID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			c.JSON(http.StatusNotFound, gin.H{"error": "未找到当前用户"})
		} else {
			log.Printf("获取用户 %d 失败: %v", userID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "获取用户信息时出错"})
		}
		return
	}

	// 4. 验证当前密码
	if !checkPasswordHash(req.CurrentPassword, currentUser.PasswordHash) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "当前密码不正确"})
		return
	}

	// 5. 准备需要更新的字段
	updates := make(map[string]interface{})
	needsUpdate := false
	updatedFields := []string{} // 用于成功消息

	// 6. 处理新用户名
	if req.NewUsername != "" && req.NewUsername != currentUser.Username {
		// 可选：添加用户名格式/长度校验
		// if len(req.NewUsername) < 3 { ... }

		// 检查新用户名是否被其他用户占用
		existingUser, err := GetUserByUsernameOrEmailExcludingID(req.NewUsername, "", currentUser.ID)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			log.Printf("检查用户名 %s 时出错: %v", req.NewUsername, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "验证新用户名时出错"})
			return
		}
		if existingUser != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "该用户名已被占用"})
			return
		}
		updates["username"] = req.NewUsername
		needsUpdate = true
		updatedFields = append(updatedFields, "用户名")
	}

	// 7. 处理新邮箱
	if req.NewEmail != "" && req.NewEmail != currentUser.Email {
		// 校验邮箱格式
		if !isValidEmail(req.NewEmail) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "新邮箱格式无效"})
			return
		}

		// 检查新邮箱是否被其他用户占用
		existingUser, err := GetUserByUsernameOrEmailExcludingID("", req.NewEmail, currentUser.ID)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			log.Printf("检查邮箱 %s 时出错: %v", req.NewEmail, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "验证新邮箱时出错"})
			return
		}
		if existingUser != nil {
			c.JSON(http.StatusConflict, gin.H{"error": "该邮箱已被占用"})
			return
		}
		updates["email"] = req.NewEmail
		needsUpdate = true
		updatedFields = append(updatedFields, "邮箱")
	}

	// 8. 处理新密码
	if req.NewPassword != "" {
		newPasswordHash, err := hashPassword(req.NewPassword) // hashPassword 内部应包含长度校验
		if err != nil {
			// 如果 hashPassword 返回特定错误信息（如长度不足）
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			return
		}
		// 确保新密码与旧密码不同（可选逻辑）
		if checkPasswordHash(req.NewPassword, currentUser.PasswordHash) {
			c.JSON(http.StatusBadRequest, gin.H{"error": "新密码不能与当前密码相同"})
			return
		}

		updates["password_hash"] = newPasswordHash // 数据库字段名可能不同
		needsUpdate = true
		updatedFields = append(updatedFields, "密码")
	}

	// 9. 如果没有任何更改请求，则提前返回
	if !needsUpdate && req.NewUsername == "" && req.NewEmail == "" && req.NewPassword == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "请提供需要修改的用户名、邮箱或新密码"})
		return
	}

	// 10. 执行数据库更新
	if needsUpdate {
		err = UpdateUserProfile(currentUser.ID, updates)
		if err != nil {
			log.Printf("更新用户 %d 失败: %v", currentUser.ID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "更新个人资料时发生错误"})
			return
		}
	}

	// 11. 返回成功响应
	successMsg := "个人资料更新成功！"
	if len(updatedFields) > 0 {
		successMsg = strings.Join(updatedFields, "、") + " 已成功更新！"
	}

	// 准备返回给前端的数据（可选，取决于前端是否需要更新后的完整信息）
	responseData := gin.H{
		"message": successMsg,
	}
	if newUsername, ok := updates["username"]; ok {
		responseData["newUsername"] = newUsername
	}
	if newEmail, ok := updates["email"]; ok {
		responseData["newEmail"] = newEmail
	}

	c.JSON(http.StatusOK, responseData)
}

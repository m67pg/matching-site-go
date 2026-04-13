package controllers

import (
	"fmt"
	"net/http"
	"path/filepath"
	"time"

	"matching-site-backend/database"
	"matching-site-backend/internal/messages"
	"matching-site-backend/models"

	"github.com/gin-gonic/gin"
)

func GetUsers(c *gin.Context) {
	currentUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": messages.MsgUnauthorized})
		return
	}
	uid := currentUserID.(uint)

	usernameQuery := c.Query("username")

	// サブクエリ① 自分が既に「いいね」を送った相手のID
	likedSubQuery := database.DB.
		Model(&models.Like{}).
		Select("receiver_id").
		Where("sender_id = ?", uid)

	// サブクエリ② 相互「いいね」済み（マッチング成立）の相手のID
	// 自分がいいねを送り、かつ相手からもいいねをもらっている
	matchedSubQuery := database.DB.
		Model(&models.Like{}).
		Select("receiver_id").
		Where("sender_id = ? AND receiver_id IN (?)",
			uid,
			database.DB.Model(&models.Like{}).Select("sender_id").Where("receiver_id = ?", uid),
		)

	var users []models.User
	query := database.DB.
		Where("id != ?", uid).
		Where("is_admin = ?", false).
		// いいね済みユーザーを除外
		Where("id NOT IN (?)", likedSubQuery).
		// マッチング済みユーザーも念のため除外（likedSubQueryと重複するが明示的に）
		Where("id NOT IN (?)", matchedSubQuery)

	if usernameQuery != "" {
		query = query.Where("username LIKE ?", "%"+usernameQuery+"%")
	}

	// 除外後にSELECT・Findを実行（件数はフィルタ後で確定）
	if err := query.
		Select("id, username, email, profile_image, bio, age, location, hobbies, is_admin").
		Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": messages.MsgFailedToFetchUsers})
		return
	}

	c.JSON(http.StatusOK, gin.H{"users": users})
}

func GetMe(c *gin.Context) {
	currentUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": messages.MsgUnauthorized})
		return
	}

	var user models.User
	if err := database.DB.Select("id, username, email, profile_image, bio, age, location, hobbies, is_admin").First(&user, currentUserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": messages.MsgUserNotFound})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":            user.ID,
			"username":      user.Username,
			"email":         user.Email,
			"profile_image": user.ProfileImage,
			"bio":           user.Bio,
			"age":           user.Age,
			"location":      user.Location,
			"hobbies":       user.Hobbies,
			"is_admin":      user.IsAdmin,
		},
	})
}

func UploadAvatar(c *gin.Context) {
	currentUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": messages.MsgUnauthorized})
		return
	}
	userID := currentUserID.(uint)

	file, err := c.FormFile("avatar")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": messages.MsgInvalidInput})
		return
	}

	ext := filepath.Ext(file.Filename)
	newFilename := fmt.Sprintf("%d_%d%s", userID, time.Now().Unix(), ext)
	uploadPath := filepath.Join("uploads", newFilename)

	if err := c.SaveUploadedFile(file, uploadPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": messages.MsgInternalError})
		return
	}

	avatarUrl := "http://localhost:8080/uploads/" + newFilename

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": messages.MsgUserNotFound})
		return
	}

	user.ProfileImage = avatarUrl
	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update profile image"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "画像が更新されました", "avatar_url": user.ProfileImage})
}

func GetUser(c *gin.Context) {
	id := c.Param("id")
	var user models.User
	if err := database.DB.Select("id, username, profile_image, location").First(&user, id).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": messages.MsgUserNotFound})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":            user.ID,
			"username":      user.Username,
			"profile_image": user.ProfileImage,
			"location":      user.Location,
		},
	})
}


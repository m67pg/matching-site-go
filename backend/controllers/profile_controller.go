package controllers

import (
	"net/http"

	"matching-site-backend/database"
	"matching-site-backend/internal/messages"
	"matching-site-backend/models"

	"github.com/gin-gonic/gin"
)

func UpdateProfile(c *gin.Context) {
	currentUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": messages.MsgUnauthorized})
		return
	}

	var req struct {
		Username string `json:"username"`
		Bio      string `json:"bio"`
		Age      int    `json:"age"`
		Location string `json:"location"`
		Hobbies  string `json:"hobbies"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": messages.MsgInvalidInput})
		return
	}

	var user models.User
	if err := database.DB.First(&user, currentUserID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": messages.MsgUserNotFound})
		return
	}

	if req.Username != "" {
		user.Username = req.Username
	}
	user.Bio = req.Bio
	user.Age = req.Age
	user.Location = req.Location
	user.Hobbies = req.Hobbies

	if err := database.DB.Save(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": messages.MsgFailedToUpdateProfile})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "プロフィールを更新しました",
		"user": gin.H{
			"id":       user.ID,
			"username": user.Username,
			"bio":      user.Bio,
			"age":      user.Age,
			"location": user.Location,
			"hobbies":  user.Hobbies,
		},
	})
}

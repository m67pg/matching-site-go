package controllers

import (
	"net/http"

	"matching-site-backend/database"
	"matching-site-backend/internal/messages"
	"matching-site-backend/models"

	"github.com/gin-gonic/gin"
)

func GetAdminStats(c *gin.Context) {
	var userCount int64
	var messageCount int64
	var likeCount int64

	database.DB.Model(&models.User{}).Count(&userCount)
	database.DB.Model(&models.Message{}).Count(&messageCount)
	database.DB.Model(&models.Like{}).Count(&likeCount)

	c.JSON(http.StatusOK, gin.H{
		"users":    userCount,
		"messages": messageCount,
		"likes":    likeCount,
	})
}

func GetAdminUsers(c *gin.Context) {
	var users []models.User
	if err := database.DB.Select("id, username, email, is_admin, created_at").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": messages.MsgFailedToFetchUsers})
		return
	}
	c.JSON(http.StatusOK, gin.H{"users": users})
}

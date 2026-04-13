package middleware

import (
	"net/http"

	"matching-site-backend/database"
	"matching-site-backend/internal/messages"
	"matching-site-backend/models"

	"github.com/gin-gonic/gin"
)

func AdminMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		currentUserID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{"error": messages.MsgUnauthorized})
			c.Abort()
			return
		}

		var user models.User
		if err := database.DB.Select("is_admin").First(&user, currentUserID).Error; err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": messages.MsgUserNotFound})
			c.Abort()
			return
		}

		if !user.IsAdmin {
			c.JSON(http.StatusForbidden, gin.H{"error": messages.MsgRequireAdmin})
			c.Abort()
			return
		}

		c.Next()
	}
}

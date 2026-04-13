package controllers

import (
	"net/http"
	"strconv"

	"matching-site-backend/database"
	"matching-site-backend/internal/messages"
	"matching-site-backend/models"

	"github.com/gin-gonic/gin"
)

func LikeUser(c *gin.Context) {
	currentUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": messages.MsgUnauthorized})
		return
	}
	senderID := currentUserID.(uint)

	receiverIDStr := c.Param("id")
	receiverID, err := strconv.ParseUint(receiverIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": messages.MsgInvalidUserId})
		return
	}

	if senderID == uint(receiverID) {
		c.JSON(http.StatusBadRequest, gin.H{"error": messages.MsgCannotLikeSelf})
		return
	}

	// 既にいいね済みかチェック
	var existingLike models.Like
	if err := database.DB.Where("sender_id = ? AND receiver_id = ?", senderID, receiverID).First(&existingLike).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": messages.MsgAlreadyLiked})
		return
	}

	newLike := models.Like{
		SenderID:   senderID,
		ReceiverID: uint(receiverID),
	}
	if err := database.DB.Create(&newLike).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": messages.MsgFailedToLike})
		return
	}

	var reverseLike models.Like
	matched := false
	if err := database.DB.Where("sender_id = ? AND receiver_id = ?", receiverID, senderID).First(&reverseLike).Error; err == nil {
		matched = true
	}

	c.JSON(http.StatusOK, gin.H{"success": true, "matched": matched})
}

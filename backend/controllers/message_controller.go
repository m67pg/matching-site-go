package controllers

import (
	"log"
	"net/http"
	"strconv"

	"matching-site-backend/database"
	msgpkg "matching-site-backend/internal/messages"
	"matching-site-backend/internal/ws"
	"matching-site-backend/models"

	"github.com/gin-gonic/gin"
)

var GlobalHub *ws.Hub

func GetMessages(c *gin.Context) {
	currentUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": msgpkg.MsgUnauthorized})
		return
	}
	userID := currentUserID.(uint)

	partnerIDStr := c.Param("userId")
	partnerID, err := strconv.ParseUint(partnerIDStr, 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": msgpkg.MsgInvalidUserId})
		return
	}

	var messages []models.Message
	if err := database.DB.Where("(sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)",
		userID, partnerID, partnerID, userID).Order("created_at asc").Find(&messages).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": msgpkg.MsgFailedToFetchMessages})
		return
	}

	c.JSON(http.StatusOK, gin.H{"messages": messages})
}

func SendMessage(c *gin.Context) {
	currentUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": msgpkg.MsgUnauthorized})
		return
	}
	senderID := currentUserID.(uint)

	var req struct {
		ReceiverID uint   `json:"receiverId"`
		Content    string `json:"content"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": msgpkg.MsgInvalidInput})
		return
	}

	if req.Content == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": msgpkg.MsgEmptyMessage})
		return
	}

	msg := models.Message{
		SenderID:   senderID,
		ReceiverID: req.ReceiverID,
		Content:    req.Content,
	}

	if err := database.DB.Create(&msg).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": msgpkg.MsgFailedToSendMsg})
		return
	}

	// WebSocket で受信者にリアルタイム通知
	if GlobalHub != nil {
		log.Printf("[WS] SendMessage: SenderID=%d, ReceiverID=%d", senderID, req.ReceiverID)

		notification := map[string]interface{}{
			"type":    "new_message",
			"message": msg,
		}

		// 受信者のみに通知（送信者は API レスポンスで即時反映済みのため不要）
		GlobalHub.SendToUser(req.ReceiverID, notification, senderID)
	} else {
		log.Printf("[WS] ERROR: GlobalHub is nil")
	}

	c.JSON(http.StatusOK, gin.H{"message": msg})
}

func GetChatPartners(c *gin.Context) {
	currentUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": msgpkg.MsgUnauthorized})
		return
	}
	userID := currentUserID.(uint)

	type ChatPartner struct {
		ID            uint   `json:"id"`
		Username      string `json:"username"`
		ProfileImage  string `json:"profile_image"`
		Location      string `json:"location"`
		LatestMessage string `json:"latest_message"`
	}

	var partners []ChatPartner

	// 相互に「いいね」している（マッチング済み）ユーザーを取得し、
	// さらに最新のメッセージがあればその内容も取得するクエリ
	query := `
		SELECT 
			u.id, 
			u.username, 
			u.profile_image, 
			u.location,
			m.content as latest_message
		FROM users u
		INNER JOIN likes l1 ON l1.sender_id = ? AND l1.receiver_id = u.id
		INNER JOIN likes l2 ON l2.sender_id = u.id AND l2.receiver_id = ?
		LEFT JOIN (
			SELECT 
				CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as partner_id,
				content,
				created_at,
				ROW_NUMBER() OVER(PARTITION BY CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END ORDER BY created_at DESC) as rn
			FROM messages
			WHERE sender_id = ? OR receiver_id = ?
		) m ON u.id = m.partner_id AND m.rn = 1
		ORDER BY COALESCE(m.created_at, l1.created_at) DESC
	`

	if err := database.DB.Raw(query, userID, userID, userID, userID, userID, userID).Scan(&partners).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": msgpkg.MsgFailedToFetchMessages})
		return
	}

	c.JSON(http.StatusOK, gin.H{"partners": partners})
}

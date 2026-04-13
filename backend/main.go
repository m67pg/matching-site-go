package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"slices"
	"syscall"
	"time"

	"matching-site-backend/controllers"
	"matching-site-backend/database"
	"matching-site-backend/internal/messages"
	"matching-site-backend/internal/ws"
	"matching-site-backend/middleware"
	"matching-site-backend/models"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/gorilla/websocket"
	"golang.org/x/crypto/bcrypt"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true // 開発用にすべて許可
	},
}

func main() {
	// DB初期化とシーダーの実行
	database.InitDB()
	// --reseed フラグが指定された場合、全テーブルを Truncate して再投入する
	forceReseed := slices.Contains(os.Args[1:], "--reseed")
	database.RunSeeder(forceReseed)

	// WebSocket Hub の初期化と実行
	hub := ws.NewHub()
	go hub.Run()
	controllers.GlobalHub = hub // コントローラーから参照できるようにグローバルにセット

	r := gin.Default()

	// 簡単なCORS設定
	r.Use(func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, DELETE, PATCH")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	r.Static("/uploads", "./uploads")

	api := r.Group("/api")
	{
		// 本実装されたログインエンドポイント
		api.POST("/login", func(c *gin.Context) {
			var req struct {
				Email    string `json:"email"`
				Password string `json:"password"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": messages.MsgInvalidInput})
				return
			}

			var user models.User
			if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"error": messages.MsgLoginFailed})
				return
			}

			if err := bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(req.Password)); err != nil {
				c.JSON(http.StatusUnauthorized, gin.H{"error": messages.MsgLoginFailed})
				return
			}

			// JWT発行
			token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
				"user_id": user.ID,
				"exp":     time.Now().Add(time.Hour * 72).Unix(),
			})

			tokenString, err := token.SignedString(middleware.JwtSecret)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": messages.MsgInternalError})
				return
			}

			c.JSON(http.StatusOK, gin.H{
				"message": "Login successful",
				"token":   tokenString,
				"user": gin.H{
					"id":       user.ID,
					"username": user.Username,
					"email":    user.Email,
				},
			})
		})

		// ログイン済みユーザーがアクセス可能なエンドポイント群
		protected := api.Group("/")
		protected.Use(middleware.AuthMiddleware())
		{
			protected.GET("/me", controllers.GetMe)
			protected.GET("/users", controllers.GetUsers)
			protected.GET("/users/:id", controllers.GetUser)
			protected.POST("/like/:id", controllers.LikeUser)
			protected.GET("/chat-partners", controllers.GetChatPartners)
			protected.GET("/messages/:userId", controllers.GetMessages)
			protected.POST("/messages", controllers.SendMessage)
			protected.PATCH("/profile", controllers.UpdateProfile)
			protected.POST("/upload-avatar", controllers.UploadAvatar)
		}

		// WebSocket エンドポイント
		api.GET("/ws", func(c *gin.Context) {
			log.Printf("[DEBUG] WS: Connection request on /api/ws")
			tokenString := c.Query("token")
			if tokenString == "" {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Token is required"})
				return
			}

			// トークンの検証
			token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
				return middleware.JwtSecret, nil
			})

			if err != nil || !token.Valid {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid claims"})
				return
			}

			userID := uint(claims["user_id"].(float64))
			log.Printf("[DEBUG] WS: Authenticated UserID=%d. Upgrading to WebSocket...", userID)

			// WebSocket へのアップグレード
			conn, err := upgrader.Upgrade(c.Writer, c.Request, nil)
			if err != nil {
				log.Printf("WS Upgrade Error: %v", err)
				return
			}

			client := &ws.Client{
				UserID: userID,
				Conn:   conn,
				Send:   make(chan []byte, 256),
			}

			hub.Register <- client

			go client.WritePump()
			go client.ReadPump(hub)
		})
	}

	// --- Graceful Shutdown ---
	srv := &http.Server{
		Addr:    ":8080",
		Handler: r,
	}

	// シグナル受信チャネル
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)

	// サーバーをゴルーチンで起動
	go func() {
		log.Println("[SERVER] :8080 でサーバーを起動しました")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("[SERVER] 起動エラー: %v", err)
		}
	}()

	// シグナルを待機
	sig := <-quit
	log.Printf("[SERVER] シャットダウンシグナル受信: %v", sig)

	// 最大10秒のグレースフルシャットダウン
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// WebSocket 接続を先にクローズ
	hub.Shutdown()

	// HTTP サーバーをシャットダウン
	if err := srv.Shutdown(ctx); err != nil {
		log.Printf("[SERVER] シャットダウン中にエラーが発生しました: %v", err)
	}
	log.Println("[SERVER] サーバーが正常に停止しました")
}

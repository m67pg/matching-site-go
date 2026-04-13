package ws

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// クライアントからの次のポングを待つ最大時間
	pongWait = 60 * time.Second
	// クライアントにピングを送る周期
	pingPeriod = (pongWait * 9) / 10
	// メッセージの最大サイズ
	maxMessageSize = 512
)

// Client は WebSocket 接続を保持する構造体
type Client struct {
	UserID uint
	Conn   *websocket.Conn
	Send   chan []byte
}

// Hub はすべてのクライアントとメッセージのルーティングを管理
type Hub struct {
	// ユーザーIDからクライアントへのマップ（1人のユーザーが複数デバイスで接続することもあり得る）
	Clients map[uint][]*Client
	// クライアント登録用チャネル
	Register chan *Client
	// クライアント登録解除用チャネル
	Unregister chan *Client
	// 排他制御用
	mu sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		Clients:    make(map[uint][]*Client),
		Register:   make(chan *Client),
		Unregister: make(chan *Client),
	}
}

func (h *Hub) Run() {
	for {
		select {
		case client := <-h.Register:
			h.mu.Lock()
			h.Clients[client.UserID] = append(h.Clients[client.UserID], client)
			h.mu.Unlock()
			log.Printf("[DEBUG] WS Hub: Registered UserID=%d. Total connections for user: %d", client.UserID, len(h.Clients[client.UserID]))

		case client := <-h.Unregister:
			h.mu.Lock()
			if clients, ok := h.Clients[client.UserID]; ok {
				for i, c := range clients {
					if c == client {
						h.Clients[client.UserID] = append(clients[:i], clients[i+1:]...)
						break
					}
				}
				if len(h.Clients[client.UserID]) == 0 {
					delete(h.Clients, client.UserID)
				}
				close(client.Send)
			}
			h.mu.Unlock()
			log.Printf("[DEBUG] WS Hub: Unregistered UserID=%d", client.UserID)
		}
	}
}

// SendToUser は特定のユーザーにデータを送信する
// senderID は「誰から送られたか」をログに記録するためだけに使用する（0を渡せばスキップ）
func (h *Hub) SendToUser(userID uint, data interface{}, senderID uint) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	payload, err := json.Marshal(data)
	if err != nil {
		log.Printf("[WS] Hub Error: JSON marshal error: %v", err)
		return
	}

	clients, ok := h.Clients[userID]
	if !ok || len(clients) == 0 {
		if senderID > 0 {
			log.Printf("[WS] Hub: User %d -> User %d: 宛先はオフラインのためスキップ", senderID, userID)
		} else {
			log.Printf("[WS] Hub: No active connections for UserID=%d", userID)
		}
		return
	}

	if senderID > 0 {
		log.Printf("[WS] Hub: User %d -> User %d (%d接続)", senderID, userID, len(clients))
	} else {
		log.Printf("[WS] Hub: Delivering to UserID=%d (%d接続)", userID, len(clients))
	}

	for _, client := range clients {
		select {
		case client.Send <- payload:
			// 送信成功
		default:
			log.Printf("[WS] Hub Warning: 送信バッファが満杯 UserID=%d", userID)
		}
	}
}

// Shutdown は接続中のすべての WebSocket クライアントを安全に切断する
func (h *Hub) Shutdown() {
	h.mu.Lock()
	defer h.mu.Unlock()
	log.Println("[WS] Hub: シャットダウン開始 - すべてのクライアントを切断します")
	for userID, clients := range h.Clients {
		for _, c := range clients {
			_ = c.Conn.WriteMessage(websocket.CloseMessage,
				websocket.FormatCloseMessage(websocket.CloseNormalClosure, "サーバーが停止しました"))
			c.Conn.Close()
			close(c.Send)
		}
		delete(h.Clients, userID)
		log.Printf("[WS] Hub: UserID=%d の接続を切断しました", userID)
	}
	log.Println("[WS] Hub: シャットダウン完了")
}

// ReadPump はクライアントからの受信を待ち受ける
func (c *Client) ReadPump(h *Hub) {
	defer func() {
		h.Unregister <- c
		c.Conn.Close()
	}()

	c.Conn.SetReadLimit(maxMessageSize)
	c.Conn.SetReadDeadline(time.Now().Add(pongWait))
	c.Conn.SetPongHandler(func(string) error {
		log.Printf("[WS] Pong received from UserID=%d, deadline extended", c.UserID)
		c.Conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, _, err := c.Conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("[WS] Read Error (UserID=%d): %v", c.UserID, err)
			}
			break
		}
	}
}

// WritePump はクライアントへの送信を待ち受ける
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.Conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.Send:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if !ok {
				// Hub がチャネルを閉じた場合
				c.Conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			err := c.Conn.WriteMessage(websocket.TextMessage, message)
			if err != nil {
				return
			}
		case <-ticker.C:
			c.Conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.Conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

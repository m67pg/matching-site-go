package models

import (
	"time"

	"gorm.io/gorm"
)

// User 構造体の定義
type User struct {
	gorm.Model
	Username     string `gorm:"unique;not null"`
	Email        string `gorm:"unique;not null"`
	Password     string `gorm:"not null"` // ハッシュ化用
	ProfileImage string
	Bio          string
	Age          int
	Location     string
	Hobbies      string
	IsAdmin      bool `gorm:"default:false"`
}

// Like マッチングに必要な Like モデル
// sender_id, receiver_id にはパフォーマンス向上のためインデックスを付与
type Like struct {
	gorm.Model
	SenderID   uint `gorm:"index:idx_likes_sender;index:idx_likes_sender_receiver,priority:1"`
	ReceiverID uint `gorm:"index:idx_likes_receiver;index:idx_likes_sender_receiver,priority:2"`
}

// Message マッチングに必要な Message モデルの雛形
type Message struct {
	ID         uint           `gorm:"primarykey" json:"id"`
	CreatedAt  time.Time      `json:"created_at"`
	UpdatedAt  time.Time      `json:"updated_at"`
	DeletedAt  gorm.DeletedAt `gorm:"index" json:"-"`
	SenderID   uint           `json:"SenderID"`
	ReceiverID uint           `json:"ReceiverID"`
	Content    string         `json:"Content"`
}

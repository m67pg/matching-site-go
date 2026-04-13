package database

import (
	"fmt"
	"log"

	"matching-site-backend/models"

	"golang.org/x/crypto/bcrypt"
)

// RunSeeder はマイグレーション＋インデックス作成＋初期データ投入を行います。
// forceReseed=true の場合、全テーブルを一度 Truncate してからデータを再投入します。
func RunSeeder(forceReseed ...bool) {
	if DB == nil {
		log.Fatal("Database is not initialized. Call InitDB first.")
	}

	// ─── マイグレーション ───────────────────────────────────────────────────────
	if err := DB.AutoMigrate(&models.User{}, &models.Like{}, &models.Message{}); err != nil {
		log.Fatalf("Failed to migrate database: %v", err)
	}

	// ─── likes テーブルのインデックスを明示的に確認・作成 ──────────────────────
	for _, q := range []string{
		"CREATE INDEX IF NOT EXISTS idx_likes_sender_id   ON likes(sender_id)",
		"CREATE INDEX IF NOT EXISTS idx_likes_receiver_id ON likes(receiver_id)",
	} {
		if err := DB.Exec(q).Error; err != nil {
			log.Printf("[DB] インデックス作成をスキップ（既存の可能性あり）: %v", err)
		} else {
			log.Printf("[DB] インデックス確認済み: %s", q)
		}
	}

	// ─── 再投入判定 ────────────────────────────────────────────────────────────
	force := len(forceReseed) > 0 && forceReseed[0]

	var count int64
	DB.Model(&models.User{}).Count(&count)

	if count > 0 && !force {
		fmt.Println("[Seeder] ユーザーが既に存在します。スキップします（再投入するには force=true を渡してください）。")
		return
	}

	if count > 0 && force {
		fmt.Println("[Seeder] 既存データを Truncate して再投入します...")
		// 外部キー制約を考慮し、依存テーブルを先に削除
		//DB.Exec("DELETE FROM messages")
		//DB.Exec("DELETE FROM likes")
		//DB.Exec("DELETE FROM users")
		DB.Exec("TRUNCATE TABLE messages RESTART IDENTITY CASCADE")
		DB.Exec("TRUNCATE TABLE likes RESTART IDENTITY CASCADE")
		DB.Exec("TRUNCATE TABLE users RESTART IDENTITY CASCADE")
		// SQLite のオートインクリメントをリセット
		DB.Exec("DELETE FROM sqlite_sequence WHERE name IN ('messages','likes','users')")
		fmt.Println("[Seeder] Truncate 完了。")
	}

	// ─── パスワードハッシュ化ヘルパー ─────────────────────────────────────────
	hashPassword := func(password string) string {
		bytes, err := bcrypt.GenerateFromPassword([]byte(password), 14)
		if err != nil {
			log.Fatal("Failed to hash password")
		}
		return string(bytes)
	}

	// ─── 管理者ユーザー ────────────────────────────────────────────────────────
	admin := models.User{
		Username: "admin",
		Email:    "admin@example.com",
		Password: hashPassword("admin123"),
		IsAdmin:  true,
		Age:      30,
		Location: "東京都",
		Hobbies:  "プログラミング,映画鑑賞",
		Bio:      "マッチングサイトの管理者です。お気軽にどうぞ！",
	}
	if err := DB.Create(&admin).Error; err != nil {
		log.Fatalf("[Seeder] 管理者の作成に失敗: %v", err)
	}
	fmt.Printf("[Seeder] 作成: %s (ID:%d)\n", admin.Username, admin.ID)

	// ─── ゲストユーザー（スライス＋ループで一括作成）─────────────────────────
	type guestSeed struct {
		username string
		email    string
		age      int
		location string
		hobbies  string
		bio      string
	}

	guestSeeds := []guestSeed{
		{
			username: "guest1",
			email:    "guest1@example.com",
			age:      25,
			location: "大阪府",
			hobbies:  "カフェ巡り,旅行",
			bio:      "旅行が大好きです。新しい場所を冒険するのが趣味です。",
		},
		{
			username: "guest2",
			email:    "guest2@example.com",
			age:      28,
			location: "福岡県",
			hobbies:  "読書,散歩",
			bio:      "読書三昧の毎日。おすすめ本があればぜひ教えてください！",
		},
		{
			username: "guest3",
			email:    "guest3@example.com",
			age:      22,
			location: "北海道",
			hobbies:  "料理,ハイキング",
			bio:      "週末はハイキングに行っています。自炊も得意です。",
		},
		{
			username: "guest4",
			email:    "guest4@example.com",
			age:      31,
			location: "愛知県",
			hobbies:  "音楽,映画鑑賞",
			bio:      "ライブ鑑賞が趣味。思い出に残る作品を語り合いましょう。",
		},
		{
			username: "guest5",
			email:    "guest5@example.com",
			age:      58,
			location: "兵庫県",
			hobbies:  "競馬予想",
			bio:      "毎週の競馬予想を語り合いましょう。",
		},
	}

	guests := make([]models.User, 0, len(guestSeeds))
	for _, seed := range guestSeeds {
		u := models.User{
			Username: seed.username,
			Email:    seed.email,
			Password: hashPassword("guest123"),
			IsAdmin:  false,
			Age:      seed.age,
			Location: seed.location,
			Hobbies:  seed.hobbies,
			Bio:      seed.bio,
		}
		if err := DB.Create(&u).Error; err != nil {
			log.Printf("[Seeder] %s の作成に失敗: %v\n", seed.username, err)
			continue
		}
		fmt.Printf("[Seeder] 作成: %s (ID:%d)\n", u.Username, u.ID)
		guests = append(guests, u)
	}

	if len(guests) < 4 {
		log.Printf("[Seeder] 警告: ゲストユーザーが %d 名しか作成できませんでした。", len(guests))
	}

	// ─── いいね（likes）の設定 ─────────────────────────────────────────────────
	// 相互いいね → マッチング成立
	//   admin  ↔ guest1
	//   guest1 ↔ guest2
	//   guest2 ↔ guest3
	// 片方向のみ（未マッチ）
	//   guest3 → guest4
	//   guest4 → admin
	likes := []models.Like{}
	if len(guests) >= 1 {
		likes = append(likes,
			models.Like{SenderID: admin.ID, ReceiverID: guests[0].ID},
			models.Like{SenderID: guests[0].ID, ReceiverID: admin.ID},
		)
	}
	if len(guests) >= 2 {
		likes = append(likes,
			models.Like{SenderID: guests[0].ID, ReceiverID: guests[1].ID},
			models.Like{SenderID: guests[1].ID, ReceiverID: guests[0].ID},
		)
	}
	if len(guests) >= 3 {
		likes = append(likes,
			models.Like{SenderID: guests[1].ID, ReceiverID: guests[2].ID},
			models.Like{SenderID: guests[2].ID, ReceiverID: guests[1].ID},
		)
	}
	if len(guests) >= 4 {
		// 片方向いいね（未マッチ）
		likes = append(likes,
			models.Like{SenderID: guests[2].ID, ReceiverID: guests[3].ID},
			models.Like{SenderID: guests[3].ID, ReceiverID: admin.ID},
		)
	}

	/*for i := range likes {
		if err := DB.Create(&likes[i]).Error; err != nil {
			log.Printf("[Seeder] like 作成失敗: %v", err)
		}
	}
	fmt.Printf("[Seeder] %d 件の likes を登録しました。\n", len(likes))*/

	// ─── 初期メッセージ ────────────────────────────────────────────────────────
	messages := []models.Message{}
	if len(guests) >= 1 {
		messages = append(messages,
			models.Message{SenderID: admin.ID, ReceiverID: guests[0].ID, Content: "こんにちは！マッチングありがとうございます。"},
			models.Message{SenderID: guests[0].ID, ReceiverID: admin.ID, Content: "こちらこそ、よろしくお願いします！"},
			models.Message{SenderID: admin.ID, ReceiverID: guests[0].ID, Content: "大阪はどんな感じですか？"},
		)
	}
	if len(guests) >= 2 {
		messages = append(messages,
			models.Message{SenderID: guests[0].ID, ReceiverID: guests[1].ID, Content: "はじめまして！よろしく。"},
			models.Message{SenderID: guests[1].ID, ReceiverID: guests[0].ID, Content: "よろしくお願いします😊"},
		)
	}
	if len(guests) >= 3 {
		messages = append(messages,
			models.Message{SenderID: guests[1].ID, ReceiverID: guests[2].ID, Content: "北海道に行ってみたいです！"},
			models.Message{SenderID: guests[2].ID, ReceiverID: guests[1].ID, Content: "ぜひ来てください🌸"},
		)
	}

	/*for i := range messages {
		if err := DB.Create(&messages[i]).Error; err != nil {
			log.Printf("[Seeder] message 作成失敗: %v", err)
		}
	}
	fmt.Printf("[Seeder] %d 件の messages を登録しました。\n", len(messages))*/

	fmt.Println("[Seeder] 初期データの投入が完了しました ✅")
}

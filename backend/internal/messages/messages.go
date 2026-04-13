package messages

const (
	MsgInvalidInput    = "入力内容が正しくありません"
	MsgUserNotFound    = "ユーザーが見つかりません"
	MsgUnauthorized    = "認証が必要です"
	MsgInternalError   = "サーバー内部でエラーが発生しました"
	MsgLoginFailed     = "メールアドレスまたはパスワードが正しくありません"
	// specific fetching & logic errors updated accordingly:
	MsgFailedToFetchUsers    = "ユーザー情報の取得に失敗しました"
	MsgFailedToFetchMessages = "メッセージの取得に失敗しました"
	MsgFailedToUpdateProfile = "プロフィールの更新に失敗しました"
	MsgFailedToSendMsg       = "メッセージの送信に失敗しました"
	MsgFailedToLike          = "いいねに失敗しました"
	
	MsgInvalidUserId      = "無効なユーザーIDです"
	MsgEmptyMessage       = "メッセージ内容は空にできません"
	MsgCannotLikeSelf     = "自分自身に「いいね」することはできません"
	MsgAlreadyLiked       = "すでに「いいね」しています"
	
	MsgRequireAdmin       = "管理者権限が必要です"
	MsgInvalidTokenFormat = "無効な認証フォーマットです"
	MsgInvalidOrExpired   = "無効または期限切れのトークンです"
	MsgInvalidClaims      = "無効なクレームです"
)

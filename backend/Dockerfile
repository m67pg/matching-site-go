# -----------------------------
# ステージ1: ビルド環境
# -----------------------------
FROM golang:1.23-alpine AS builder

# 必要なパッケージのインストール
RUN apk add --no-cache git tzdata

WORKDIR /app

# モジュールファイルのコピーと依存関係のダウンロード
COPY go.mod ./

# ソースコードのコピー
COPY . .
RUN go mod tidy && go mod download

# バイナリのビルド (CGO_ENABLED=0 によって静的リンクとする)
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-w -s" -o server main.go

# -----------------------------
# ステージ2: 本番用軽量イメージ
# -----------------------------
FROM alpine:3.20

# 証明書などのインストール
RUN apk add --no-cache ca-certificates tzdata

WORKDIR /app

# ビルドしたバイナリをビルダーからコピー
COPY --from=builder /app/server .

# Cloud Run が Listen するポートを環境変数 PORT で指定できるように設定
ENV PORT=8080

EXPOSE 8080

# アプリケーションの実行
CMD ["/app/server"]

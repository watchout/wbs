# 機能仕様

この文書は README から抽出した主な要件をまとめたものです。SRS のメモはリポジトリには存在しません。

## 機能一覧
- **リアルタイム更新**: Socket.IO を用いた 1 秒未満 P95 の部屋間同期。
- **Google カレンダー連携**: インクリメンタル同期と Webhook を用いた双方向同期。
- **オフラインキオスクモード**: IndexedDB キャッシュによって Wi-Fi がなくても 24 時間表示を維持する PWA。
- **多言語対応**: 日本語・英語・ベトナム語・簡体字中国語・フィリピノ語・ネパール語・ブラジルポルトガル語にローカライズ。
- **RBAC**: `ADMIN`、`MEMBER`、`DEVICE` の各ロール。OAuth2 と MagicLink 認証。
- **IaC**: Terraform による ConoHa VPS へのワンコマンドデプロイ。
- **自動 CI/CD**: GitHub Actions が Docker イメージをビルドし、Watchtower と SSH でデプロイ。
- **品質ゲート**:
  - 90% ラインカバレッジを目標とした Vitest ユニットテスト。
  - Chrome と Android WebView での Playwright E2E テスト。
  - 15 分間 200 RPS の k6 負荷テスト。
  - Lighthouse PWA スコア 80 以上。

## アーキテクチャ概要
ロードバランサが HTTPS/WSS トラフィックを複数の Nuxt アプリケーションコンテナへ振り分け、各コンテナは Prisma を通して共有の Postgres データベースに接続します。DB の WAL はオブジェクトストレージに保存されます。

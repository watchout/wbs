# 機能仕様書

このドキュメントは README に記載された要件をまとめたものです。

- **リアルタイム同期**: WebSocket(Socket.IO) を用いたルーム単位の同期。P95 1 秒未満を目標とする。
- **Socket.IO イベント名**: `room:join`, `room:leave`, `room:update` を使用してルームの参加・退出・更新を扱う。
- **Google カレンダー連携**: インクリメンタル同期と Webhook を利用した双方向同期。
- **オフラインキオスク対応**: PWA + IndexedDB により 24 時間キャッシュし、WiFi がなくても表示を維持。
- **多言語インタフェース**: `ja`, `en`, `vi`, `zhHans`, `fil`, `ne`, `ptBR` をサポート。
- **RBAC**: `ADMIN`, `MEMBER`, `DEVICE` のロール。OAuth2 と MagicLink 認証を採用。
- **IaC**: ConoHa プロバイダの Terraform によりコマンド一つで VPS とロードバランサを構築。
- **CI/CD**: GitHub Actions が Docker イメージをビルドし、SSH でデプロイ。Watchtower によりコンテナ更新を管理。
- **システム構成**: ブラウザやキオスク端末は HTTPS/WSS 経由で Nginx のロードバランサへ接続。複数の Nuxt インスタンスが Prisma 経由で PostgreSQL と通信し、WAL はオブジェクトストレージへ保存。
- **開発手順**: リポジトリをクローンして依存をインストールし、`.env.sample` を `.env.local` にコピーして Google 認証情報を設定。`pnpm dev` で開発スタックを起動。必要なら Prisma Studio を開く。
- **前提条件**: Node 20、pnpm、Docker 24(Postgres/Redis 用)、Terraform 1.7(インフラ構築時)。
- **プロジェクトスクリプト**: `pnpm dev`、`pnpm build`、`pnpm lint`、`pnpm test`、`pnpm e2e`、`pnpm prisma:migrate`、`pnpm prisma:generate`、`pnpm prisma:studio`。
- **Docker(本番同等ローカル)**: `docker compose up --build` でマルチサービススタックを構築・起動。Nuxt は http://localhost:3000、Postgres は localhost:5432 に展開。
- **デプロイ手順**: `infra` ディレクトリで Terraform を実行し、`scripts/bootstrap_vps.sh` で VPS を初期化。その後 CI でコンテナイメージをビルドしてプッシュ。
- **環境変数**: 必須は `DATABASE_URL`、`GOOGLE_CLIENT_ID`、`GOOGLE_CLIENT_SECRET`、`JWT_SECRET`、`APP_BASE_URL`。詳細は `.env.sample` を参照。
- **品質ゲート**: Vitest による単体テスト(90% カバレッジ)、Playwright による E2E、200 rps・15 分間の k6 負荷テスト、Lighthouse PWA スコア 80。
- **貢献ルール**: フィーチャーブランチを作成して Conventional Commits で PR。`pnpm lint && pnpm test` が必須。`@watchout/core` メンバーによるレビュー後、マージで自動デプロイ。
- **ライセンス**: MIT (© 2025 watchout)。

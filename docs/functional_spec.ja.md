# 機能仕様書

この文書はREADMEから抽出した主要要件をまとめたものです。リポジトリには追加のSRSノートは存在しませんでした。

## 機能
- **リアルタイム更新**: Socket.IOによる部屋単位の同期でP95が1秒未満。
- **Googleカレンダー同期**: インクリメンタル同期とWebhookによる双方向連携。
- **オフラインキオスクモード**: IndexedDBを利用したPWAで、Wi‑Fiがなくても24時間表示を継続。
- **多言語対応**: 日本語、英語、ベトナム語、簡体字中国語、フィリピン語、ネパール語、ブラジルポルトガル語にローカライズ。
- **RBAC**: `ADMIN`、`MEMBER`、`DEVICE`の各ロール。OAuth2とMagicLink認証を使用。
- **IaC**: TerraformでConoHa VPSへワンコマンド展開。
- **自動CI/CD**: GitHub ActionsがDockerイメージをビルドし、Watchtower付きSSHデプロイを実施。
- **品質ゲート**:
  - Vitestによるユニットテスト（カバレッジ90%目標）。
  - ChromeとAndroid WebViewでのPlaywright E2Eテスト。
  - 15分間200RPSのk6負荷試験。
  - Lighthouse PWAスコア80以上。

## アーキテクチャ概要
ロードバランサがHTTPS/WSSトラフィックを複数のNuxtアプリコンテナへ振り分け、各コンテナはPrisma経由で共通のPostgresデータベースに接続します。データベースのWALはオブジェクトストレージに保存されます。

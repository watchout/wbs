# DevOps戦略

*English version: [devops.md](./devops.md)*

Whiteboard Signage System (WBS) は、サービスの展開と運用を再現可能かつ自動化されたアプローチで行います。主な要素は次の通りです。

## インフラのコード化

* **Terraform** がConoHa VPS環境を構築します。ロードバランサーやオブジェクトストレージも含まれており、`terraform apply` 一発でインフラが揃います。
* 初回セットアップ用のスクリプトで、DockerとWatchtowerをインストールします。

## コンテナ化とデプロイ

* アプリケーションおよび依存関係は Docker コンテナで動作します。`docker compose` により、ローカルでも本番に近い形でスタックを起動できます。
* GitHub Actions がDockerイメージをビルドしてSSH経由でデプロイします。Watchtowerがレジストリを監視し、新しいイメージが利用可能になるとコンテナを更新します。

## 継続的インテグレーション

* CIでは `pnpm lint`、Vitestによるユニットテスト、PlaywrightによるE2Eテストを実行し、コード品質を確保します。
* プルリクエストはすべてのチェックに合格しないとマージできません。マージ後はGitHub Actionsが自動でステージング環境へデプロイします。

## 環境管理

* サービスは `.env.sample` を基にした環境変数で設定します。データベースの認証情報、Google OAuth設定、JWTシークレット、`APP_BASE_URL` などを含みます。

## 品質ゲート

* ユニットテストはカバレッジ90%を目標にしています。
* Playwrightを用いたクロスブラウザE2Eテストを実施します。
* k6による負荷試験とLighthouseを用いたPWA監査でパフォーマンスとオフライン対応を確認します。

このDevOpsフローにより、開発から本番まで一貫した環境で信頼性の高いデプロイが実現できます。

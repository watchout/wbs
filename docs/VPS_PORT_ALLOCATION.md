# VPS ポート割り当て表

> VPS: ConoHa 160.251.209.16 (4vCPU / 4GB RAM / 100GB SSD / Ubuntu 22.04)
> 更新日: 2026-02-12

---

## 外部公開ポート（Nginx 経由）

| ポート | プロトコル | 用途 |
|--------|-----------|------|
| 22 | SSH | リモートアクセス |
| 80 | HTTP | Nginx（HTTPS リダイレクト / certbot） |
| 443 | HTTPS | Nginx（リバースプロキシ） |
| 110 | POP3 | メール |
| 143 | IMAP | メール |
| 993 | IMAPS | メール（暗号化） |
| 995 | POP3S | メール（暗号化） |

---

## 内部ポート割り当て（127.0.0.1 のみ）

| ポート | サービス | ドメイン | 備考 |
|--------|---------|---------|------|
| 3000 | **linker** | linker.arrowsworks.com | Nuxt アプリ（既存） |
| 3100 | **ミエルボード (wbs)** | mieruplus.jp | Nuxt 3 + Socket.IO **← 新規** |
| 4000 | Plane Web | plane.arrowsworks.com | Docker (plane-app-web-1) |
| 4100 | iyasaka | iyasaka.co | PM2 (iyasaka-nuxt) |
| 5432 | PostgreSQL | - | DB（ネイティブ） |
| 8000 | Plane API | plane.arrowsworks.com | Docker (plane-app-api-1) |
| 8080 | Apache (arrowsworks/task) | arrowsworks.com / task.arrowsworks.com | レガシー |
| 8081 | Nextcloud | nc.arrowsworks.com | Docker (nextcloud) |
| 8891 | (不明) | - | 要調査 |

---

## 予約ポート（将来用）

| ポート | 予定サービス | 備考 |
|--------|-------------|------|
| 3200 | haishin-plus-hub | Nuxt 3 (将来) |
| 3300 | (未割当) | - |
| 3400 | (未割当) | - |
| 3500 | (未割当) | - |

---

## Docker コンテナ一覧

| コンテナ名 | イメージ | 内部ポート | 外部ポート | data-root |
|-----------|---------|-----------|-----------|-----------|
| wbs-app | ghcr.io/watchout/wbs:latest | 3000 | 127.0.0.1:3100 | /opt/docker-data |
| wbs-watchtower | containrrr/watchtower | - | - | /opt/docker-data |
| plane-app-web-1 | plane-frontend:stable | 3000 | 127.0.0.1:4000 | /var/lib/docker |
| plane-app-api-1 | plane-backend:stable | 8000 | 127.0.0.1:8000 | /var/lib/docker |
| plane-app-* | (beat/worker/live/admin/space) | - | - | /var/lib/docker |
| plane-app-plane-db-1 | postgres:15-alpine | 5432 | (internal) | /var/lib/docker |
| plane-app-plane-redis-1 | valkey:7.2.11-alpine | 6379 | (internal) | /var/lib/docker |
| plane-app-plane-mq-1 | rabbitmq:3.13.6 | 5672 | (internal) | /var/lib/docker |
| plane-app-plane-minio-1 | minio/minio | 9000 | (internal) | /var/lib/docker |
| nextcloud | nextcloud:apache | 80 | 0.0.0.0:8081 | /var/lib/docker |
| nextcloud-db | postgres:15-alpine | 5432 | (internal) | /var/lib/docker |
| nextcloud-redis | redis:7-alpine | 6379 | (internal) | /var/lib/docker |

---

## Nginx ドメインマッピング

| ドメイン | Nginx 設定ファイル | 転送先 | SSL |
|---------|-------------------|--------|-----|
| arrowsworks.com | arrowsworks.conf | 127.0.0.1:8080 | - |
| iyasaka.co | iyasaka.co.conf | 127.0.0.1:4100 | certbot |
| linker.arrowsworks.com | linker.conf | 127.0.0.1:3000 | certbot |
| nc.arrowsworks.com | nc.conf | 127.0.0.1:8081 | certbot |
| plane.arrowsworks.com | plane.conf | 127.0.0.1:8000/4000 | certbot |
| task.arrowsworks.com | task.conf | 127.0.0.1:8080 | - |
| haishin-qa.iyasaka.co | haishin-qa | 静的ファイル(/var/www/) | certbot |
| **mieruplus.jp** | **mieruplus.conf** | **127.0.0.1:3100** | **certbot（予定）** |

---

## ルール

1. 新しいサービス追加時は、必ずこの表を更新する
2. ポート 3000〜3999 は Nuxt/Node アプリ用に予約
3. ポート 4000〜4999 は SaaS ツール用に予約
4. ポート 8000〜8999 はレガシー/外部ツール用
5. Docker data-root に注意:
   - 既存コンテナ: `/var/lib/docker`（FS エラーあり、要修復）
   - 新規コンテナ (wbs): `/opt/docker-data`

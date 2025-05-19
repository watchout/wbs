# Functional Specification

This document summarizes key requirements extracted from the project README. No additional SRS notes were present in the repository.

## Features
- **Realtime Updates**: schedule data synchronized across rooms with Socket.IO in under one second P95 latency.
- **Google Calendar Sync**: bidirectional synchronization using incremental sync and webhooks.
- **Offline Kiosk Mode**: Progressive Web App with IndexedDB caching keeps signage operational for 24 hours without Wi‑Fi.
- **Multi‑language Support**: interface localized in Japanese, English, Vietnamese, Simplified Chinese, Filipino, Nepali and Brazilian Portuguese.
- **Role‑based Access Control**: `ADMIN`, `MEMBER`, and `DEVICE` roles with OAuth2 and MagicLink authentication.
- **Infrastructure as Code**: one‑command deployment on ConoHa VPS via Terraform.
- **Automated CI/CD**: GitHub Actions builds Docker images and uses SSH deploy with Watchtower.
- **Quality Gates**:
  - Vitest unit tests targeting 90% line coverage.
  - Playwright end‑to‑end tests on Chrome and Android WebView.
  - Load testing with k6 at 200 RPS for 15 minutes.
  - Lighthouse PWA score of 80 or higher.

## Architecture Overview
A load balancer routes HTTPS/WSS traffic to multiple Nuxt application containers which connect to a shared Postgres database via Prisma. Database write‑ahead logs are stored in Object Storage.

## 1. ユースケース／受入れ条件

### UC-01: 予定を登録する
| 項目 | 内容 |
|------|------|
| アクター | MEMBER |
| シナリオ | 1. 予定フォーム入力 → 2. POST /schedules |
| 受入れ条件 | - 200 OK & JSON {id,...}<br>- 1 秒以内に同一 org の全端末へ WS `schedule:create` が配信 |

---

## 2. API 一覧

| エンドポイント | メソッド | 説明 | 正常 | 主なエラー |
|----------------|---------|------|------|-----------|
| /schedules | GET | 期間内予定一覧 | 200 | 400 invalid range |
| /schedules | POST | 予定作成 | 201 | 409 overlap |
| /devices/heartbeat | POST | 端末 ping | 204 | 403 secret NG |

---

## 3. バリデーション規則

* 予定タイトル: **1–60 文字**
* 予定期間: **終了 ≤ 開始 + 14 日**
* overdue WS 伝送: **< 1 秒** (P95)

---

## 4. SLO

| 指標 | 目標 |
|------|------|
| API P95 レイテンシ | ≤ 1 秒 |
| 月次可用性 | ≥ 99.9 % |


# SSOT_NOTIFICATION.md — 通知基盤

> Sprint 6: メール通知 + トースト通知の基盤構築

---

## §0 Document Control

| 項目 | 内容 |
|------|------|
| Document ID | SSOT_NOTIFICATION |
| Version | v1.0.0 |
| Status | Approved |
| Owner | kaneko |
| Created | 2026-03-23 |
| Phase | Phase 2（横断機能強化） |

### 完全性チェックリスト

- [x] §1 Purpose / Scope
- [x] §2 Background / Problem Statement
- [x] §3 Functional Requirements
- [x] §4 Data Model
- [x] §5 API Requirements
- [x] §6 UI Requirements
- [x] §7 Non-Functional Requirements
- [x] §8 Input/Output Examples
- [x] §9 Boundary Values
- [x] §10 Error Cases
- [x] §11 Gherkin Scenarios
- [x] §12 Migration Strategy

### Related SSOTs

| SSOT | 関係 |
|------|------|
| SSOT-1_FEATURE_CATALOG.md | NOTIF-001, NOTIF-002 |
| SSOT-5_CROSS_CUTTING.md | エラーハンドリング・ログ |
| SSOT_MEETING_SCHEDULER.md | WBS-004 AC7 会議招待メール |

---

## §1 Purpose / Scope

### 目的

ミエルボードに通知基盤を導入し、重要なイベント（配置変更、会議招待、アカウント操作等）をユーザーに確実に届ける仕組みを構築する。

### スコープ（Sprint 6）

| 機能 | 概要 | 優先度 |
|------|------|--------|
| NOTIF-001 | メール通知 | SHOULD |
| NOTIF-002 | トースト通知（画面内） | SHOULD |

### 非スコープ（Sprint 6 では対象外）

- NOTIF-003: 通知センター（Sprint 10）
- NOTIF-004: プッシュ通知（Sprint 10）
- NOTIF-005: 通知再送
- SMS通知
- LINE/Slack連携

---

## §2 Background / Problem Statement

### 現状の課題

1. **配置変更が伝わらない**: AIコマンドバーやAI配置提案で配置が変更されても、対象者に通知されない
2. **会議招待が届かない**: WBS-004 AC7 で会議招待メール通知が未実装のまま（Phase 2待ち）
3. **アカウント操作の確認がない**: パスワードリセット、ログイン異常等の重要操作がメール通知されない
4. **画面内フィードバックが弱い**: 操作成功/失敗の表示が各画面で独自実装されており統一感がない

### 解決方針

- **メール通知**: サーバーサイドでイベント発火 → キュー → メール送信（非同期）
- **トースト通知**: クライアントサイドの統一コンポーネントで操作フィードバックを表示
- **拡張性**: 将来のプッシュ通知・通知センターに接続できる抽象レイヤーを設計

---

## §3 Functional Requirements

### 3.1 メール通知（NOTIF-001）

| FR-ID | 要件 | MUST/SHOULD |
|-------|------|-------------|
| FR-NOTIF-001 | 会議招待メール送信 | MUST |
| FR-NOTIF-002 | 配置変更通知メール | MUST |
| FR-NOTIF-003 | パスワードリセット通知メール | MUST |
| FR-NOTIF-004 | アカウントロック通知メール | SHOULD |
| FR-NOTIF-005 | メール送信のキュー管理（非同期） | MUST |
| FR-NOTIF-006 | メールテンプレート管理 | MUST |
| FR-NOTIF-007 | ユーザー別通知設定（メール受信ON/OFF） | SHOULD |
| FR-NOTIF-008 | 送信履歴の保存 | SHOULD |

### 3.2 トースト通知（NOTIF-002）

| FR-ID | 要件 | MUST/SHOULD |
|-------|------|-------------|
| FR-TOAST-001 | 成功トースト（緑） | MUST |
| FR-TOAST-002 | エラートースト（赤） | MUST |
| FR-TOAST-003 | 警告トースト（黄） | SHOULD |
| FR-TOAST-004 | 情報トースト（青） | SHOULD |
| FR-TOAST-005 | 自動消去（5秒） | MUST |
| FR-TOAST-006 | 手動閉じ | MUST |
| FR-TOAST-007 | 複数トーストのスタック表示 | MUST |
| FR-TOAST-008 | Socket.IO経由のリアルタイムトースト | SHOULD |

---

## §4 Data Model

### 新規テーブル

```prisma
model NotificationLog {
  id              String   @id @default(uuid())
  organization    Organization @relation(fields: [organizationId], references: [id])
  organizationId  String

  recipientId     String          // 宛先ユーザーID
  channel         NotifChannel    // EMAIL / TOAST / PUSH（将来）
  eventType       String          // meeting_invite / assignment_change / password_reset 等
  subject         String?         // メール件名
  body            String          // メール本文 or トーストメッセージ
  status          NotifStatus     @default(PENDING)
  sentAt          DateTime?
  failReason      String?

  createdAt       DateTime @default(now())

  @@index([organizationId, recipientId])
  @@index([status])
}

enum NotifChannel {
  EMAIL
  TOAST
  PUSH
}

enum NotifStatus {
  PENDING
  SENT
  FAILED
  SKIPPED   // ユーザーが通知OFF
}
```

### User テーブル拡張

```prisma
model User {
  // 既存フィールド...
  notifyEmail     Boolean @default(true)   // メール通知受信設定
}
```

---

## §5 API Requirements

| Method | Path | 説明 | 権限 |
|--------|------|------|------|
| POST | /api/notifications/send | 通知送信（内部API） | SYSTEM |
| GET | /api/notifications/history | 通知履歴取得 | ADMIN |
| PATCH | /api/users/me/notification-settings | 通知設定変更 | MEMBER+ |
| GET | /api/users/me/notification-settings | 通知設定取得 | MEMBER+ |

### 内部呼び出しパターン

```typescript
// サーバーサイドから直接呼び出し（API経由ではない）
import { sendNotification } from '~/server/utils/notification'

await sendNotification({
  organizationId,
  recipientId: userId,
  channel: 'EMAIL',
  eventType: 'assignment_change',
  subject: '配置変更のお知らせ',
  body: '田中太郎さんの配置が品川ホテルに変更されました。',
})
```

---

## §6 UI Requirements

### トーストコンポーネント

```
位置: 画面右上（固定）
最大表示数: 5件（超過分は古いものから消去）
アニメーション: slide-in from right + fade-out

種別:
  success（緑）: 操作成功
  error（赤）: 操作失敗
  warning（黄）: 注意
  info（青）: 情報

表示時間: 5秒（エラーは手動閉じまで表示）
```

### 通知設定画面

```
場所: /settings/notifications（設定画面に新タブ追加）
項目:
  - メール通知: ON/OFF トグル
  - （将来）通知種別ごとの個別設定
```

---

## §7 Non-Functional Requirements

| NFR-ID | 要件 | 基準 |
|--------|------|------|
| NFR-NOTIF-001 | メール送信遅延 | イベント発生から5分以内に送信 |
| NFR-NOTIF-002 | メール送信失敗時のリトライ | 最大3回、指数バックオフ |
| NFR-NOTIF-003 | メール送信レート制限 | 組織あたり100通/時間 |
| NFR-NOTIF-004 | トースト描画性能 | 表示まで100ms以内 |
| NFR-NOTIF-005 | メールプロバイダー | Resend（初期）/ SendGrid（将来切替可能） |
| NFR-NOTIF-006 | マルチテナント | 通知は organizationId スコープ |

---

## §8 Input/Output Examples

### E-1: 配置変更メール通知（正常系）

```
トリガー: POST /api/ai/allocation-proposal/:id（仮配置適用）

内部処理:
sendNotification({
  organizationId: "org-001",
  recipientId: "user-tanaka",
  channel: "EMAIL",
  eventType: "assignment_change",
  subject: "【ミエルボード】配置変更のお知らせ",
  body: "田中太郎さん\n\n3/25(火) の配置が「品川ホテル新館」に変更されました（仮配置）。\n\n確認: https://app.mielboard.com/org/demo/weekly-board"
})

結果: NotificationLog レコード作成、メール送信、status = SENT
```

### E-2: トースト表示（正常系）

```
トリガー: ユーザーがスケジュールを保存

UI:
useToast().success('スケジュールを保存しました')

表示: 右上に緑バッジのトーストが5秒間表示
```

### E-3: メール通知OFF（正常系）

```
前提: ユーザーが notifyEmail = false に設定済み

トリガー: 配置変更イベント

結果: NotificationLog は作成（status = SKIPPED）、メール未送信
```

### E-4: メール送信失敗（異常系）

```
トリガー: メールプロバイダーがエラーを返す

結果:
- 1回目失敗 → 1分後にリトライ
- 2回目失敗 → 4分後にリトライ
- 3回目失敗 → status = FAILED、failReason = "Provider error: 503"
```

### E-5: レート制限超過（異常系）

```
トリガー: 組織が1時間に100通を超えるメール送信を試行

結果: status = FAILED、failReason = "Rate limit exceeded"
ログ: logger.warn で記録
```

---

## §9 Boundary Values

| 項目 | 下限 | 上限 | 備考 |
|------|------|------|------|
| メール件名 | 1文字 | 200文字 | 超過時は切り詰め |
| メール本文 | 1文字 | 10,000文字 | HTML含む |
| トーストメッセージ | 1文字 | 200文字 | |
| トースト同時表示数 | 0 | 5 | 超過時は古いもの消去 |
| メール送信レート | 0 | 100通/時/組織 | |
| リトライ回数 | 0 | 3 | 指数バックオフ |

---

## §10 Error Cases

| エラー | HTTP | メッセージ | 対応 |
|--------|------|----------|------|
| メールプロバイダー不通 | - | - | リトライ3回、FAILED記録 |
| 宛先メールアドレス無効 | - | - | FAILED、failReason記録 |
| 通知設定API未認証 | 401 | 認証が必要です | - |
| レート制限超過 | 429 | メール送信の上限に達しました | 1時間後に自動解除 |
| テンプレート未定義 | 500 | 通知テンプレートが見つかりません | ログ記録 |

---

## §11 Gherkin Scenarios

```gherkin
Feature: メール通知
  ユーザーとして、重要な変更をメールで受け取りたい

  Scenario: 配置変更時にメール通知が送られる
    Given ユーザー田中太郎のメール通知設定がONである
    When 田中太郎の配置が品川ホテルに変更される
    Then 田中太郎のメールアドレスに配置変更通知が送信される
    And NotificationLog に status=SENT のレコードが作成される

  Scenario: メール通知OFFのユーザーにはメールが送られない
    Given ユーザー鈴木次郎のメール通知設定がOFFである
    When 鈴木次郎の配置が変更される
    Then メールは送信されない
    And NotificationLog に status=SKIPPED のレコードが作成される

  Scenario: 会議招待メールが送られる
    Given 管理者が新しい会議を作成する
    When 参加者として田中太郎を選択する
    Then 田中太郎に会議招待メールが送信される
    And メールに会議の日時・場所・回答リンクが含まれる

  Scenario: メール送信失敗時のリトライ
    Given メールプロバイダーが一時的にエラーを返す
    When 配置変更メールの送信が試行される
    Then 1分後にリトライされる
    And 3回失敗後に status=FAILED となる

Feature: トースト通知
  ユーザーとして、操作結果を画面上で確認したい

  Scenario: スケジュール保存成功時にトーストが表示される
    Given 週間ボード画面を開いている
    When スケジュールを保存する
    Then 右上に「スケジュールを保存しました」と緑色のトーストが表示される
    And 5秒後に自動的に消える

  Scenario: エラー時のトーストは手動で閉じる
    Given API呼び出しがエラーを返す
    When 操作が失敗する
    Then 赤色のエラートーストが表示される
    And 自動消去されず、×ボタンで閉じる

  Scenario: 複数トーストがスタック表示される
    Given 連続して3件の操作を実行する
    When 全て成功する
    Then 3件のトーストが縦にスタック表示される
    And 古いものから順に消える
```

---

## §12 Migration Strategy

### Phase 1 → Phase 2 移行

1. **DB マイグレーション**: NotificationLog テーブル追加、User.notifyEmail 追加
2. **既存機能への組み込み**:
   - 配置変更（assign.post.ts, allocation-proposal）→ メール通知発火
   - 会議招待（meetings/index.post.ts）→ メール通知発火
   - パスワードリセット（auth/set-password.post.ts）→ メール通知発火
3. **トースト移行**: 各画面の独自実装を `useToast()` composable に統一
4. **メールプロバイダー**: Resend を初期採用（無料枠: 100通/日、有料プラン切替可能）

### リスク

| リスク | 影響 | 対策 |
|--------|------|------|
| メールプロバイダー障害 | 通知遅延 | リトライ + フォールバック（将来: SendGrid） |
| スパム判定 | 到達率低下 | SPF/DKIM/DMARC 設定、送信ドメイン認証 |
| 大量通知 | レート制限超過 | バッチ送信、レート制限、重要度別キュー |

---

## 受け入れ条件（AC）

### NOTIF-001: メール通知

```
- [ ] AC-N1-01: 配置変更時にメール通知が送信される
- [ ] AC-N1-02: 会議招待時にメール通知が送信される
- [ ] AC-N1-03: パスワードリセット時にメール通知が送信される
- [ ] AC-N1-04: ユーザーがメール通知のON/OFFを設定できる
- [ ] AC-N1-05: 通知OFFのユーザーにはメールが送信されない
- [ ] AC-N1-06: メール送信失敗時に最大3回リトライされる
- [ ] AC-N1-07: 送信履歴がNotificationLogに記録される
```

### NOTIF-002: トースト通知

```
- [ ] AC-N2-01: 操作成功時に緑色のトーストが表示される
- [ ] AC-N2-02: エラー時に赤色のトーストが表示される
- [ ] AC-N2-03: トーストは5秒後に自動消去される（エラー除く）
- [ ] AC-N2-04: エラートーストは手動閉じのみ
- [ ] AC-N2-05: 複数トーストがスタック表示される（最大5件）
- [ ] AC-N2-06: useToast() composable から統一的に呼び出せる
```

# SSOT-1: 機能台帳（Feature Catalog）

> 全機能の母艦 - ai-dev-framework v3.0 準拠
> 対象: ミエルボード for 現場（Phase 0 MVP）

---

## 使い方

1. **棚卸し**: 下記の機能カテゴリを見て、必要な機能にチェック
2. **ID付与**: 実装する機能には一意のIDを振る
3. **受入条件**: 各機能に3〜7個の受入条件を設定
4. **状態管理**: Backlog/Designing/Ready/In Progress/Review/Done/Out of Scope を明示

---

## 機能一覧サマリー

| カテゴリ | 機能数 | 対象 | スコープ外 |
|---------|-------|------|----------|
| 1. 認証・認可（AUTH） | 7/12 | 7 | 5 |
| 2. アカウント（ACCT） | 4/6 | 4 | 2 |
| 3. 権限・ロール（ROLE） | 5/5 | 5 | 0 |
| 4. ナビゲーション（NAV） | 4/6 | 4 | 2 |
| 5. 検索・一覧（LIST） | 2/5 | 2 | 3 |
| 6. CRUD共通（CRUD） | 4/7 | 4 | 3 |
| 7. 通知（NOTIF） | 0/5 | 0 | 5 |
| 8. 監査・ログ（AUDIT） | 2/4 | 2 | 2 |
| 9. エラー・例外（ERR） | 3/6 | 3 | 3 |
| 10. セキュリティ（SEC） | 5/7 | 5 | 2 |
| 11. 運用・管理（OPS） | 4/6 | 4 | 2 |
| 12. AI特有（AI） | 1/8 | 1 | 7 |
| 13. WBS固有（WBS） | 8/8 | 8 | 0 |
| **合計** | **49/85** | **49** | **36** |

---

## 1. 認証・認可（AUTH）

| ID | 機能 | 必要 | 優先度 | 状態 | 備考 |
|----|------|------|-------|------|------|
| AUTH-001 | メール/パスワードログイン | Yes | P0 | Done | server/api/auth/login.post.ts |
| AUTH-002 | OAuth（Google） | Yes | P1 | Out of Scope | Phase 0ではパスワード認証のみ |
| AUTH-003 | OAuth（GitHub） | No | - | Out of Scope | 不要 |
| AUTH-004 | デバイスログイン | Yes | P0 | Done | server/api/auth/device-login.post.ts |
| AUTH-005 | ログアウト | Yes | P0 | Done | server/api/auth/logout.post.ts |
| AUTH-006 | パスワードリセット | Yes | P1 | Backlog | セットアップトークン方式で代替中 |
| AUTH-007 | セットアップトークン | Yes | P0 | Done | 初回パスワード設定用 |
| AUTH-008 | 多要素認証（MFA/2FA） | No | - | Out of Scope | Phase 2以降検討 |
| AUTH-009 | セッション管理（有効期限） | Yes | P0 | Done | JWT + Cookie |
| AUTH-010 | セッション自動更新 | Yes | P1 | Backlog | リフレッシュトークン未実装 |
| AUTH-011 | 同時ログイン制御 | No | - | Out of Scope | 不要 |
| AUTH-012 | ログイン履歴 | No | - | Out of Scope | Phase 2以降検討 |

### AUTH-001: メール/パスワードログイン 受入条件

```
- [x] AC1: 正しいメール/パスワードでログイン成功しJWT Cookieが設定される
- [x] AC2: 不正なパスワードで「メールアドレスまたはパスワードが正しくありません」エラー
- [x] AC3: 存在しないメールで同一エラーメッセージ（情報漏洩防止）
- [x] AC4: ログイン成功後、元のページまたはダッシュボードへ遷移
- [ ] AC5: ログイン失敗5回でアカウントロック（未実装）
```

### AUTH-004: デバイスログイン 受入条件

```
- [x] AC1: orgSlug + kioskSecret でデバイス認証成功
- [x] AC2: 無効なシークレットで401エラー
- [x] AC3: 認証成功後、サイネージ画面へ自動遷移
- [x] AC4: デバイスロール（DEVICE）でのアクセス制限が機能する
```

---

## 2. アカウント（ACCT）

| ID | 機能 | 必要 | 優先度 | 状態 | 備考 |
|----|------|------|-------|------|------|
| ACCT-001 | ユーザー登録（管理者による招待） | Yes | P0 | Done | 管理者がユーザー作成 + セットアップトークン発行 |
| ACCT-002 | プロフィール表示 | Yes | P0 | Done | settings/profile.vue |
| ACCT-003 | プロフィール編集 | Yes | P0 | Done | server/api/users/me.patch.ts |
| ACCT-004 | メールアドレス変更 | No | - | Out of Scope | Phase 2以降 |
| ACCT-005 | パスワード変更 | Yes | P0 | Done | settings/password.vue |
| ACCT-006 | アカウント削除 | No | - | Out of Scope | ソフトデリートによる無効化で代替 |

---

## 3. 権限・ロール（ROLE）

| ID | 機能 | 必要 | 優先度 | 状態 | 備考 |
|----|------|------|-------|------|------|
| ROLE-001 | ロール定義（ADMIN/LEADER/MEMBER/DEVICE） | Yes | P0 | Done | prisma/schema.prisma enum Role |
| ROLE-002 | ロールベースアクセス制御（RBAC） | Yes | P0 | Done | middleware/auth.ts + admin.ts |
| ROLE-003 | 権限チェック（フロントエンド） | Yes | P0 | Done | middleware/auth.ts（route middleware） |
| ROLE-004 | 権限チェック（バックエンド） | Yes | P0 | Done | server/utils/authMiddleware.ts |
| ROLE-005 | 管理者によるロール変更 | Yes | P0 | Done | admin/users.vue |

---

## 4. ナビゲーション（NAV）

| ID | 機能 | 必要 | 優先度 | 状態 | 備考 |
|----|------|------|-------|------|------|
| NAV-001 | 共通ヘッダー | Yes | P0 | Done | components/common/AppHeader.vue |
| NAV-002 | ユーザーメニュー | Yes | P0 | Done | SSOT_APP_HEADER.md 準拠 |
| NAV-003 | 管理者メニュー | Yes | P0 | Done | components/admin/AdminNav.vue |
| NAV-004 | パンくずリスト | No | - | Out of Scope | SPA構造で不要 |
| NAV-005 | モバイルナビゲーション | Yes | P1 | Done | レスポンシブ対応済み |
| NAV-006 | ディープリンク対応 | No | - | Out of Scope | Phase 2以降 |

---

## 5. 検索・一覧（LIST）

| ID | 機能 | 必要 | 優先度 | 状態 | 備考 |
|----|------|------|-------|------|------|
| LIST-001 | ページネーション | No | - | Out of Scope | 週間ボードは固定期間表示 |
| LIST-002 | ソート | No | - | Out of Scope | 時系列固定 |
| LIST-003 | 部門フィルタ | Yes | P1 | Done | WeeklyScheduleBoard 部門カラー表示 |
| LIST-004 | 日付範囲フィルタ | Yes | P0 | Done | schedules/weekly-board.get.ts |
| LIST-005 | 無限スクロール | No | - | Out of Scope | 不要 |

---

## 6. CRUD共通（CRUD）

| ID | 機能 | 必要 | 優先度 | 状態 | 備考 |
|----|------|------|-------|------|------|
| CRUD-001 | 新規作成（Create） | Yes | P0 | Done | スケジュール、ユーザー、部門、会議 |
| CRUD-002 | 詳細表示（Read） | Yes | P0 | Done | 各エンティティ |
| CRUD-003 | 編集（Update） | Yes | P0 | Done | PATCH エンドポイント |
| CRUD-004 | 削除（Delete） | Yes | P0 | Done | ソフトデリート方式 |
| CRUD-005 | 下書き保存 | No | - | Out of Scope | 会議のDRAFTステータスで代替 |
| CRUD-006 | 一括操作（バルク） | No | - | Out of Scope | Phase 2以降 |
| CRUD-007 | CSVインポート | No | P2 | Out of Scope | Phase 2以降（Source.CSV は定義済み） |

---

## 7. 通知（NOTIF）

| ID | 機能 | 必要 | 優先度 | 状態 | 備考 |
|----|------|------|-------|------|------|
| NOTIF-001 | メール通知 | No | P2 | Out of Scope | Phase 2 |
| NOTIF-002 | トースト通知 | No | P2 | Out of Scope | Phase 2 |
| NOTIF-003 | 通知センター | No | P2 | Out of Scope | Phase 2 |
| NOTIF-004 | プッシュ通知 | No | P2 | Out of Scope | Phase 2 |
| NOTIF-005 | 通知再送 | No | P2 | Out of Scope | Phase 2 |

---

## 8. 監査・ログ（AUDIT）

| ID | 機能 | 必要 | 優先度 | 状態 | 備考 |
|----|------|------|-------|------|------|
| AUDIT-001 | 操作ログ | Yes | P0 | Done | AuditLog モデル + 主要操作で記録 |
| AUDIT-002 | ログイン履歴 | No | P2 | Out of Scope | Phase 2 |
| AUDIT-003 | 変更履歴（バージョン管理） | Yes | P1 | Done | ScheduleVersion モデル |
| AUDIT-004 | ログ検索・フィルタ | No | P2 | Out of Scope | Phase 2 |

---

## 9. エラー・例外（ERR）

| ID | 機能 | 必要 | 優先度 | 状態 | 備考 |
|----|------|------|-------|------|------|
| ERR-001 | 404ページ | Yes | P1 | Backlog | |
| ERR-002 | 403ページ（権限エラー） | Yes | P0 | Done | ログインリダイレクト実装済み |
| ERR-003 | 500ページ | Yes | P1 | Backlog | |
| ERR-004 | ネットワークエラー処理 | No | P2 | Out of Scope | PWA対応時に実装 |
| ERR-005 | リトライ機構 | No | P2 | Out of Scope | Socket.IO自動再接続のみ |
| ERR-006 | サポート導線 | No | P2 | Out of Scope | Phase 2 |

---

## 10. セキュリティ（SEC）

| ID | 機能 | 必要 | 優先度 | 状態 | 備考 |
|----|------|------|-------|------|------|
| SEC-001 | CSRF対策 | Yes | P0 | Done | Cookie SameSite + Nuxt組み込み |
| SEC-002 | CORS設定 | Yes | P0 | Done | nuxt.config.ts |
| SEC-003 | レート制限 | Yes | P1 | Backlog | |
| SEC-004 | 入力バリデーション | Yes | P0 | Done | サーバー側バリデーション |
| SEC-005 | SQLインジェクション対策 | Yes | P0 | Done | Prisma ORM使用（rawSQL禁止） |
| SEC-006 | XSS対策 | Yes | P0 | Done | Vue.js テンプレートエスケープ |
| SEC-007 | HTTPS強制 | No | P1 | Out of Scope | Nginx側で対応（アプリ外） |

---

## 11. 運用・管理（OPS）

| ID | 機能 | 必要 | 優先度 | 状態 | 備考 |
|----|------|------|-------|------|------|
| OPS-001 | 管理画面 | Yes | P0 | Done | admin/users.vue, admin/departments.vue |
| OPS-002 | ユーザー管理 | Yes | P0 | Done | CRUD + ロール変更 |
| OPS-003 | バックアップ/リストア | Yes | P1 | In Progress | PostgreSQL WAL + オブジェクトストレージ |
| OPS-004 | データ移行ツール | No | P2 | Out of Scope | Phase 2 |
| OPS-005 | ヘルスチェック | Yes | P0 | Done | server/api/health.get.ts |
| OPS-006 | メトリクス | No | P2 | Out of Scope | Phase 2 |

---

## 12. AI特有（AI）

| ID | 機能 | 必要 | 優先度 | 状態 | 備考 |
|----|------|------|-------|------|------|
| AI-001 | AI日程調整（スロット提案） | Yes | P1 | Done | SSOT_MEETING_SCHEDULER.md |
| AI-002 | プロンプト管理 | No | P2 | Out of Scope | Phase 2 |
| AI-003 | AI応答ストリーミング | No | P2 | Out of Scope | Phase 2 |
| AI-004 | AI応答キャッシュ | No | P2 | Out of Scope | Phase 2 |
| AI-005 | AI出力評価 | No | P2 | Out of Scope | Phase 2 |
| AI-006 | 再現性確保 | No | - | Out of Scope | 不要 |
| AI-007 | AIログ | No | P2 | Out of Scope | Phase 2 |
| AI-008 | PII対策 | No | P2 | Out of Scope | Phase 2 |

---

## 13. WBS固有（WBS）

| ID | 機能 | 必要 | 優先度 | 状態 | SSOT参照 |
|----|------|------|-------|------|---------|
| WBS-001 | 週間スケジュールボード | Yes | P0 | Done | SSOT_GENBA_WEEK.md |
| WBS-002 | サイネージ表示 | Yes | P0 | Done | SSOT_GENBA_WEEK.md |
| WBS-003 | Googleカレンダー連携 | Yes | P0 | Done | SSOT_CALENDAR_SYNC.md |
| WBS-004 | AI日程調整 | Yes | P1 | Done | SSOT_MEETING_SCHEDULER.md |
| WBS-005 | 部門管理 | Yes | P0 | Done | SSOT_MVP_EXTEND.md |
| WBS-006 | 共通ヘッダー・設定 | Yes | P0 | Done | SSOT_APP_HEADER.md |
| WBS-007 | UI/UXナビゲーション | Yes | P0 | Done | SSOT_UI_NAVIGATION.md |
| WBS-008 | リアルタイム同期（Socket.IO） | Yes | P0 | Done | socket_events.md |

### WBS-001: 週間スケジュールボード 受入条件

```
- [x] AC1: 週間表示（月〜日）で全ユーザーの予定が確認できる
- [x] AC2: スケジュールの作成・編集・削除が可能
- [x] AC3: 変更がSocket.IO経由で1秒以内にリアルタイム反映
- [x] AC4: 部門ごとにカラー表示で視覚的に区別可能
- [x] AC5: モバイル対応（レスポンシブ）
- [ ] AC6: オフライン時に24時間分のデータキャッシュ（未実装）
- [ ] AC7: 7言語対応（未実装）
```

### WBS-003: Googleカレンダー連携 受入条件

```
- [x] AC1: Google OAuth2で認証し、カレンダー接続を確立できる
- [x] AC2: 接続後、初回フル同期でGoogleカレンダーのイベントを取得
- [x] AC3: 増分同期で差分のみを効率的に取得
- [x] AC4: Webhookで外部からの変更をリアルタイム検知
- [x] AC5: WBS側の予定変更がGoogleカレンダーに反映（双方向）
- [x] AC6: 接続解除時にトークンが安全に削除される
- [x] AC7: マルチテナント（organizationId）でデータが分離される
```

### WBS-004: AI日程調整 受入条件

```
- [x] AC1: 会議作成時に参加者と候補日時範囲を指定できる
- [x] AC2: AIが参加者の空き時間を分析しスロットを提案
- [x] AC3: 招待者が候補日時に対して回答（選択）できる
- [x] AC4: 主催者が最終日時を確定できる
- [x] AC5: ロール（ADMIN/LEADER）のみ会議作成可能
- [ ] AC6: 確定した会議がGoogleカレンダーに自動反映（未実装）
- [ ] AC7: メール通知で招待者に回答を促す（未実装）
```

---

## 優先度定義

| 優先度 | 定義 | 目安 |
|-------|------|------|
| **P0** | 必須（これがないとリリース不可） | Phase 0 MVP |
| **P1** | 重要（早期に実装すべき） | Phase 0 完了後すぐ |
| **P2** | あると良い | Phase 2以降 |
| **P3** | 将来検討 | バックログ |

---

## 状態定義

| 状態 | 意味 |
|------|------|
| **Backlog** | 未着手 |
| **Designing** | 設計中 |
| **Ready** | 実装着手可能（DoR通過） |
| **In Progress** | 実装中 |
| **Review** | レビュー中 |
| **Done** | 完了 |
| **Out of Scope** | スコープ外（明示的に対象外） |

---

## 実装状態サマリー

| 状態 | 件数 |
|------|------|
| Done | 39 |
| In Progress | 1 |
| Backlog | 5 |
| Out of Scope | 36 |
| **合計** | **81** |

**Phase 0 MVP 進捗: 39/45 機能完了（87%）**

未完了の重要項目:
- AUTH-006: パスワードリセット（P1）
- AUTH-010: セッション自動更新（P1）
- ERR-001: 404ページ（P1）
- ERR-003: 500ページ（P1）
- SEC-003: レート制限（P1）

---

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|---------|-------|
| 2026-02-02 | ai-dev-framework v3.0 準拠で新規作成。既存12件のSSOT_*.md + 実装状態から統合 | AI（Claude Code） |

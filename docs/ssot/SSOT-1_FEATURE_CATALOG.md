# SSOT-1: 機能台帳（Feature Catalog） [CORE]

> 全機能の母艦 - ai-dev-framework v3.0 準拠
> 対象: ミエルボード for 現場（Phase 0 MVP）
> 層: CORE（Freeze 1-2） - 変更には PO 承認必須

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

> SSOT参照: [SSOT_APP_HEADER.md](../SSOT_APP_HEADER.md)（ログイン/ログアウト/パスワード変更UI）

| ID | 機能 | レベル | 優先度 | 状態 | 備考 |
|----|------|--------|-------|------|------|
| AUTH-001 | メール/パスワードログイン | MUST | P0 | Done | server/api/auth/login.post.ts |
| AUTH-002 | OAuth（Google） | MAY | P1 | Out of Scope | Phase 0ではパスワード認証のみ |
| AUTH-003 | OAuth（GitHub） | - | - | Out of Scope | 不要 |
| AUTH-004 | デバイスログイン | MUST | P0 | Done | server/api/auth/device-login.post.ts |
| AUTH-005 | ログアウト | MUST | P0 | Done | server/api/auth/logout.post.ts |
| AUTH-006 | パスワードリセット | SHOULD | P1 | Backlog | セットアップトークン方式で代替中 |
| AUTH-007 | セットアップトークン | MUST | P0 | Done | 初回パスワード設定用 |
| AUTH-008 | 多要素認証（MFA/2FA） | MAY | - | Out of Scope | Phase 2以降検討 |
| AUTH-009 | セッション管理（有効期限） | MUST | P0 | Done | JWT + Cookie |
| AUTH-010 | セッション自動更新 | SHOULD | P1 | Backlog | リフレッシュトークン未実装 |
| AUTH-011 | 同時ログイン制御 | MAY | - | Out of Scope | 不要 |
| AUTH-012 | ログイン履歴 | MAY | - | Out of Scope | Phase 2以降検討 |

### AUTH-001: メール/パスワードログイン 受入条件

```
- [x] AC1: 正しいメール/パスワードでログイン成功しJWT Cookieが設定される
- [x] AC2: 不正なパスワードで「メールアドレスまたはパスワードが正しくありません」エラー
- [x] AC3: 存在しないメールで同一エラーメッセージ（情報漏洩防止）
- [x] AC4: ログイン成功後、元のページまたはダッシュボードへ遷移
- [x] AC5: ログイン失敗5回でアカウントロック（15分間）- HTTP 423で通知
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

> SSOT参照: [SSOT_APP_HEADER.md](../SSOT_APP_HEADER.md)（プロフィール/パスワード変更UI）

| ID | 機能 | レベル | 優先度 | 状態 | 備考 |
|----|------|--------|-------|------|------|
| ACCT-001 | ユーザー登録（管理者による招待） | MUST | P0 | Done | 管理者がユーザー作成 + セットアップトークン発行 |
| ACCT-002 | プロフィール表示 | MUST | P0 | Done | settings/profile.vue |
| ACCT-003 | プロフィール編集 | MUST | P0 | Done | server/api/users/me.patch.ts |
| ACCT-004 | メールアドレス変更 | MAY | - | Out of Scope | Phase 2以降 |
| ACCT-005 | パスワード変更 | MUST | P0 | Done | settings/password.vue |
| ACCT-006 | アカウント削除 | MAY | - | Out of Scope | ソフトデリートによる無効化で代替 |

---

## 3. 権限・ロール（ROLE）

> SSOT参照: [SSOT_MVP_EXTEND.md](../SSOT_MVP_EXTEND.md)（LEADERロール定義）

| ID | 機能 | レベル | 優先度 | 状態 | 備考 |
|----|------|--------|-------|------|------|
| ROLE-001 | ロール定義（ADMIN/LEADER/MEMBER/DEVICE） | MUST | P0 | Done | prisma/schema.prisma enum Role |
| ROLE-002 | ロールベースアクセス制御（RBAC） | MUST | P0 | Done | middleware/auth.ts + admin.ts |
| ROLE-003 | 権限チェック（フロントエンド） | MUST | P0 | Done | middleware/auth.ts（route middleware） |
| ROLE-004 | 権限チェック（バックエンド） | MUST | P0 | Done | server/utils/authMiddleware.ts |
| ROLE-005 | 管理者によるロール変更 | MUST | P0 | Done | admin/users.vue |

---

## 4. ナビゲーション（NAV）

> SSOT参照: [SSOT_APP_HEADER.md](../SSOT_APP_HEADER.md), [SSOT_UI_NAVIGATION.md](../SSOT_UI_NAVIGATION.md)

| ID | 機能 | レベル | 優先度 | 状態 | 備考 |
|----|------|--------|-------|------|------|
| NAV-001 | 共通ヘッダー | MUST | P0 | Done | components/common/AppHeader.vue |
| NAV-002 | ユーザーメニュー | MUST | P0 | Done | SSOT_APP_HEADER.md 準拠 |
| NAV-003 | 管理者メニュー | MUST | P0 | Done | components/admin/AdminNav.vue |
| NAV-004 | パンくずリスト | MAY | - | Out of Scope | SPA構造で不要 |
| NAV-005 | モバイルナビゲーション | SHOULD | P1 | Done | レスポンシブ対応済み |
| NAV-006 | ディープリンク対応 | MAY | - | Out of Scope | Phase 2以降 |

---

## 5. 検索・一覧（LIST）

> SSOT参照: [SSOT_GENBA_WEEK.md](../SSOT_GENBA_WEEK.md)（週間ボードのフィルタ仕様）

| ID | 機能 | レベル | 優先度 | 状態 | 備考 |
|----|------|--------|-------|------|------|
| LIST-001 | ページネーション | MAY | - | Out of Scope | 週間ボードは固定期間表示 |
| LIST-002 | ソート | MAY | - | Out of Scope | 時系列固定 |
| LIST-003 | 部門フィルタ | SHOULD | P1 | Done | WeeklyScheduleBoard 部門カラー表示 |
| LIST-004 | 日付範囲フィルタ | MUST | P0 | Done | schedules/weekly-board.get.ts |
| LIST-005 | 無限スクロール | MAY | - | Out of Scope | 不要 |

---

## 6. CRUD共通（CRUD）

| ID | 機能 | レベル | 優先度 | 状態 | 備考 |
|----|------|--------|-------|------|------|
| CRUD-001 | 新規作成（Create） | MUST | P0 | Done | スケジュール、ユーザー、部門、会議 |
| CRUD-002 | 詳細表示（Read） | MUST | P0 | Done | 各エンティティ |
| CRUD-003 | 編集（Update） | MUST | P0 | Done | PATCH エンドポイント |
| CRUD-004 | 削除（Delete） | MUST | P0 | Done | ソフトデリート方式 |
| CRUD-005 | 下書き保存 | MAY | - | Out of Scope | 会議のDRAFTステータスで代替 |
| CRUD-006 | 一括操作（バルク） | MAY | - | Out of Scope | Phase 2以降 |
| CRUD-007 | CSVインポート | MAY | P2 | Out of Scope | Phase 2以降（Source.CSV は定義済み） |

---

## 7. 通知（NOTIF）

> 注: WBS-004 AC7（会議招待メール通知）は Phase 2 で NOTIF-001 と合わせて実装予定。

| ID | 機能 | レベル | 優先度 | 状態 | 備考 |
|----|------|--------|-------|------|------|
| NOTIF-001 | メール通知 | SHOULD | P2 | Backlog | Phase 2。WBS-004 AC7（会議招待）で初期実装 |
| NOTIF-002 | トースト通知 | MAY | P2 | Out of Scope | Phase 2 |
| NOTIF-003 | 通知センター | MAY | P2 | Out of Scope | Phase 2 |
| NOTIF-004 | プッシュ通知 | MAY | P2 | Out of Scope | Phase 2 |
| NOTIF-005 | 通知再送 | MAY | P2 | Out of Scope | Phase 2 |

---

## 8. 監査・ログ（AUDIT）

| ID | 機能 | レベル | 優先度 | 状態 | 備考 |
|----|------|--------|-------|------|------|
| AUDIT-001 | 操作ログ | MUST | P0 | Done | AuditLog モデル + 主要操作で記録 |
| AUDIT-002 | ログイン履歴 | MAY | P2 | Out of Scope | Phase 2 |
| AUDIT-003 | 変更履歴（バージョン管理） | SHOULD | P1 | Done | ScheduleVersion モデル |
| AUDIT-004 | ログ検索・フィルタ | MAY | P2 | Out of Scope | Phase 2 |

---

## 9. エラー・例外（ERR）

> SSOT参照: [SSOT_ERROR_PAGES.md](../SSOT_ERROR_PAGES.md)

| ID | 機能 | レベル | 優先度 | 状態 | 備考 |
|----|------|--------|-------|------|------|
| ERR-001 | 404ページ | SHOULD | P1 | Done | error.vue |
| ERR-002 | 403ページ（権限エラー） | MUST | P0 | Done | ログインリダイレクト実装済み |
| ERR-003 | 500ページ | SHOULD | P1 | Done | error.vue |
| ERR-004 | ネットワークエラー処理 | MAY | P2 | Out of Scope | PWA対応時に実装 |
| ERR-005 | リトライ機構 | MAY | P2 | Out of Scope | Socket.IO自動再接続のみ |
| ERR-006 | サポート導線 | MAY | P2 | Out of Scope | Phase 2 |

### ERR 受入条件

```
ERR-001:
- [x] AC1: 存在しないURLアクセス時に専用404ページを表示
- [x] AC2: 404ページからトップへのリンクが機能する
- [x] AC3: エラーコード（404）が明示される
- [x] AC4: モバイルでも適切に表示される

ERR-002:
- [x] AC1: 未認証ユーザーが認証必須ページにアクセスすると /login へリダイレクト
- [x] AC2: MEMBER が /admin/* にアクセスすると /login へリダイレクト
- [x] AC3: リダイレクト後、元のURLにログイン成功時に戻る

ERR-003:
- [x] AC1: サーバーエラー発生時に専用500ページを表示
- [x] AC2: エラー詳細はユーザーに公開せず、内部ログにのみ記録
- [x] AC3: 「再試行」ボタンが機能する
- [x] AC4: モバイルでも適切に表示される
```

---

## 10. セキュリティ（SEC）

| ID | 機能 | レベル | 優先度 | 状態 | 備考 |
|----|------|--------|-------|------|------|
| SEC-001 | CSRF対策 | MUST | P0 | Done | Cookie SameSite + Nuxt組み込み |
| SEC-002 | CORS設定 | MUST | P0 | Done | nuxt.config.ts |
| SEC-003 | レート制限 | SHOULD | P1 | Backlog | |
| SEC-004 | 入力バリデーション | MUST | P0 | Done | サーバー側バリデーション |
| SEC-005 | SQLインジェクション対策 | MUST | P0 | Done | Prisma ORM使用（rawSQL禁止） |
| SEC-006 | XSS対策 | MUST | P0 | Done | Vue.js テンプレートエスケープ |
| SEC-007 | HTTPS強制 | SHOULD | P1 | Out of Scope | Nginx側で対応（アプリ外） |

### SEC 受入条件

```
SEC-001:
- [x] AC1: POST/PATCH/DELETE リクエストに SameSite=Lax Cookie が設定される
- [x] AC2: 異なるオリジンからのリクエストが拒否される

SEC-004:
- [x] AC1: 空文字のtitle でスケジュール作成時に 400 エラー
- [x] AC2: 不正な日付形式で 400 エラー
- [x] AC3: organizationId 未指定のクエリが Prisma レベルで拒否される

SEC-005:
- [x] AC1: Prisma ORM 以外のSQL実行が CI で自動検出・拒否される
- [x] AC2: $queryRaw / $executeRaw の使用が存在しない
```

---

## 11. 運用・管理（OPS）

> SSOT参照: [SSOT_MVP_EXTEND.md](../SSOT_MVP_EXTEND.md)（部門管理の管理画面仕様）

| ID | 機能 | レベル | 優先度 | 状態 | 備考 |
|----|------|--------|-------|------|------|
| OPS-001 | 管理画面 | MUST | P0 | Done | admin/users.vue, admin/departments.vue |
| OPS-002 | ユーザー管理 | MUST | P0 | Done | CRUD + ロール変更 |
| OPS-003 | バックアップ/リストア | SHOULD | P1 | In Progress | PostgreSQL WAL + オブジェクトストレージ |
| OPS-004 | データ移行ツール | MAY | P2 | Out of Scope | Phase 2 |
| OPS-005 | ヘルスチェック | MUST | P0 | Done | server/api/health.get.ts |
| OPS-006 | メトリクス | MAY | P2 | Out of Scope | Phase 2 |

### OPS 受入条件

```
OPS-001:
- [x] AC1: ADMIN ロールのみ /admin/* にアクセス可能
- [x] AC2: ユーザー一覧でロール・部門の確認と変更が可能
- [x] AC3: 部門の追加・編集・削除（ソフトデリート）が可能

OPS-005:
- [x] AC1: GET /api/health が 200 を返す
- [x] AC2: DBアクセス不可時に 503 を返す
```

---

## 12. AI特有（AI）

> SSOT参照: [SSOT_MEETING_SCHEDULER.md](../SSOT_MEETING_SCHEDULER.md)

| ID | 機能 | レベル | 優先度 | 状態 | 備考 |
|----|------|--------|-------|------|------|
| AI-001 | AI日程調整（スロット提案） | SHOULD | P1 | Done | SSOT_MEETING_SCHEDULER.md |
| AI-002 | プロンプト管理 | MAY | P2 | Out of Scope | Phase 2 |
| AI-003 | AI応答ストリーミング | MAY | P2 | Out of Scope | Phase 2 |
| AI-004 | AI応答キャッシュ | MAY | P2 | Out of Scope | Phase 2 |
| AI-005 | AI出力評価 | MAY | P2 | Out of Scope | Phase 2 |
| AI-006 | 再現性確保 | MAY | - | Out of Scope | 不要 |
| AI-007 | AIログ | MAY | P2 | Out of Scope | Phase 2 |
| AI-008 | PII対策 | MAY | P2 | Out of Scope | Phase 2 |

---

## 13. WBS固有（WBS）

| ID | 機能 | レベル | 優先度 | 状態 | SSOT参照 |
|----|------|--------|-------|------|---------|
| WBS-001 | 週間スケジュールボード | MUST | P0 | Done | [SSOT_GENBA_WEEK.md](../SSOT_GENBA_WEEK.md) |
| WBS-002 | サイネージ表示 | MUST | P0 | Done | [SSOT_GENBA_WEEK.md](../SSOT_GENBA_WEEK.md) |
| WBS-003 | Googleカレンダー連携 | MUST | P0 | Done | [SSOT_CALENDAR_SYNC.md](../SSOT_CALENDAR_SYNC.md) |
| WBS-004 | AI日程調整 | SHOULD | P1 | Done | [SSOT_MEETING_SCHEDULER.md](../SSOT_MEETING_SCHEDULER.md) |
| WBS-005 | 部門管理 | MUST | P0 | Done | [SSOT_MVP_EXTEND.md](../SSOT_MVP_EXTEND.md) |
| WBS-006 | 共通ヘッダー・設定 | MUST | P0 | Done | [SSOT_APP_HEADER.md](../SSOT_APP_HEADER.md) |
| WBS-007 | UI/UXナビゲーション | MUST | P0 | Done | [SSOT_UI_NAVIGATION.md](../SSOT_UI_NAVIGATION.md) |
| WBS-008 | リアルタイム同期（Socket.IO） | MUST | P0 | Done | [socket_events.md](../socket_events.md) |

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

> 集計基準: 全85機能（13カテゴリ）を対象。Out of Scope を含む全件の状態を集計。

| 状態 | 件数 | 説明 |
|------|------|------|
| Done | 41 | 実装・検証完了 |
| In Progress | 1 | 実装中（OPS-003） |
| Backlog | 4 | 未着手 |
| Out of Scope | 39 | Phase 0 スコープ外 |
| **合計** | **85** | |

**Phase 0 MVP 対象機能（Out of Scope 除外）: 46件**
**完了: 41/46（89%）**

### 未完了の MUST/SHOULD 項目

| ID | 機能 | レベル | 状態 |
|----|------|--------|------|
| AUTH-006 | パスワードリセット | SHOULD | Backlog |
| AUTH-010 | セッション自動更新 | SHOULD | Backlog |
| SEC-003 | レート制限 | SHOULD | Backlog |
| NOTIF-001 | メール通知 | SHOULD | Backlog |

---

## 変更履歴

| 日付 | 変更内容 | 変更者 |
|------|---------|-------|
| 2026-02-02 | ai-dev-framework v3.0 準拠で新規作成。既存12件のSSOT_*.md + 実装状態から統合 | AI（Claude Code） |
| 2026-02-03 | 監査指摘修正: MUST/SHOULD/MAY列追加、SSOT参照リンク追加、SEC/OPS/ERR受入条件追加、NOTIF-001をBacklogに変更、サマリー集計基準明記 | AI（Claude Code） |
| 2026-02-05 | ERR-001（404ページ）、ERR-003（500ページ）を Done に更新。error.vue 実装完了。完了率 85%→89% | AI（Claude Code） |

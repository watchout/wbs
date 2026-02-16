# SSOT: ミエルボード for 現場 / ミエルボード [DETAIL]

> 機能ID: FEAT-GENBA-001
> ステータス: Implemented
> 最終更新: 2026-02-05
> 関連: SSOT-1 #SCHED-001〜003

**プロジェクト**: ミエルボード for 現場
**第1弾モジュール**: ミエルボード（週間ボード）
**バージョン**: v2.0
**層**: DETAIL（Freeze 4） - 止まらないルール適用

---

## 12セクション形式マッピング

| # | セクション | 対応する既存セクション |
|---|-----------|----------------------|
| 1 | 概要 | §0 前提と役割整理, §1 プロジェクトのゴール |
| 2 | ユーザーストーリー | §1-2 Phase 0 のゴール（達成条件） |
| 3 | 画面仕様 | §3-1 週間ボードUI, §3-2 サイネージ表示 |
| 4 | API仕様 | §3-3 データ取得・整形 |
| 5 | データモデル | §3-3 データモデル, §4-4 DB変更禁止ポリシー |
| 6 | ビジネスロジック | §3-3 表示テキスト整形 |
| 7 | エラーハンドリング | §4 アーキテクチャ・制約（SSOT-5参照） |
| 8 | セキュリティ | §4-2 マルチテナント, §4-3 認証・権限 |
| 9 | パフォーマンス | §3-2 サイネージ表示（表示基準） |
| 10 | テストケース | §5 開発体制・品質管理 |
| 11 | 実装メモ | §6 主要コンポーネント・API |
| 12 | 未決事項 | §7 今後の拡張（Phase 1以降） |

---

## 1. 概要 (Overview)

このドキュメントは **「ミエルボード for 現場 / ミエルボード」の設計における唯一の正（Single Source of Truth）** です。

- すべての実装はこのSSOTに基づく
- 仕様変更はこのドキュメントの更新から始める
- 設計AI・実装AIはこのSSOTを最優先で参照する

---

## 0. 前提と役割整理

### ブランド三層構造

```
┌─────────────────────────────────────────┐
│ ミエルボード（MielBoard）                   │
│ 汎用ホワイトボードDX基盤                     │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ ミエルボード for 現場                        │
│ 現場仕事（弱電・電気工事）向け業界パッケージ    │
└─────────────────────────────────────────┘
              ↓
┌─────────────────────────────────────────┐
│ ミエルボード（週間ボード）                  │
│ 「今週、誰がどこで何をしているか」を見せる     │
│ キラーモジュール                            │
└─────────────────────────────────────────┘
```

### 名称定義

| 名称 | 役割 | スコープ |
|------|------|---------|
| **ミエルボード** | 汎用ホワイトボードDX基盤 | 全業界対応可能 |
| **ミエルボード for 現場** | 現場仕事向けバーティカル版 | 弱電・電気工事・設備系 |
| **ミエルボード** | 週間スケジュールボードモジュール | Phase 0 の主力機能 |

---

## 1. プロジェクトのゴール（Phase 0）

### 1-1. ターゲット

**主要ペルソナ**: 株式会社サクシード（弱電SI・電気工事会社）

#### 企業特性
- 従業員規模: 10〜50名
- 業種: 弱電・AV・ネットワーク・会議室設備・ホテルシステム
- 対象施設: ビル／ホテル／商業施設

#### 現状の課題
- ✅ 週間スケジュールは **事務所のホワイトボードに手書き**
- ✅ 誰がどこにいるかを把握するのに：
  - ボード前まで見に行く
  - 電話／LINEで確認
- ✅ 個人予定はカレンダーにあるが、「全員の今週」が一目で見えない

---

### 1-2. Phase 0 のゴール

> **サクシード社の事務所のTVに、「今週、誰がどこで何をしているか」が一枚で見えるボードを実現する**

#### 達成条件

- [ ] 社員 × 曜日のマトリクスがTVに常時表示される
- [ ] 予定データは既存カレンダー（Google / Outlook）から自動取得
- [ ] 部門フィルタで「工事」「営業」「保守」を切り替えられる
- [ ] 週の切り替え（前週／今週／翌週）ができる
- [ ] 紙ホワイトボードの「パッと見て全員の動きが分かる」良さを維持

#### スコープ外（Phase 1以降）

- 入出荷スケジュール
- 在庫・資産管理
- アルコールチェック
- AIコンシェルジュ

※ ただし、設計上はこれらが後から乗ることを意識する

---

## §2. ミエルボード for 現場の構成イメージ

### 2-1. 将来的なモジュール構成（Phase 0 〜 Phase 2）

```
ミエルボード for 現場
├── ミエルボード（Phase 0）     ← 今ここ
│   └── 週間スケジュールボード
├── 現場STOCK（Phase 1）
│   ├── 入出荷スケジュール
│   └── 在庫・資産管理
├── 現場ALCOHOL（Phase 1）
│   └── アルコールチェック記録
└── 現場AI（Phase 2）
    └── 社内AIコンシェルジュ
```

### 2-2. 設計上の配慮

- **Phase 0** では「ミエルボード」のみ実装
- ただし、将来のモジュール追加を阻害しない設計：
  - `Schedule.metadata` を活用した拡張
  - API構造の一貫性
  - UI のタブ構造（将来追加可能）

---

## 3. ミエルボード（Phase 0）の機能スコープ

### 3-1. 週間ボードUI

#### 画面構成

**URL例**: `/org/[slug]/weekly-board` または `/org/[slug]/genba/weekly`

#### レイアウト

```
┌─────────────────────────────────────────────────────────────┐
│ ミエルボード - 週間スケジュールボード      [全員 ▼] [今週 ◀ ▶] │
├─────────┬─────┬─────┬─────┬─────┬─────┬─────┬─────┤
│ 社員名   │ 月   │ 火   │ 水   │ 木   │ 金   │ 土   │ 日   │
├─────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ 田中太郎 │ 9-18 │ 9-18 │ 9-18 │ 休み │ 9-18 │     │     │
│ (工事)   │ ◯◯   │ ◯◯   │ △△   │      │ ◯◯   │     │     │
│          │ ホテル│ ホテル│ 旅館  │      │ ホテル│     │     │
├─────────┼─────┼─────┼─────┼─────┼─────┼─────┼─────┤
│ 佐藤花子 │ 10-16│ 9-18 │ 9-18 │ 9-18 │ 10-16│     │     │
│ (営業)   │ 打合せ│ ◯◯   │ ◯◯   │ ◯◯   │ 打合せ│     │     │
│          │      │ ホテル│ ホテル│ ホテル│      │     │     │
└─────────┴─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

#### セル表示ルール

各セルには以下を表示：

1. **時間帯**: `9-18` / `10-16` など
2. **現場名**: `◯◯ホテル` / `△△旅館` など
3. **用件**: `工事` / `打合せ` / `保守` など

**表示例**:
- `9-18 ◯◯ホテル 新館工事`
- `10-16 △△旅館 打合せ`
- `休み`

#### 操作要素

| 要素 | 機能 |
|------|------|
| **部門フィルタ** | 全員／工事／営業／保守 |
| **週切り替え** | [前の週] [今週] [次の週] |
| **フルスクリーンモード** | サイネージ表示用 |

---

### 3-2. サイネージ表示（大型ディスプレイ対応）

#### 想定環境
| 項目 | 基準 |
|------|------|
| **ディスプレイ** | 43インチ以上 / フルHD（1920x1080） |
| **視認距離** | 3m程度 |

#### 表示基準
| 項目 | 基準 |
|------|------|
| **最小フォント** | 16px以上（約1rem） |
| **社員名** | 20px以上（太字） |
| **曜日** | 24px以上（太字） |
| **セル内容** | 18px以上、2行まで |

#### 配色（ダークテーマ）
| 要素 | 色 |
|------|-----|
| **背景** | #16213e（濃紺） |
| **文字** | #eee（明るいグレー） |
| **休み背景** | #3d2c1f（暖色） |
| **終日背景** | #1a3a5c（青） |
| **ヘッダー背景** | #0f3460 |

#### URL
```
/org/[slug]/weekly-board?fullscreen=true
```
または `/org/[slug]/display` からリダイレクト

---

### 3-3. データ取得・整形

#### API仕様（例）

**エンドポイント**: `GET /api/schedules/weekly-board`

**リクエストパラメータ**:
```typescript
{
  organizationId: string;  // 組織ID（認証から自動取得）
  startDate: string;       // 週の開始日（YYYY-MM-DD）
  department?: string;     // 部門フィルタ（optional）
}
```

**レスポンス**:
```typescript
{
  weekStart: string;
  weekEnd: string;
  employees: [
    {
      id: string;
      name: string;
      department: string;
      schedules: {
        monday: { displayText: "9-18 ◯◯ホテル 工事", ... },
        tuesday: { displayText: "9-18 ◯◯ホテル 工事", ... },
        // ... 以下同様
      }
    }
  ]
}
```

---

#### データモデル

**既存 `Schedule` テーブルを使用（原則スキーマ変更禁止・例外あり）**

**拡張方法**: `Schedule.description` (String) フィールドにJSON文字列を格納して追加情報を保持

> **Phase 0 方針確定（WBS-39）**: スキーマ変更禁止ポリシーに従い、`metadata` カラム追加ではなく `description` にJSONを格納する方式を採用。

```typescript
// Schedule.description に格納するJSON文字列の構造例
// description: '{"siteName":"◯◯ホテル","activityType":"工事"}'
{
  siteName: "◯◯ホテル",        // 現場名
  activityType: "工事"         // 用件
}
```

---

#### 表示テキスト整形

**ユーティリティ**: `server/utils/scheduleFormatter.ts`

```typescript
export function formatScheduleForDisplay(schedule: Schedule): string {
  const metadata = parseScheduleMetadata(schedule.description);  // JSON文字列をパース
  const start = formatTime(schedule.start);  // "9"
  const end = formatTime(schedule.end);      // "18"
  const siteName = metadata?.siteName || "";
  const activityType = metadata?.activityType || "";
  
  return `${start}-${end} ${siteName} ${activityType}`;
  // => "9-18 ◯◯ホテル 工事"
}
```

---

### 3-3. 入力フロー（Phase 0）

#### 第一候補: 外部カレンダー連携

- **Google Calendar** / **Outlook Calendar** からイベント取得
- 社員単位で接続設定
- 定期的に同期（例: 15分ごと）

#### 代替案: 簡易入力UI

- 管理者が管理画面から直接スケジュールを編集
- 最低限のフォーム（日付・時間・現場名・用件）

#### 将来: AIコンシェルジュ

- 自然文入力: 「木曜9〜18時で◯◯ホテルLAN工事入れて」
- → Schedule に自動登録
- ※ Phase 0 では実装しないが、API構造は差し込みやすく設計

---

## 4. アーキテクチャ・制約

### 4-1. 技術スタック

**既存ミエルボード基盤を踏襲**

| レイヤー | 技術 |
|---------|------|
| **フロントエンド** | Nuxt 3 + Vue 3 + TypeScript + Pinia |
| **スタイリング** | Scoped CSS（Vue SFC） |
| **バックエンド** | Nuxt Server API (`server/api/`) |
| **データベース** | PostgreSQL + Prisma（**生SQL禁止**） |
| **リアルタイム** | Socket.IO |
| **インフラ** | ConoHa VPS + Nginx + Docker |
| **IaC** | Terraform |

---

### 4-2. マルチテナント

**方式**: 論理マルチテナント

#### 原則

- ✅ すべての業務データに `organizationId` を付与
- ✅ すべてのAPIで `organizationId` によるフィルタ必須
- ✅ `requireAuth()` でユーザー認証 + 組織ID取得

#### URL構造

```
/org/[slug]/...
```

- `slug` → DB経由で `organizationId` を解決
- 例: `/org/succeed/weekly-board`

#### テナント展開

- **サクシード社**: 最初のテナント
- **将来**: 他の弱電・電気工事会社へ横展開

---

### 4-3. 認証・権限（RBAC）

#### 認証方式

- **JWT + Cookie**
- ログイン時にJWT発行 → HttpOnly Cookie保持
- API では `requireAuth(event)` で検証

#### 権限レベル（1〜5）

| レベル | 役割 | 権限 |
|--------|------|------|
| **1-2** | 一般社員 | 自分の予定閲覧・一部編集 |
| **3-4** | リーダー／配車担当 | 部署メンバーの予定編集 |
| **5** | 管理者 | 組織設定・社員管理・表示設定 |
| **SuperAdmin** | 開発側 | 全テナント管理（プラン・課金） |

---

### 4-4. DB変更禁止ポリシー

#### 原則

- ❌ **`prisma/schema.prisma` の変更禁止**
- ❌ **マイグレーションファイルの作成禁止**
- ✅ **`Schedule.metadata` で拡張**

#### 理由

- スキーマ変更は全テナントに影響
- マイグレーション失敗リスク
- 既存データの整合性維持

#### 拡張が必要な場合

1. まず `metadata` で解決できないか検討
2. どうしても必要な場合は総監修レベルで判断
3. Phase 0 では原則として新テーブル追加なし

---

## 5. 開発体制・品質管理

このプロジェクトは **小さなSaaSチーム用の品質基盤** を前提に運用します。

### 5-1. ルールレイヤー（`.cursorrules`）

AIが守るべき開発ルール：

- ✅ スキーマ変更は原則禁止（例外: 管理AI承認 + 影響範囲修正が揃う場合のみ）
- ✅ マルチテナント分離必須
- ✅ 生SQL禁止（Prisma ORMのみ）
- ✅ `requireAuth()` 使用必須

---

### 5-2. ツールレイヤー（GitHub / CI）

#### CI/CD（`.github/workflows/ci.yml`）

- `lint-and-typecheck`: TypeScript型エラー検出
- `build`: ビルド検証
- `security`: `npm audit` / secret scan
- `ssot-compliance`: 禁止パターン検出

#### PRテンプレート（`.github/PULL_REQUEST_TEMPLATE.md`）

必須セクション：

- `## 参照SSOT`: このSSOTへのリンク
- `## テスト・証跡`: コマンド + ログ
- `## 禁止パターンチェック`: スキーマ変更なし等
- `## DoD`: 完了定義チェックリスト

---

### 5-3. 運用レイヤー（Docs）

| ドキュメント | 目的 |
|-------------|------|
| `docs/QUALITY_MANAGEMENT_OVERVIEW.md` | 品質管理の全体像 |
| `docs/TEST_STRATEGY.md` | テストを書くべき層の明示 |
| `docs/BRANCH_AND_RELEASE.md` | ブランチ戦略・リリースフロー |
| `docs/DONE_DEFINITION.md` | 完了の定義 |

---

### 5-4. 設計AIへの重要ポイント

#### 新しい仕様・設計を提案するときは：

1. ✅ このSSOTとの整合性を確認
2. ✅ 品質管理ドキュメントとの整合性を確認
3. ✅ スキーマ変更が発生しないか確認
4. ✅ マルチテナント境界が曖昧になっていないか確認
5. ✅ テスト戦略上「必須テスト対象」かどうか判断

#### ルール抵触の可能性がある場合：

- 代替案・妥協案もあわせて提案
- 「なぜそのルールがあるのか」を理解した上で判断

---

## 6. Phase 0 の主要コンポーネント・API

### 6-1. 新規作成予定のファイル

#### フロントエンド

| ファイル | 役割 |
|---------|------|
| `components/genba/WeeklyScheduleBoard.vue` | 週間ボードマトリクス表示 |
| `pages/org/[slug]/weekly-board.vue` | 週間ボードページ |
| `composables/useWeeklyBoard.ts` | 週間ボード用の状態管理 |

#### バックエンド

| ファイル | 役割 |
|---------|------|
| `server/api/schedules/weekly-board.get.ts` | 週間ボード用データ取得API |
| `server/utils/scheduleFormatter.ts` | スケジュール表示テキスト整形 |

---

### 6-2. 既存コンポーネントの再利用

| コンポーネント | 用途 |
|---------------|------|
| `WeeklyCalendar.vue` | 参考実装（カレンダー表示） |
| `EmployeeScheduleMatrix.vue` | 参考実装（社員×日付マトリクス） |

---

## 7. 今後の拡張（Phase 1 以降）

### 7-1. Phase 1: 入出荷・在庫

**新モジュール**: 現場STOCK

- 入出荷スケジュール（Shipment）
- 在庫・資産管理（Asset / Inventory）
- `Schedule` と結びつけて「この現場にこの資材を持っていく」を管理

---

### 7-2. Phase 2: アルコールチェック・車両管理

**新モジュール**: 現場ALCOHOL

- 車両・ドライバー・スケジュールの紐付け
- アルコールチェック記録（AlcoholCheck）

---

### 7-3. Phase 3: 社内AIコンシェルジュ

**新モジュール**: 現場AI

- 自然文での予定登録
- 横断検索（「今週◯◯ホテルに入っている現場全部出して」）
- RAGベースの社内情報QA

---

## 8. 設計AI向けタスク

以下を設計AIに依頼します：

### 8-1. SSOT維持

- ✅ このドキュメント（`SSOT_GENBA_WEEK.md`）を常に最新に保つ
- ✅ 仕様変更があれば、まずこのSSOTを更新

### 8-2. Phase 0 仕様のブラッシュアップ

- ✅ `docs/phase0_weak_current_spec.md` の作成
  - 名称を「ミエルボード for 現場」「ミエルボード」に統一
  - 用語を弱電・電気工事寄りにチューニング
  - 画面・API・データの対応関係を図や表で整理

### 8-3. 品質ルールを前提にした設計チェック

新しい提案時に毎回チェック：

- [ ] スキーマ変更が発生しないか
- [ ] マルチテナント境界が曖昧になっていないか
- [ ] テスト戦略上「必須テスト対象」かどうか
- [ ] ルール抵触があれば代替案を提示

---

## §8. Tenancy（マルチテナント境界）

> このプロジェクトは **organizationId が境界の要** である。
> RFC 2119 キーワード: MUST / MUST NOT / SHOULD / MAY を使用。違反時は 403 error を返す。

### 8.1 テナント境界

- **boundary**: tenant = `organizationId`（UUID）
- 全ての業務データ（Schedule, ScheduleVersion, Department, User, Device, AuditLog）は organizationId を持ち、テナント単位で論理分離される

### 8.2 認証

- **auth**: 全APIエンドポイントで `requireAuth(event)` を呼び出し、`AuthContext` を取得しなければならない（**MUST**）。未認証の場合は 401 error を return する
- 認証例外エンドポイント: **なし**（Phase 0 の週間ボード機能においてパブリックAPIは存在しない）
- デバイスログイン（サイネージ用）は `kioskSecret` による認証を経て `organizationId` を解決する。この場合も `requireAuth()` を通過する（**MUST**）。失敗時は 401 error を return する

### 8.3 DBフィルタ

- **db_filter**: 全ての Prisma クエリの `where` 句に `organizationId` フィルタを含めなければならない（**MUST**）。フィルタ欠落時は 0 件を return する
- `findMany`, `findFirst`, `findUnique`, `create`, `update`, `delete` いずれの操作（計6種）でも `organizationId` を使用する（**MUST**、欠落時は error）
- ソフトデリート済みレコードの除外（`deletedAt: null`）もあわせて適用すべきである（**SHOULD**）

### 8.4 禁止パターン（MUST NOT、違反時は 500 error）

以下の4パターンは実装において **MUST NOT** とする（違反時は 500 error）:

| パターン | 理由 |
|---------|------|
| `organizationId` なしの Prisma クエリ | テナント境界破壊 |
| `organizationId ?? 'default'` 等のフォールバック | テナント汚染リスク |
| 他テナントの `organizationId` を直接指定するクエリ | クロステナントアクセス |
| `$queryRaw` / `$executeRaw` による生SQL | Prisma ガードレール回避 |

### 8.5 境界テスト要件

- テナント境界テストの実装は **MUST** とする（最低3シナリオ、false を return して拒否を確認）
- 最低限必要なテストシナリオ:
  - Organization A のユーザーが Organization B のスケジュールを取得できないこと
  - Organization A のユーザーが Organization B の部署一覧を取得できないこと
  - `organizationId` を偽装したリクエストが拒否されること

---

## §9. Data Model / Migration（データモデル・マイグレーション）

> Phase 0 ではスキーマ変更禁止ポリシーを採用。既存テーブルの `description` フィールドを拡張データの格納先とする。

### 9.1 スキーマ変更

- **schema_changes**: no（Phase 0 では原則スキーマ変更なし）
- 拡張データは `Schedule.description` に JSON 文字列として格納する

### 9.2 関連 Prisma モデル

- **prisma_models_changed**: 構造変更なし（既存モデルをそのまま使用）
- 本機能が参照する主要モデル:

| モデル | 役割 | organizationId |
|--------|------|----------------|
| `Schedule` | スケジュールデータ本体 | **MUST**（欠落時 0 件 return） |
| `ScheduleVersion` | スケジュール変更履歴（親の Schedule 経由でテナント分離） | 間接参照 |
| `User` | 社員情報・スケジュールの author | **MUST**（欠落時 403 error） |
| `Department` | 部署情報・フィルタ用 | **MUST**（欠落時 0 件 return） |
| `Device` | サイネージ端末 | **MUST**（欠落時 401 error） |
| `Organization` | テナントマスタ | PK |

### 9.3 マイグレーションルール

- **migration_required**: no（Phase 0 ではマイグレーション不要）
- 既存 `prisma/migrations/**/migration.sql` の編集は **MUST NOT** とする（CI で検出し error を return する）
- 将来スキーマ変更が必要になった場合は `npx prisma migrate dev --name <name>` で新規マイグレーション1ファイルを追加する（**MUST**、追加数 1 以上）
- `$queryRaw` / `$executeRaw` によるDDL/DMLは **MUST NOT** とする（CI forbidden-operations チェックで error を return する）

---

## §10. Contract（API・UI・エラー契約）

### 10.1 API Contract

#### (A) Schedules API

##### GET /api/schedules/weekly-board

- **auth**: `requireAuth(event)` **MUST**（未認証時 401 error を return）
- **request**:
  ```typescript
  // Query Parameters
  {
    startDate?: string   // YYYY-MM-DD（省略時は今週）
    departmentId?: string // 部門フィルタ（optional）
  }
  ```
- **response**:
  ```typescript
  interface WeeklyBoardResponse {
    success: boolean
    weekStart: string          // YYYY-MM-DD
    weekEnd: string            // YYYY-MM-DD
    employees: EmployeeSchedule[]
    organizationId: string
  }
  ```
- **validation**: `startDate` は有効な日付形式であること（**MUST**）。不正な場合は 400 を返す
- **side effects**: なし（読み取り専用）

##### POST /api/schedules

- **auth**: `requireAuth(event)` **MUST**（未認証時 401 error を return）。他人の予定作成には ADMIN または同部署 LEADER 権限が必要（不足時 403 error）
- **request**:
  ```typescript
  interface CreateScheduleRequest {
    title: string            // MUST: 空文字不可（空文字で 400 error）
    description?: string
    start: string            // MUST: ISO 8601
    end: string              // MUST: ISO 8601, start < end
    authorId?: string        // 他人の予定作成時に指定
    color?: string
  }
  ```
- **response**: `{ success: boolean, schedule: { id, title, description, start, end, authorId, color, createdAt } }`
- **validation**: title 必須、start/end 必須・形式チェック・前後関係チェック（**MUST**）。違反時は 400 error を return する
- **side effects**: Schedule レコード1件作成

##### PATCH /api/schedules/:id

- **auth**: `requireAuth(event)` **MUST**（未認証時 401 error を return）。ADMIN / LEADER（同部署）/ 本人のみ編集可（権限不足時 403 error）
- **request**: `UpdateScheduleRequest`（全フィールド optional）
- **response**: `{ success: boolean, schedule: { id, title, description, start, end, authorId, color, updatedAt } }`
- **validation**: title 空文字不可、start/end 形式・前後関係チェック（**MUST**）。違反時は 400 error を return する
- **side effects**: Schedule レコード更新

##### DELETE /api/schedules/:id

- **auth**: `requireAuth(event)` **MUST**（未認証時 401 error を return）。ADMIN / LEADER（同部署）/ 本人のみ削除可（権限不足時 403 error）
- **response**: `{ success: true, message: string }`
- **side effects**: ソフトデリート（`deletedAt` を設定）。物理削除は **MUST NOT**（物理削除試行時は 400 error を return する）

#### (B) Departments API

##### GET /api/departments

- **auth**: `requireAuth(event)` **MUST**（未認証時 401 error を return）
- **response**: `{ success: true, departments: DepartmentResponse[] }`
- ソフトデリート済みは除外される（**MUST**）。`deletedAt != null` のレコードは response に含めず 0 件扱いとする

##### POST /api/departments

- **auth**: `requireAuth(event)` + ADMIN 権限 **MUST**（権限不足時 403 error を return）
- **request**: `{ name: string, color?: string, sortOrder?: number }`

##### PATCH /api/departments/:id

- **auth**: `requireAuth(event)` + ADMIN 権限 **MUST**（権限不足時 403 error を return）

##### DELETE /api/departments/:id

- **auth**: `requireAuth(event)` + ADMIN 権限 **MUST**（権限不足時 403 error を return）

### 10.2 UI Contract

#### (B) 画面状態

- **entrypoint**: `/org/[slug]/weekly-board`（通常表示）、`?fullscreen=true`（サイネージ表示）

| 状態 | 条件 | 表示内容 |
|------|------|---------|
| **loading** | API応答待ち | スケルトンローダー（マトリクス形状のプレースホルダー） |
| **empty** | employees 配列が空 | 「スケジュールが登録されていません」メッセージ |
| **error** | API 401 | ログイン画面へリダイレクト |
| **error** | API 500 | 「データの取得に失敗しました。再読み込みしてください」 |
| **data** | 正常取得 | 社員×曜日マトリクスを表示 |
| **fullscreen** | `?fullscreen=true` | ダークテーマ、フォント拡大、ヘッダー非表示 |

- **accessibility**: フォントサイズ 16px 以上（**MUST**）。サイネージモードでは 18px 以上（**SHOULD**）。基準未達の場合は error ログを出力

### 10.3 Error Spec

| error_code | HTTP | condition | user_message | retry | logging |
|-----------|------|-----------|--------------|-------|---------|
| AUTH_REQUIRED | 401 | セッション未認証 / 期限切れ | 「認証が必要です」 | no（ログインへ遷移） | warn |
| FORBIDDEN | 403 | 権限不足（MEMBER が他人の予定を編集等） | 「このスケジュールを編集する権限がありません」 | no | warn |
| INVALID_DATE | 400 | startDate パラメータが不正 | 「有効な日付を指定してください（YYYY-MM-DD）」 | no | info |
| TITLE_REQUIRED | 400 | title が空 | 「タイトルは必須です」 | no | info |
| INVALID_DATETIME | 400 | start/end の形式が不正 | 「日時の形式が不正です」 | no | info |
| INVALID_RANGE | 400 | start >= end | 「開始日時は終了日時より前である必要があります」 | no | info |
| NOT_FOUND | 404 | 指定IDのスケジュールが存在しない | 「スケジュールが見つかりません」 | no | info |
| USER_NOT_FOUND | 400 | authorId で指定されたユーザーが存在しない | 「指定されたユーザーが見つかりません」 | no | info |
| INTERNAL_ERROR | 500 | サーバー内部エラー | 「週間ボードの取得に失敗しました」 | yes（リトライ可） | error |

### 10.4 Compatibility

- **既存仕様との互換**: 既存の Schedule / User / Department テーブル構造に依存。破壊的変更なし
- **破壊的変更**: no
- **versioning**: API バージョニングは Phase 0 では未導入。将来的にヘッダーベースのバージョニングを導入してもよい（**MAY**）

---

## §11. Security & Privacy（セキュリティ・プライバシー）

### 11.1 認証（authn）

- **方式**: JWT + HttpOnly Cookie（セッションベース）
- 全 API エンドポイントで `requireAuth(event)` を呼び出す（**MUST**）。未呼出の場合 401 error を return
- セッションは Sliding Window 方式で自動延長される
- 開発環境のみクエリパラメータ / ヘッダーによる認証バイパスを許可する（**MAY**）。本番環境では **MUST NOT**（本番でバイパス検出時は 403 error を return）

### 11.2 認可（authz）

- **RBAC モデル**:

| ロール | スケジュール閲覧 | 自分の予定編集 | 他人の予定編集 | 部署管理 | 組織設定 |
|--------|:---:|:---:|:---:|:---:|:---:|
| MEMBER | o | o | x | x | x |
| LEADER | o | o | o（同部署のみ） | x | x |
| ADMIN | o | o | o（全員） | o | o |
| DEVICE | o（閲覧専用） | x | x | x | x |

- 権限チェックには `requireAdmin()`, `requireLeader()`, `requireScheduleEditPermission()` の3関数を使用する（**MUST**）。権限不足時は 403 error を return
- フロントエンド側でもロールに応じた操作UIの表示/非表示を制御する（**SHOULD**）

### 11.3 バリデーション

- 全ユーザー入力は Zod スキーマまたは手動バリデーションで検証する（**MUST**）。検証失敗時は 400 error を return
- 現在の実装は手動バリデーション。将来的に Zod スキーマへの移行を推奨する（**SHOULD**）
- バリデーション項目:
  - `title`: 非空文字列、最低1文字（**MUST**）。空文字時は 400 error
  - `start` / `end`: ISO 8601 形式、start < end（**MUST**、違反時は 400 error）
  - `startDate`（クエリ）: YYYY-MM-DD 形式（**MUST**）。不正時は 400 error を return
  - `departmentId`（クエリ）: UUID 形式（**SHOULD**）

### 11.4 シークレット管理

- 環境変数経由で管理する（**MUST**）。ハードコード検出時は CI で error を return
- ソースコード内へのハードコードは **MUST NOT**（検出時は CI error で false 判定）
- `.env` ファイルは `.gitignore` に含める（**MUST**）。含まれていない場合は CI で error

### 11.5 PII（個人情報）

- **pii**: present
- 含まれる PII:
  - `User.email` — 認証コンテキストおよび API レスポンスに含まれる
  - `User.name` — 週間ボードの社員名表示に使用
- PII をサーバーログに出力してはならない（**MUST NOT**）。検出時はセキュリティ error として報告（severity: 1）
- API レスポンスの `email` フィールドは週間ボード表示には不要であり、フロントエンドで非表示にすべきである（**SHOULD**）

### 11.6 監査ログ

- **audit_log**: required
- スケジュールの作成・更新・削除操作は `AuditLog` テーブルに記録すべきである（**SHOULD**）
- ログ項目: `organizationId`, `userId`, `action`（例: `SCHEDULE_CREATE`, `SCHEDULE_UPDATE`, `SCHEDULE_DELETE`）, `targetId`, `meta`（変更内容の JSON）
- 監査ログ自体も `organizationId` でフィルタする（**MUST**）。フィルタ欠落時は 0 件を return

---

## §12. Config（設定・環境変数）

> **Config First 原則**: 環境依存の値はすべて環境変数で管理する（**MUST**）。未設定の場合は起動時に error を return する。

| category | key | type | default | scope | change_risk | description |
|----------|-----|------|---------|-------|-------------|-------------|
| database | `DATABASE_URL` | string | (なし) | env | high | PostgreSQL 接続文字列。全環境で必須（**MUST**）。未設定時は起動 error |
| auth | `JWT_SECRET` | string | (なし) | env | high | JWT 署名用シークレット。本番では32文字以上のランダム文字列を設定する（**MUST**、未設定時は起動 error） |
| auth | `SESSION_SECRET` | string | (なし) | env | high | セッション管理用シークレット |
| app | `DEFAULT_ORGANIZATION_ID` | string | `""` | env (dev only) | low | 開発モードでの認証バイパス用デフォルト organizationId。本番では設定しない（**MUST NOT**）。本番で検出時は起動 error |
| app | `NODE_ENV` | string | `development` | env | medium | 実行環境。`production` / `development` / `test` |
| app | `NUXT_PUBLIC_SITE_URL` | string | `http://localhost:3000` | env | low | サイトの公開URL |
| realtime | `SOCKET_IO_PORT` | number | `3001` | env | low | Socket.IO サーバーポート。週間ボードのリアルタイム更新に使用 |
| feature_flag | `ENABLE_CALENDAR_SYNC` | boolean | `false` | tenant | medium | 外部カレンダー同期機能の有効化。Phase 0 ではデフォルト無効（**MAY** 有効化） |
| feature_flag | `ENABLE_FULLSCREEN_MODE` | boolean | `true` | global | low | サイネージ用フルスクリーンモード。デフォルト有効 |

### 12.1 環境別設定

- **dev**: `DEFAULT_ORGANIZATION_ID` を設定し、認証バイパスを有効にしてもよい（**MAY**）
- **stg**: 本番と同等の設定を使用する（**SHOULD**）
- **prod**: `DEFAULT_ORGANIZATION_ID` は未設定とする（**MUST**）。`NODE_ENV=production` を設定する（**MUST**）。未設定時は起動 error を return

---

## §3-E 入出力例

> 主要APIの具体的な入出力例。正常系2ケース + 異常系3ケース以上を記載する。

### E-1. GET /api/schedules/weekly-board（正常系: フィルタなし）

**リクエスト**:
```http
GET /api/schedules/weekly-board?startDate=2026-02-16
Cookie: session=<valid_jwt>
```

**レスポンス** (200):
```json
{
  "success": true,
  "weekStart": "2026-02-16",
  "weekEnd": "2026-02-22",
  "organizationId": "org-uuid-001",
  "employees": [
    {
      "id": "user-uuid-001",
      "name": "田中太郎",
      "department": "工事",
      "schedules": {
        "monday": { "displayText": "9-18 ◯◯ホテル 新館工事", "start": "2026-02-16T09:00:00Z", "end": "2026-02-16T18:00:00Z" },
        "tuesday": { "displayText": "9-18 ◯◯ホテル 新館工事", "start": "2026-02-17T09:00:00Z", "end": "2026-02-17T18:00:00Z" },
        "wednesday": { "displayText": "休み", "start": null, "end": null },
        "thursday": { "displayText": "10-16 △△旅館 打合せ", "start": "2026-02-19T10:00:00Z", "end": "2026-02-19T16:00:00Z" },
        "friday": { "displayText": "9-18 ◯◯ホテル 新館工事", "start": "2026-02-20T09:00:00Z", "end": "2026-02-20T18:00:00Z" },
        "saturday": { "displayText": "", "start": null, "end": null },
        "sunday": { "displayText": "", "start": null, "end": null }
      }
    }
  ]
}
```

### E-2. POST /api/schedules（正常系: 新規スケジュール作成）

**リクエスト**:
```http
POST /api/schedules
Cookie: session=<valid_jwt>
Content-Type: application/json

{
  "title": "◯◯ホテル LAN工事",
  "description": "{\"siteName\":\"◯◯ホテル\",\"activityType\":\"LAN工事\"}",
  "start": "2026-02-18T09:00:00Z",
  "end": "2026-02-18T18:00:00Z",
  "color": "#1a73e8"
}
```

**レスポンス** (201):
```json
{
  "success": true,
  "schedule": {
    "id": "sched-uuid-new-001",
    "title": "◯◯ホテル LAN工事",
    "description": "{\"siteName\":\"◯◯ホテル\",\"activityType\":\"LAN工事\"}",
    "start": "2026-02-18T09:00:00Z",
    "end": "2026-02-18T18:00:00Z",
    "authorId": "user-uuid-001",
    "color": "#1a73e8",
    "createdAt": "2026-02-15T12:00:00Z"
  }
}
```

### E-3. GET /api/schedules/weekly-board（異常系: 未認証）

**リクエスト**:
```http
GET /api/schedules/weekly-board?startDate=2026-02-16
```
（Cookie なし）

**レスポンス** (401):
```json
{
  "success": false,
  "error": {
    "code": "AUTH_REQUIRED",
    "message": "認証が必要です"
  }
}
```

### E-4. POST /api/schedules（異常系: バリデーションエラー — title 空文字）

**リクエスト**:
```http
POST /api/schedules
Cookie: session=<valid_jwt>
Content-Type: application/json

{
  "title": "",
  "start": "2026-02-18T09:00:00Z",
  "end": "2026-02-18T18:00:00Z"
}
```

**レスポンス** (400):
```json
{
  "success": false,
  "error": {
    "code": "TITLE_REQUIRED",
    "message": "タイトルは必須です"
  }
}
```

### E-5. POST /api/schedules（異常系: start >= end の不正範囲）

**リクエスト**:
```http
POST /api/schedules
Cookie: session=<valid_jwt>
Content-Type: application/json

{
  "title": "◯◯ホテル 保守点検",
  "start": "2026-02-18T18:00:00Z",
  "end": "2026-02-18T09:00:00Z"
}
```

**レスポンス** (400):
```json
{
  "success": false,
  "error": {
    "code": "INVALID_RANGE",
    "message": "開始日時は終了日時より前である必要があります"
  }
}
```

### E-6. PATCH /api/schedules/:id（異常系: 権限不足）

**リクエスト**:
```http
PATCH /api/schedules/sched-uuid-999
Cookie: session=<valid_jwt_member_role>
Content-Type: application/json

{
  "title": "変更しようとした"
}
```
（MEMBER ロールのユーザーが他人のスケジュールを編集しようとした場合）

**レスポンス** (403):
```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "このスケジュールを編集する権限がありません"
  }
}
```

### E-7. DELETE /api/schedules/:id（異常系: 存在しないID）

**リクエスト**:
```http
DELETE /api/schedules/sched-uuid-nonexistent
Cookie: session=<valid_jwt>
```

**レスポンス** (404):
```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "スケジュールが見つかりません"
  }
}
```

---

## §3-F 境界値

> 各データ項目の境界値定義。バリデーションおよびテストで使用する。

### F-1. Schedule フィールド境界値

| フィールド | 型 | 最小値 | 最大値 | 境界パターン | MUST 条件 |
|-----------|-----|--------|--------|-------------|-----------|
| `title` | string | 1文字 | 200文字 | 空文字 → 400 error、1文字 → OK、200文字 → OK、201文字 → 400 error | MUST 1 文字以上 |
| `description` | string | 0文字（optional） | 5000文字 | null → OK、空文字 → OK、5000文字 → OK、5001文字 → 400 error | MUST 5000 文字以下 |
| `start` | ISO 8601 | 現在日時 - 1年 | 現在日時 + 2年 | 過去1年超 → 400 error、未来2年超 → 400 error | MUST true（有効な ISO 8601 形式） |
| `end` | ISO 8601 | start + 1分 | start + 24時間 | start と同値 → 400 error、start - 1分 → 400 error | MUST true（end > start） |
| `color` | string | 4文字（`#RGB`） | 7文字（`#RRGGBB`） | null → OK（デフォルト色）、不正形式 → 400 error | MUST true（`/^#[0-9a-fA-F]{3,6}$/` に一致） |

### F-2. クエリパラメータ境界値

| パラメータ | 型 | 境界パターン | 結果 |
|-----------|-----|-------------|------|
| `startDate` | YYYY-MM-DD | 省略 → 今週の月曜日をデフォルト | MUST true（有効日付 or 省略） |
| `startDate` | YYYY-MM-DD | `"2026-02-16"` → 正常 | 200 response |
| `startDate` | YYYY-MM-DD | `"2026-13-01"` → 不正月 | MUST 400 error を return |
| `startDate` | YYYY-MM-DD | `"not-a-date"` → 形式不正 | MUST 400 error を return |
| `startDate` | YYYY-MM-DD | `"2026-02-30"` → 存在しない日 | MUST 400 error を return |
| `departmentId` | UUID | 省略 → 全部署対象 | 200 response |
| `departmentId` | UUID | 存在するUUID → フィルタ適用 | 200 response（該当部署のみ） |
| `departmentId` | UUID | 存在しないUUID → 空結果 | 200 response（employees: []） |

### F-3. 表示関連の境界値

| 項目 | 最小値 | 最大値 | 境界パターン |
|------|--------|--------|-------------|
| 社員数（employees配列） | 0人 | 100人 | 0人 → empty 状態表示、100人超 → ページネーション検討（Phase 1） |
| 1セルの表示テキスト長 | 0文字 | 30文字 | 30文字超 → 末尾「…」で切り捨て表示 |
| 部署数 | 0件 | 50件 | 0件 → フィルタUI非表示、50件超 → スクロール付きドロップダウン |
| 週の範囲 | 過去52週 | 未来52週 | 範囲外 → 400 error を return |

---

## §3-G 例外応答

> 全エラーケースの応答定義。各エラーコードに対する HTTP ステータス、条件、ユーザーメッセージ、リトライ可否、ログレベルを定義する。

### G-1. 認証・認可エラー

| error_code | HTTP | 条件 | user_message | retry | logging | MUST 条件 |
|-----------|------|------|--------------|-------|---------|-----------|
| AUTH_REQUIRED | 401 | Cookie なし / JWT 期限切れ / JWT 改ざん | 「認証が必要です」 | false（ログイン画面へ遷移） | warn | MUST return 401 |
| FORBIDDEN | 403 | MEMBER が他人の予定を編集・削除 | 「このスケジュールを編集する権限がありません」 | false | warn | MUST return 403 |
| ADMIN_REQUIRED | 403 | 非 ADMIN が部署管理操作を実行 | 「管理者権限が必要です」 | false | warn | MUST return 403 |
| TENANT_MISMATCH | 403 | 他テナントのリソースにアクセス試行 | 「アクセス権限がありません」 | false | error | MUST return 403 |

### G-2. バリデーションエラー

| error_code | HTTP | 条件 | user_message | retry | logging | MUST 条件 |
|-----------|------|------|--------------|-------|---------|-----------|
| TITLE_REQUIRED | 400 | title が空文字または未指定 | 「タイトルは必須です」 | false | info | MUST return 400 |
| TITLE_TOO_LONG | 400 | title が 200 文字超過 | 「タイトルは200文字以内で入力してください」 | false | info | MUST return 400 |
| INVALID_DATE | 400 | startDate が YYYY-MM-DD 形式でない | 「有効な日付を指定してください（YYYY-MM-DD）」 | false | info | MUST return 400 |
| INVALID_DATETIME | 400 | start/end が ISO 8601 形式でない | 「日時の形式が不正です」 | false | info | MUST return 400 |
| INVALID_RANGE | 400 | start >= end | 「開始日時は終了日時より前である必要があります」 | false | info | MUST return 400 |
| DESCRIPTION_TOO_LONG | 400 | description が 5000 文字超過 | 「説明は5000文字以内で入力してください」 | false | info | MUST return 400 |
| INVALID_COLOR | 400 | color が `#RGB` / `#RRGGBB` 形式でない | 「カラーコードの形式が不正です」 | false | info | MUST return 400 |

### G-3. リソースエラー

| error_code | HTTP | 条件 | user_message | retry | logging | MUST 条件 |
|-----------|------|------|--------------|-------|---------|-----------|
| NOT_FOUND | 404 | 指定 ID のスケジュールが存在しない / ソフトデリート済み | 「スケジュールが見つかりません」 | false | info | MUST return 404 |
| USER_NOT_FOUND | 400 | authorId で指定されたユーザーが存在しない | 「指定されたユーザーが見つかりません」 | false | info | MUST return 400 |
| DEPARTMENT_NOT_FOUND | 404 | 指定 ID の部署が存在しない | 「部署が見つかりません」 | false | info | MUST return 404 |

### G-4. サーバーエラー

| error_code | HTTP | 条件 | user_message | retry | logging | MUST 条件 |
|-----------|------|------|--------------|-------|---------|-----------|
| INTERNAL_ERROR | 500 | DB 接続失敗 / 未ハンドル例外 | 「週間ボードの取得に失敗しました」 | true（リトライ可） | error | MUST return 500 |
| DB_CONNECTION_ERROR | 500 | Prisma 接続タイムアウト | 「サーバーに接続できません。しばらくしてから再試行してください」 | true | error | MUST return 500 |

### G-5. 禁止操作エラー

| error_code | HTTP | 条件 | user_message | retry | logging | MUST 条件 |
|-----------|------|------|--------------|-------|---------|-----------|
| PHYSICAL_DELETE_FORBIDDEN | 400 | 物理削除を試行 | 「この操作は許可されていません」 | false | error | MUST return 400 |
| RAW_SQL_DETECTED | 500 | $queryRaw/$executeRaw の使用を CI で検出 | （ユーザー非表示、CI のみ） | false | error | MUST return error |

---

## §3-H Gherkin シナリオ

> MUST 要件に基づく受入テストシナリオ。Given/When/Then 形式で記述する。

### H-1. 週間ボード表示（認証済みユーザー）

```gherkin
Feature: 週間ボード表示
  週間スケジュールボードの表示機能

  Scenario: 認証済みユーザーが今週のスケジュールを取得する
    Given ユーザー「田中太郎」が organizationId "org-001" で認証済みである
    And organizationId "org-001" に以下のスケジュールが登録されている:
      | title            | start                   | end                     | authorId      |
      | ◯◯ホテル LAN工事  | 2026-02-16T09:00:00Z    | 2026-02-16T18:00:00Z    | user-uuid-001 |
      | △△旅館 打合せ      | 2026-02-18T10:00:00Z    | 2026-02-18T16:00:00Z    | user-uuid-001 |
    When GET /api/schedules/weekly-board?startDate=2026-02-16 を実行する
    Then レスポンスステータスは 200 である
    And レスポンスの success は true である
    And レスポンスの employees 配列に「田中太郎」が含まれる
    And 「田中太郎」の monday.displayText に "9-18" が含まれる
    And 「田中太郎」の wednesday.displayText に "10-16" が含まれる
```

### H-2. マルチテナント境界（クロステナントアクセス拒否）

```gherkin
Feature: マルチテナント境界
  テナント間のデータ分離を保証する

  Scenario: 他テナントのスケジュールにアクセスできないことを確認する
    Given ユーザー「佐藤花子」が organizationId "org-002" で認証済みである
    And organizationId "org-001" に以下のスケジュールが登録されている:
      | title              | start                   | end                     |
      | ◯◯ホテル LAN工事    | 2026-02-16T09:00:00Z    | 2026-02-16T18:00:00Z    |
    When GET /api/schedules/weekly-board?startDate=2026-02-16 を実行する
    Then レスポンスステータスは 200 である
    And レスポンスの employees 配列は空（要素数 0）である
    And organizationId "org-001" のスケジュールは response に含まれない
```

### H-3. スケジュール作成のバリデーション

```gherkin
Feature: スケジュール作成バリデーション
  スケジュール作成時の入力検証

  Scenario: title が空文字の場合 400 エラーを返す
    Given ユーザーが organizationId "org-001" で認証済みである
    When POST /api/schedules に以下のリクエストを送信する:
      | title | start                   | end                     |
      |       | 2026-02-18T09:00:00Z    | 2026-02-18T18:00:00Z    |
    Then レスポンスステータスは 400 である
    And エラーコードは "TITLE_REQUIRED" である
    And error message は「タイトルは必須です」である

  Scenario: start >= end の場合 400 エラーを返す
    Given ユーザーが organizationId "org-001" で認証済みである
    When POST /api/schedules に以下のリクエストを送信する:
      | title          | start                   | end                     |
      | ◯◯ホテル 保守   | 2026-02-18T18:00:00Z    | 2026-02-18T09:00:00Z    |
    Then レスポンスステータスは 400 である
    And エラーコードは "INVALID_RANGE" である
    And error message は「開始日時は終了日時より前である必要があります」である
```

### H-4. 未認証アクセスの拒否

```gherkin
Feature: 認証必須
  全APIエンドポイントで認証が必須であることを保証する

  Scenario: 未認証で週間ボードにアクセスすると 401 を返す
    Given ユーザーは未認証である（Cookie なし）
    When GET /api/schedules/weekly-board?startDate=2026-02-16 を実行する
    Then レスポンスステータスは 401 である
    And エラーコードは "AUTH_REQUIRED" である
    And response の success は false である

  Scenario: 未認証でスケジュールを作成しようとすると 401 を返す
    Given ユーザーは未認証である（Cookie なし）
    When POST /api/schedules に以下のリクエストを送信する:
      | title        | start                   | end                     |
      | テスト予定    | 2026-02-18T09:00:00Z    | 2026-02-18T18:00:00Z    |
    Then レスポンスステータスは 401 である
    And エラーコードは "AUTH_REQUIRED" である
    And response の success は false である
```

### H-5. 権限不足による編集拒否

```gherkin
Feature: 権限制御
  ロールに基づくスケジュール編集権限の制御

  Scenario: MEMBER ロールのユーザーが他人のスケジュールを編集しようとすると 403 を返す
    Given ユーザー「山田次郎」が MEMBER ロールで organizationId "org-001" に認証済みである
    And ユーザー「田中太郎」のスケジュール "sched-uuid-100" が存在する
    When PATCH /api/schedules/sched-uuid-100 に以下のリクエストを送信する:
      | title          |
      | 変更後タイトル   |
    Then レスポンスステータスは 403 である
    And エラーコードは "FORBIDDEN" である
    And response の success は false である
```

---

## 🔗 関連ドキュメント

### 基本SSOT
- **本ドキュメント** - ミエルボード for 現場 / ミエルボード の設計SSOT

### 詳細仕様
- `docs/phase0_weak_current_spec.md` - Phase 0 詳細仕様
- `docs/phase0_architecture.md` - アーキテクチャ設計
- `docs/UI_ROUTING_MAP.md` - UI・ルーティング設計（URL一覧・遷移図）

### 品質管理
- `docs/QUALITY_MANAGEMENT_OVERVIEW.md` - 品質管理の全体像
- `docs/TEST_STRATEGY.md` - テスト戦略
- `docs/BRANCH_AND_RELEASE.md` - ブランチ戦略
- `docs/DONE_DEFINITION.md` - 完了の定義

### AI制御
- `.cursorrules` - AI駆動開発ルール

---

**このSSOTは、「ミエルボード for 現場」プロジェクトにおける設計・実装の唯一の正です。**





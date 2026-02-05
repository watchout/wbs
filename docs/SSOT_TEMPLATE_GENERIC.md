# SSOT Template (Generic) - v1 [DETAIL]

> 目的: **設計AI / 実装AI / 人間が同じ事実を参照**し、未決事項・リスク・運用まで含めて「実装して良い状態」を機械的に判定できるSSOTテンプレ。
>
> 運用ルール:
> - **推測禁止**: 不明は `Decision Required` / `Open Questions` に書く
> - **Hard Gate**: `hard_gate: true` のとき、`hard_gate_rules.block_if` に該当が1つでもあれば実装禁止
> - **マルチテナント最優先**: `requireAuth()` と `organizationId` フィルタは原則例外なし
> - **Prismaガードレール**: schema変更時は `migrate dev` で新規migrationを作る（既存migration改ざん禁止 / 生SQL禁止）
> - **層**: DETAIL（Freeze 4） - 止まらないルール適用

---
doc_id: SSOT-GENERIC-000
title: "<機能/仕様の名前>"
version: 0.1.1
status: draft  # draft | needs_decision | review | approved | implemented | deprecated
layer: DETAIL  # CORE | CONTRACT | DETAIL
owner: "<担当/チーム>"
created_at: YYYY-MM-DD
updated_at: YYYY-MM-DD
risk_level: low  # low | medium | high
tags: ["ssot", "generic"]

# Hard Gate: true の場合、未解決が残ると実装フェーズへ進めない
hard_gate: true

scope:
  product: "ミエルボード for 現場"
  components: ["frontend", "backend", "db", "infra", "ops"]
  environments: ["dev", "stg", "prod"]

related_ssot: []
related_docs:
  - "docs/TEST_STRATEGY.md"
tickets: []  # 例: ["WBS-43", "WBS-9"]

# Hard Gate 判定（機械判定のため「条件名」を固定）
hard_gate_rules:
  enabled: true
  block_if:
    - has_undecided_decisions
    - has_open_questions
    - pii_is_unknown
    - error_spec_incomplete
    - test_strategy_incomplete
    - rollout_plan_incomplete
    - tenancy_rules_incomplete
    - migration_required_but_missing
---

# SSOT: <機能/仕様の名前>

## 0. One-Minute Summary（1分要約）
- **目的**:
- **対象**:
- **非目的**:
- **Doneの定義**: ACを全て満たし、監視/ロールアウト/運用手順が確定している

---

## 1. Decision Required（要判断：未解決が1つでもあれば実装禁止）
> ここは「ユーザー判断が必要な項目」を必ず列挙する。AIは推測で埋めない。

| id | topic | options | chosen | owner | due | status |
|---|---|---|---|---|---|---|
| DEC-01 | 権限（誰が実行できるか） | adminのみ / staffも可 / enduser可 | TBD_USER | user | YYYY-MM-DD | undecided |
| DEC-02 | データ保持期間 | 30日 / 90日 / 1年 / 無期限 | TBD_USER | user | YYYY-MM-DD | undecided |

**Hard Gate 条件**
- `status=undecided` が1件でもある → `status: needs_decision` にして質問へ（実装禁止）

---

## 2. Background / Problem
- 現状:
- 課題:
- なぜ今:
- 期待効果（可能なら数値）:

---

## 3. Scope（境界）
### 3.1 In Scope
- 
### 3.2 Out of Scope
-
### 3.3 Constraints（制約）
- 法務/契約:
- 技術:
- 運用:
- 予算/期限:

---

## 4. Definitions（用語）
| term | definition |
|---|---|
| | |

---

## 5. Use Cases
- UC-01:
- UC-02:
- NUC-01（障害時）:
- NUC-02（権限不足）:

---

## 6. Requirements
### 6.1 CRITICAL（絶対）
- CRIT-01:
- CRIT-02:

### 6.2 SHOULD
- SHOULD-01:

### 6.3 NICE
- NICE-01:

---

## 7. Acceptance Criteria（必須：テスト可能に）
> ACは **Given/When/Then** で書き、どの要件を満たすか `covers` を必ず付ける。

- AC-01: Given … When … Then …（covers: [CRIT-01]）
- AC-02: Given … When … Then …（covers: [CRIT-02, SHOULD-01]）

---

## 8. Tenancy（必須：マルチテナント境界）
> このプロジェクトは **organizationId が境界の要**。例外を作る場合は理由と代替防御（監査ログ等）を明記。

- boundary: tenant = `organizationId`
- auth: **全APIで `requireAuth(event)` を使用**（例外: あり/なし。あるなら列挙）
- db_filter: **全DBクエリで `organizationId` フィルタ**（例外なし）
- forbidden:
  - organizationId なしのクエリ
  - `organizationId ?? 'default'` のようなフォールバック
  - 他テナントのデータにアクセス可能な実装
- tests:
  - 境界テスト: required（例: orgAでorgBのデータが見えないこと）

---

## 9. Data Model / Migration（該当するなら必須）
> **Config/Schema変更は「定義→マイグレーション→実装」順で行う。**

- schema_changes: yes/no
- prisma_models_changed: []  # 例: ["User", "Schedule"]
- migration_required: yes/no  # schema_changes=yes なら yes
- migration_name: "<migrate dev --name ... の名前>"
- migration_files:
  - "prisma/migrations/<timestamp>_<name>/migration.sql"

**ルール（必須）**
- 既存 `prisma/migrations/**/migration.sql` の編集禁止
- schema変更時は `npx prisma migrate dev --name <name>` で **新規migration追加**
- Prisma以外のDDL/DML（`$queryRaw` / `$executeRaw`）での変更は禁止

---

## 10. Contract（必須：I/O / 状態 / 互換 / エラー）
### 10.1 API / UI / Job のどれか（該当するものを必ず埋める）

#### (A) API Contract（HTTP）
- endpoint:
- auth:
- request (type):
- response (type):
- validation:
- side effects:

#### (B) UI Contract（画面/操作）
- entrypoint:
- states:
- empty/loading/error:
- accessibility:

#### (C) Job/Batch Contract（非同期）
- trigger:
- schedule:
- idempotency:
- retries:

### 10.2 State / Flow（推奨）
- states:
- transitions:
- exceptions:

### 10.3 Error Spec（必須）
| error_code | condition | user_message | retry | logging |
|---|---|---|---|---|
| | | | yes/no | |

### 10.4 Compatibility（必須）
- 既存仕様との互換:
- 破壊的変更: yes/no（yesなら影響範囲と移行）
- versioning:

---

## 11. Security & Privacy（必須：unknown禁止）
- authn:
- authz:
- validation:
- secrets:
- pii: none / present  # unknownは禁止
- audit_log: required / not_required（理由）
- retention_delete: （DECで決まるならDEC参照）

---

## 12. Config（必須：Config First）
| category | key | type | default | scope | change_risk | description |
|---|---|---|---|---|---|---|
| feature_flag | | boolean | false | tenant/env/global | medium | |

---

## 13. Observability（必須：Tracking by Default）
### 13.1 Events
| event | id | when | payload_schema | pii | sink |
|---|---|---|---|---|---|
| | | | | none/present | |

### 13.2 Metrics / Alerts
| metric | purpose | threshold | notify |
|---|---|---|---|
| | | | |

---

## 14. Test Strategy（必須）
> 参照: `docs/TEST_STRATEGY.md`

- unit:
- integration:
- e2e:
- load（必要なら）:
- security（必要なら）:

---

## 15. Rollout / Migration / Ops（必須）
- release_steps:
- feature_flag:
- staged_rollout:
- success_metrics:
- rollback_plan:
- runbook_min:

---

## 16. Assumptions（推測禁止：不明は質問へ）
- ASM-01:
- ASM-02:

---

## 17. Open Questions（1件でも残れば実装禁止）
- Q-01:
- Q-02:

---

## 18. Change Log
| date | version | author | change |
|---|---|---|---|
| YYYY-MM-DD | 0.1.1 | | |


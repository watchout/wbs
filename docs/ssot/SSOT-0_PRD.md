# SSOT-0: プロダクト台帳（PRD）

> Product Requirements Document - ミエルボード for 現場
> ai-dev-framework v3.0 準拠

---

## 基本情報

| 項目 | 内容 |
|------|------|
| プロダクト名 | ミエルボード for 現場（MielBoard for Jobsites） |
| バージョン | v0.1.0（Phase 0 - MVP） |
| 作成日 | 2026-02-02 |
| 最終更新日 | 2026-02-02 |
| オーナー | watchout |
| ステータス | Approved |

---

## 1. プロダクト概要

### 1.1 一言で何か（エレベーターピッチ）

```
弱電・電気工事会社（10〜100名規模） 向けの 現場業務DXプラットフォーム で、
ホワイトボード・Excel文化による情報共有の非効率 を解決する。
紙やホワイトボードでの予定管理 とは異なり、
リアルタイムサイネージ + Googleカレンダー連携 + AIスケジュール調整 を提供する。
```

### 1.2 背景・課題

現状の課題を具体的に記述:

- **ホワイトボード依存**: 事務所のホワイトボードに手書きで週間予定を管理。外出先から確認不可。更新漏れが日常的に発生
- **情報の非対称**: 事務所にいる事務員と現場作業員の間で予定情報に時差がある。朝礼でしか全体共有ができない
- **Excelの限界**: 一部デジタル化している企業もExcelで管理。同時編集不可、バージョン管理不可、モバイル表示が困難
- **デジタルツールの壁**: 既存のプロジェクト管理ツール（Asana, Backlog等）は建設現場の作業員にとって複雑すぎる
- **多言語対応不足**: 外国人技能実習生が増加しているが、日本語のみのツールが多い

### 1.3 解決策

本プロダクトがどのように課題を解決するか:

- **リアルタイムサイネージ**: 事務所のモニターに週間予定を常時表示。Socket.IO による1秒以下の即時反映
- **マルチデバイス**: PC・タブレット・大型モニターで同一データを閲覧。PWA対応でオフラインでも24時間キャッシュ
- **Googleカレンダー双方向連携**: 既存のカレンダーから予定を自動同期。二重入力を完全排除
- **AI日程調整**: 参加者の空き状況をAIが分析し、最適な会議スケジュールを提案
- **多言語対応**: ja, en, vi, zhHans, fil, ne, ptBR の7言語に対応
- **ゼロ学習コスト**: ホワイトボードの見た目をデジタルで再現。操作はブラウザを開くだけ

---

## 2. 対象ユーザー

### 2.1 プライマリユーザー

| 項目 | 内容 |
|------|------|
| ペルソナ名 | 山田さん（現場監督/配車担当） |
| 役割 | LEADER / ADMIN |
| 課題 | 毎朝ホワイトボードの前で30分かけて予定調整。変更があると全員に電話連絡 |
| ゴール | 予定変更をリアルタイムで全員に共有。朝礼を5分に短縮 |
| 利用頻度 | 毎日・複数回 |

### 2.2 セカンダリユーザー

| 項目 | 内容 |
|------|------|
| ペルソナ名 | 鈴木さん（事務員） |
| 役割 | MEMBER |
| 課題 | 外部からの電話問い合わせ時に「○○さんは今どこ？」がすぐ答えられない |
| ゴール | サイネージを見ればすぐに全員の予定がわかる |

### 2.3 その他ユーザー

| 項目 | 内容 |
|------|------|
| ペルソナ名 | グエンさん（ベトナム人技能実習生） |
| 役割 | MEMBER |
| 課題 | 日本語の手書きホワイトボードが読めない |
| ゴール | 母国語で自分の予定が確認できる |

---

## 3. ユースケース

### 3.1 コアユースケース（必須）

| ID | ユースケース | ユーザー | 優先度 | 実現機能ID |
|----|------------|---------|-------|-----------|
| UC-001 | 週間スケジュールの閲覧・編集 | ADMIN, LEADER, MEMBER | P0 | WBS-001, CRUD-001〜004 |
| UC-002 | サイネージでの予定表示 | DEVICE | P0 | WBS-002, WBS-008 |
| UC-003 | Googleカレンダー双方向同期 | ADMIN, LEADER, MEMBER | P0 | WBS-003 |
| UC-004 | ユーザー・部門の管理 | ADMIN | P0 | OPS-001, OPS-002, WBS-005 |
| UC-005 | AI日程調整（会議スロット提案） | ADMIN, LEADER | P1 | WBS-004, AI-001 |
| UC-006 | オフラインキオスク表示 | DEVICE | P1 | WBS-001 AC6 |
| UC-007 | 多言語切り替え | 全ユーザー | P1 | WBS-001 AC7 |
| UC-008 | デバイスログイン（サイネージ専用） | DEVICE | P0 | AUTH-004 |

### 3.2 ユーザーストーリー

```
UC-001:
As a 現場監督（LEADER）,
I want to 週間スケジュールをブラウザから編集・共有,
so that ホワイトボードへの手書きを廃止し、リアルタイムで全員に共有できる.
```

```
UC-002:
As a サイネージ（DEVICE）,
I want to 事務所のモニターに週間予定を常時表示,
so that 事務所にいる全員がいつでも予定を確認できる.
```

```
UC-003:
As a 事務員（MEMBER）,
I want to Googleカレンダーと予定を双方向同期,
so that 二重入力なしで全ての予定を一元管理できる.
```

```
UC-005:
As a 現場監督（LEADER）,
I want to AIに会議の最適日時を提案してもらう,
so that 参加者全員の空き状況を手動で確認する手間を省ける.
```

---

## 4. スコープ定義

### 4.1 Goals（やること - Phase 0 MVP）

- [x] **[MUST]** 週間スケジュールボード（CRUD + リアルタイム同期）
- [x] **[MUST]** サイネージ表示（大画面対応、自動更新）
- [x] **[MUST]** ユーザー管理（CRUD, ロール: ADMIN/LEADER/MEMBER/DEVICE）
- [x] **[MUST]** 部門管理（CRUD、ソフトデリート）
- [x] **[MUST]** メール/パスワード認証 + デバイスログイン
- [x] **[MUST]** Googleカレンダー双方向同期（OAuth2, Webhook, 増分同期）
- [x] **[SHOULD]** AI日程調整（候補スロット生成、回答収集、確定）
- [ ] **[SHOULD]** 多言語対応（7言語）
- [ ] **[SHOULD]** オフラインキオスク（PWA + IndexedDB 24hキャッシュ）

### 4.2 Non-Goals（やらないこと - Phase 0）

明示的にスコープ外とするもの:

- 在庫・資材管理（STOCK - Phase 2）
- 車両管理・アルコールチェック（DRIVE - Phase 3）
- 日報・工数管理（LOG - Phase 4）
- AIコンシェルジュ高度機能（自然言語による操作 - Phase 2以降）
- ネイティブモバイルアプリ（PWAで対応）
- SSO / SAML 連携
- 請求・決済機能

### 4.3 将来の検討事項（Future Considerations）

今回は対象外だが、将来検討するもの:

- マルチモジュール統合（WEEK + STOCK + DRIVE）
- AI高度分析（工数集計、原価計算）
- 外部システム連携API（公開API）
- ミエルファイル（変更検知・履歴管理機能 - M&A価値向上目的）
- ホワイトラベル対応

---

## 5. 成功指標（KPI）

| 指標 | 現状値 | 目標値 | 計測方法 | 計測時期 |
|------|-------|-------|---------|---------|
| 週間アクティブ組織数 | 0 | 10組織 | DB集計 | Phase 0.5 ベータ開始後4週間 |
| ユーザー登録数 | 0 | 100名 | DB集計 | Phase 0.5 ベータ開始後4週間 |
| サイネージ稼働率 | - | 99.5% | ヘルスチェックAPI | Phase 0.5 以降、月次計測 |
| リアルタイム同期遅延 | - | P95 < 1秒 | Socket.IO メトリクス | Phase 0 リリース時 |
| Googleカレンダー同期成功率 | - | 99% | ログ集計 | Phase 0.5 以降、週次計測 |
| Lighthouse PWAスコア | - | 80以上 | Lighthouse CI | Phase 1 PWA実装完了時 |

---

## 6. 制約条件

### 6.1 技術制約

- Node.js 20 + Nuxt 3 + Prisma ORM（PostgreSQL）
- Prisma ORM のみ使用（`$queryRaw` / `$executeRaw` 禁止）
- マルチテナント: 全データに `organizationId` スコープ必須
- Socket.IO 4.x でリアルタイム通信
- Docker + Docker Compose でデプロイ
- GitHub Actions CI/CD

### 6.2 ビジネス制約

| 制約種別 | 内容 |
|---------|------|
| 納期 | Phase 0 MVP: 2026年Q1中 |
| 予算 | 初期投資 ¥0（開発は AI駆動、インフラは ConoHa VPS 月額 ¥1,000〜3,000 程度） |
| 人員 | 1名 + AI（Claude Code / Cursor） |
| 法規制 | 個人情報保護法準拠（メール、名前の取り扱い） |

### 6.3 運用制約

- ConoHa VPS（OpenStack）でのホスティング
- Nginx リバースプロキシ + Let's Encrypt SSL
- PostgreSQL WAL をオブジェクトストレージにバックアップ
- Terraform による IaC 管理

---

## 7. 前提条件・依存関係

### 7.1 前提条件

- [x] Google Cloud Console でOAuth2クライアントID/シークレットを取得済み
- [x] ConoHa VPS アカウント作成済み
- [x] ドメイン取得済み
- [x] PostgreSQL インスタンス利用可能

### 7.2 外部依存

| 依存先 | 内容 | リスク |
|-------|------|-------|
| Google Calendar API | 双方向同期、Webhook | API仕様変更、レート制限 |
| Google OAuth2 | ユーザー認証 | 認証フロー変更 |
| ConoHa VPS | ホスティング基盤 | サービス障害、料金変更 |
| Let's Encrypt | SSL証明書自動更新 | 証明書発行制限 |

---

## 8. リスク

| リスク | 影響度 | 発生確率 | 対策 |
|-------|-------|---------|------|
| Google Calendar API のレート制限超過 | High | Mid | 増分同期 + バッチ処理で呼び出し削減 |
| Socket.IO 同時接続数の増大 | Mid | Mid | Redis Adapter による水平スケーリング |
| 建設現場の低帯域環境 | Mid | High | PWA + IndexedDB オフラインキャッシュ |
| 外国人技能実習生のデジタルリテラシー | Mid | Mid | 最小限UI + サイネージ（見るだけ） |
| セキュリティ侵害（認証情報漏洩） | High | Low | JWT + Token暗号化 + 監査ログ |

---

## 9. マイルストーン

| フェーズ | 内容 | 期日 | 状態 |
|---------|------|------|------|
| Phase 0 | MVP: WEEK（スケジュール + サイネージ + 認証 + カレンダー連携 + AI日程調整） | 2026 Q1 | In Progress |
| Phase 0.5 | 市場検証: LP公開、ベータ募集 | 2026 Q2 | Planned |
| Phase 1 | WEEK完成 + 多言語 + PWA + パフォーマンス最適化 | 2026 Q2-Q3 | Planned |
| Phase 2 | STOCK（在庫・資材管理） | 2026 Q3-Q4 | Planned |
| Phase 3 | DRIVE（車両・アルコールチェック） | 2027 Q1-Q2 | Planned |
| Phase 4 | LOG + 統合 + AI高度機能 | 2027 Q2以降 | Planned |

---

## 10. 関連ドキュメント

| ドキュメント | リンク |
|------------|-------|
| SSOT-1: 機能台帳 | [SSOT-1_FEATURE_CATALOG.md](./SSOT-1_FEATURE_CATALOG.md) |
| ギャップ分析 | [GAP_ANALYSIS_REPORT.md](./GAP_ANALYSIS_REPORT.md) |
| プロダクトビジョン（原本） | [../PRODUCT_VISION.md](../PRODUCT_VISION.md) |
| ミエルボード詳細 | [../SSOT_GENBA_WEEK.md](../SSOT_GENBA_WEEK.md) |
| カレンダー同期 | [../SSOT_CALENDAR_SYNC.md](../SSOT_CALENDAR_SYNC.md) |
| AI日程調整 | [../SSOT_MEETING_SCHEDULER.md](../SSOT_MEETING_SCHEDULER.md) |
| 料金体系 | [../SSOT_PRICING.md](../SSOT_PRICING.md) |
| マーケティング | [../SSOT_MARKETING.md](../SSOT_MARKETING.md) |
| EXIT戦略 | [../SSOT_EXIT_STRATEGY.md](../SSOT_EXIT_STRATEGY.md) |
| ブランド | [../SSOT_BRAND.md](../SSOT_BRAND.md) |
| OpenAPI仕様 | [../../openapi.yaml](../../openapi.yaml) |
| データモデル | [../../prisma/schema.prisma](../../prisma/schema.prisma) |

---

## 変更履歴

| 日付 | バージョン | 変更内容 | 変更者 |
|------|----------|---------|-------|
| 2026-02-02 | v0.1.0 | ai-dev-framework v3.0 準拠で新規作成。PRODUCT_VISION.md + functional_spec.md から変換 | AI（Claude Code） |
| 2026-02-03 | v0.1.1 | 監査指摘修正: UC→機能IDマッピング追加、Goals にMUST/SHOULD付与、予算・KPI明確化 | AI（Claude Code） |

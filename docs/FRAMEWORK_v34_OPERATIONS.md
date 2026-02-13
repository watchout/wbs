# フレームワーク v3.4 運用開始手順 — wbs (MielBoard)

> CLAUDE.md v3.4 は適用済み。このファイルは「フレームワークを実際に動かす」ための手順書です。
> 上から順に実行してください。完了後、このファイルは docs/ に移動するか削除してOKです。

---

## Step 1: framework retrofit（フレームワーク管理の有効化）

```bash
# wbs プロジェクトのルートで実行
framework retrofit

# 何が起きるか:
# - .framework/profile.json が生成される（プロジェクトタイプ: app）
# - 既存ドキュメント構造を分析してレポートを出力
# - framework status / plan / audit 等が使えるようになる
```

確認:
```bash
framework status
# → プロジェクトの現在の状態が表示されれば成功
```

---

## Step 2: 既存SSOTの品質監査

wbs には既に SSOT が存在する:
- `docs/ssot/SSOT-0_PRD.md`
- `docs/ssot/SSOT-1_FEATURE_CATALOG.md`
- `docs/SSOT_*.md`（個別機能仕様 多数）

これらが v3.4 の品質基準（§3-E/F/G/H 必須）を満たしているか監査する:

```bash
# SSOT品質監査の実行
framework audit ssot

# または個別ファイルを監査
framework audit ssot docs/SSOT_GENBA_WEEK.md
framework audit ssot docs/SSOT_BILLING.md
```

### 監査で確認すべきポイント

v3.4 で必須になった項目:

| セクション | 内容 | 基準 |
|-----------|------|------|
| §3-E 入出力例 | 正常系+異常系の具体例 | 5ケース以上（正常2+異常3） |
| §3-F 境界値 | 全データ項目の境界パターン | 全フィールドに定義あり |
| §3-G 例外応答 | 全エラーケースの応答定義 | エラーケースと1:1対応 |
| §3-H Gherkin | 受入テストシナリオ | 全MUST要件にシナリオあり |

---

## Step 3: 不足セクションの補完

監査で不足が見つかった場合、機能ごとに補完する:

```
「SSOT_GENBA_WEEK.md の §3-E/F/G/H を補完して」
「SSOT_BILLING.md の §3-E 入出力例を5ケース追加して」
```

補完の優先順位:
1. 現在開発中 or 次に開発する機能 → 最優先で補完
2. 既に実装済みの機能 → テスト追加時に補完
3. 将来の機能 → 実装前に補完すれば良い

---

## Step 4: タスク分解・実装計画

```bash
# 機能カタログから実装計画を生成
framework plan

# 何が起きるか:
# - 全SSOTの依存関係を分析
# - Wave分類（実装順序）を決定
# - GitHub Issues の作成候補を生成
```

---

## Step 5: 日常の開発フロー

以降、機能を実装するときは必ず Pre-Code Gate を通す。
**Gate は CLI で構造的に強制される** — `framework run` は全 Gate が passed でないと実行を拒否する。

```bash
# 全Gateを一括チェック（結果は .framework/gates.json に保存）
framework gate check

# 現在のGate状態を確認
framework gate status

# 個別Gateのチェック
framework gate check-a    # Gate A: 開発環境
framework gate check-b    # Gate B: 計画完了
framework gate check-c    # Gate C: SSOT完全性（§3-E/F/G/H）

# 全Gate通過後のみ実行可能
framework run
```

自動連動:
- `framework plan` 成功時 → Gate B が自動パス
- `framework audit ssot` 実行時 → Gate C が自動評価

### スキルの活用

```
「合議して：SSOT_BILLING の決済フロー設計」
→ 専門家チームが多視点で検討

「I3を実行」（Code Auditor）
→ 実装後のコード監査

「レビュー評議会を開催して」
→ 実装完了後のフェーズゲートレビュー
```

---

## チェックリスト

- [ ] `framework retrofit` 実行済み
- [ ] `framework status` が動作する
- [ ] `framework audit ssot` で既存SSOTを監査済み
- [ ] 優先機能の §3-E/F/G/H を補完済み
- [ ] `framework plan` で実装計画を生成済み
- [ ] `framework gate check` で全Gate確認済み
- [ ] `framework gate status` で Gate 状態を確認済み

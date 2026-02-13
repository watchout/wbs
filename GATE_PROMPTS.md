# wbs: Pre-Code Gate 通過タスク

このファイルの指示に従って、全 Gate を passed にしてください。

## 現在の Gate 状態

- ❌ Gate A: FAILED
- ❌ Gate B: FAILED
- ❌ Gate C: FAILED

## タスク 1: Gate A を通過させる

`framework gate status` で失敗理由を確認してください。

現在の失敗理由:
- `docker-compose.yml` が存在しない

wbs は Prisma + PostgreSQL を使っています。
以下の手順で対応してください:
1. DB が Docker で動いているか、クラウド（Supabase等）か確認
2. 必要なら docker-compose.yml を作成、不要ならその理由を説明
3. `framework gate check-a` を実行して passed を確認

## タスク 2: Gate B を通過させる

`framework plan` を実行して実装計画を作成してください。

前提:
- docs/ssot/ に SSOT-0_PRD.md と SSOT-1_FEATURE_CATALOG.md がある
- docs/ 直下に SSOT_*.md が複数散在している
- 全 SSOT を分析して依存グラフ → Wave 分類 → 実装順序を決定する

plan 完了後、`framework gate status` で確認してください。

## タスク 3: Gate C を通過させる

Gate C で失敗している SSOT:
1. docs/ssot/SSOT-0_PRD.md — §3-E/F/G/H 全欠損
2. docs/ssot/SSOT-1_FEATURE_CATALOG.md — §3-E/F/G/H 全欠損
3. docs/ssot/GAP_ANALYSIS_REPORT.md — §3-E/F/G/H 全欠損
4. docs/ssot/NEXT_ACTIONS.md — §3-E/F/G/H 全欠損
5. docs/ssot/SSOT_AUDIT_REPORT.md — §3-E/F/G/H 全欠損

以下の手順で対応してください:
1. 各ファイルが「§3-E/F/G/H が必要な機能仕様書」か「レポート系（対象外）」か分類
2. レポート系は Gate C の検査対象から除外する（ファイル名変更 or 移動）
3. 機能仕様書の §3-E/F/G/H を補完する:
   - §3-E 入出力例: 正常2ケース + 異常3ケース以上
   - §3-F 境界値: 全データ項目の境界パターン
   - §3-G 例外応答: 全エラーケースの応答定義
   - §3-H Gherkin: 全MUST要件のシナリオ
4. 1ファイル補完するごとにユーザーに確認を求める
5. 全ファイル完了後、`framework gate check-c` を実行

## タスク 4: 全 Gate 確認

`framework gate status` を実行して全 Gate が passed であることを確認してください。
未通過の Gate があれば、何が必要か説明してください。

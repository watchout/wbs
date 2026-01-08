/**
 * Plane Issue本文一括更新スクリプト
 */

require('dotenv').config();

const PLANE_API_KEY = process.env.PLANE_API_KEY;
const PLANE_WORKSPACE_SLUG = 'co';
const PLANE_PROJECT_UUID = 'c138cd82-2148-4402-9744-266654014cc1';
const PLANE_BASE_URL = 'https://plane.arrowsworks.com/api/v1';

// Issue本文定義
const issueDescriptions = {
  1: {
    description: '初期セットアップ用の空Issue'
  },
  2: {
    description: `## 概要
スケジュール表示のためのフォーマットユーティリティを作成する。

## 対象ファイル
- \`server/utils/scheduleFormatter.ts\`

## 機能
- formatTime: 時刻フォーマット
- parseScheduleMetadata: メタデータ解析
- formatScheduleForDisplay: 表示用フォーマット
- getWeekStart/getWeekEnd: 週の開始・終了日計算

## 参照SSOT
- docs/SSOT_GENBA_WEEK.md`
  },
  3: {
    description: `## 概要
週間スケジュールをマトリクス形式で取得するAPIを作成する。

## エンドポイント
GET /api/schedules/weekly-board

## レスポンス
- 社員×曜日のマトリクス形式
- organizationIdでフィルタ（マルチテナント）

## 参照SSOT
- docs/SSOT_GENBA_WEEK.md (4-1. API設計)`
  },
  4: {
    description: `## 概要
部署（Department）APIの確認と必要に応じた拡張。

## 注意
現在のスキーマにDepartmentモデルは存在しない。
将来の拡張用として保留。

## 参照SSOT
- docs/SSOT_GENBA_WEEK.md`
  },
  5: {
    description: `## 概要
週間ボードのメインコンポーネントを作成する。

## 対象ファイル
- \`components/genba/WeeklyScheduleBoard.vue\`

## 機能
- 社員×曜日のマトリクス表示
- 各セルにスケジュール情報表示
- 休日/終日のハイライト

## 参照SSOT
- docs/SSOT_GENBA_WEEK.md (3-1. メイン画面)`
  },
  6: {
    description: `## 概要
週間ボードのページコンポーネントを作成する。

## 対象ファイル
- \`pages/org/[slug]/weekly-board.vue\`

## 機能
- 週切り替えナビゲーション
- 部門フィルタ
- サイネージ（フルスクリーン）モード

## 参照SSOT
- docs/SSOT_GENBA_WEEK.md`
  },
  7: {
    description: `## 概要
display.vue（サイネージ表示専用ページ）への統合。

## 対象ファイル
- \`pages/org/[slug]/display.vue\`

## 機能
- 自動更新
- 大型ディスプレイ向けレイアウト

## 参照SSOT
- docs/SSOT_GENBA_WEEK.md`
  },
  8: {
    description: `## 概要
Googleカレンダーとの同期機能を拡張する。

## 対象ファイル
- \`server/api/calendar/sync.ts\`

## 機能
- OAuth認証フロー
- カレンダーイベント取得
- スケジュールへの反映

## 参照SSOT
- docs/SSOT_GENBA_WEEK.md (3-2. カレンダー連携)`
  },
  9: {
    description: `## 概要
手動入力UI（オプション機能）。

## 機能
- スケジュール追加/編集フォーム
- 現場名、時間、担当者の入力

## 優先度
低（カレンダー連携が主）

## 参照SSOT
- docs/SSOT_GENBA_WEEK.md`
  },
  10: {
    description: `## 概要
大型ディスプレイ（43インチ以上）向けのスタイル調整。

## 対象
- フォントサイズ拡大
- 色コントラスト調整
- 視認性向上

## 参照SSOT
- docs/SSOT_GENBA_WEEK.md (3-4. サイネージ表示)`
  },
  11: {
    description: `## 概要
自動更新と安定性の確保。

## 機能
- 定期的なデータ更新（ポーリング/WebSocket）
- エラー時のリトライ
- オフライン対応

## 参照SSOT
- docs/SSOT_GENBA_WEEK.md`
  },
  12: {
    description: `## 概要
単体テストの作成。

## 対象
- scheduleFormatter.ts
- 各APIエンドポイント
- Vueコンポーネント

## ツール
- Vitest

## 参照
- docs/TEST_STRATEGY.md`
  },
  13: {
    description: `## 概要
統合テストの実施。

## 対象
- ログイン→週間ボード表示の一連フロー
- カレンダー同期→表示更新

## 参照
- docs/TEST_STRATEGY.md`
  },
  14: {
    description: `## 概要
サクシード社での実地テスト。

## 内容
- 実際の業務データでの動作確認
- ユーザーフィードバック収集
- 問題点の洗い出し`
  },
  15: {
    description: `## 概要
パフォーマンス測定と最適化。

## 指標
- ページロード時間
- API応答時間
- メモリ使用量`
  },
  16: {
    description: `## 概要
メインLPのCTAボタンとフォーム連携の改善。

## 対象ファイル
- \`pages/index.vue\`

## 機能
- CTAボタンからお問い合わせフォームへの誘導
- リードキャプチャ連携

## 参照SSOT
- docs/IYASAKA_BRAND_MASTER_PROTOCOL.md`
  },
  17: {
    description: `## 概要
ミエルストック製品の専用ランディングページを作成する。

## 対象ファイル
- \`pages/products/stock.vue\`

## 参照SSOT
- docs/SSOT_BRAND.md
- docs/IYASAKA_BRAND_MASTER_PROTOCOL.md`
  },
  18: {
    description: `## 概要
ミエルドライブ製品の専用ランディングページを作成する。

## 対象ファイル
- \`pages/products/drive.vue\`

## 参照SSOT
- docs/SSOT_BRAND.md
- docs/IYASAKA_BRAND_MASTER_PROTOCOL.md`
  },
  19: {
    description: `## 概要
ミエルファイル製品の専用ランディングページを作成する。

## 対象ファイル
- \`pages/products/file.vue\`

## 参照SSOT
- docs/SSOT_MIEL_FILE.md
- docs/IYASAKA_BRAND_MASTER_PROTOCOL.md`
  },
  20: {
    description: `## 概要
IYASAKA HPとのリードキャプチャ連携を実装する。

## 機能
- LP → HP問い合わせフォームへの誘導
- p_id パラメータによる流入元トラッキング

## 参照SSOT
- docs/IYASAKA_BRAND_MASTER_PROTOCOL.md (Lead-Capture Technical Protocol)`
  },
  21: {
    description: `## 概要
ミエルストック（在庫管理）のSSOTドキュメントを作成する。

## 対象ファイル
- \`docs/SSOT_MIEL_STOCK.md\`

## 内容
- 機能仕様
- API設計
- データモデル`
  },
  22: {
    description: `## 概要
ミエルストックの在庫管理APIを設計・実装する。

## エンドポイント
- GET /api/inventory
- POST /api/inventory
- PATCH /api/inventory/:id

## 参照SSOT
- docs/SSOT_MIEL_STOCK.md（作成後）`
  },
  23: {
    description: `## 概要
在庫一覧画面を実装する。

## 対象ファイル
- \`pages/org/[slug]/inventory/index.vue\`

## 参照SSOT
- docs/SSOT_MIEL_STOCK.md`
  },
  24: {
    description: `## 概要
在庫が閾値を下回った際の発注アラート機能を実装する。

## 機能
- 在庫閾値設定
- アラート通知

## 参照SSOT
- docs/SSOT_MIEL_STOCK.md`
  },
  25: {
    description: `## 概要
ミエルドライブ（車両管理）のSSOTドキュメントを作成する。

## 対象ファイル
- \`docs/SSOT_MIEL_DRIVE.md\`

## 内容
- 機能仕様
- API設計
- データモデル`
  },
  26: {
    description: `## 概要
ミエルドライブの車両管理APIを設計・実装する。

## エンドポイント
- GET /api/vehicles
- POST /api/vehicles
- GET /api/vehicles/:id/records

## 参照SSOT
- docs/SSOT_MIEL_DRIVE.md（作成後）`
  },
  27: {
    description: `## 概要
アルコールチェック記録機能を実装する。

## 機能
- 乗車前/後のアルコールチェック記録
- 結果の保存と閲覧

## 参照SSOT
- docs/SSOT_MIEL_DRIVE.md`
  },
  28: {
    description: `## 概要
運転日報機能を実装する。

## 機能
- 走行距離、給油、目的地の記録
- 日報の閲覧・出力

## 参照SSOT
- docs/SSOT_MIEL_DRIVE.md`
  },
  29: {
    description: `## 概要
ミエルファイル（ファイル管理）のSSOTドキュメントを作成する。

## 対象ファイル
- \`docs/SSOT_MIEL_FILE.md\` ← 作成済み

## 内容
- 機能仕様
- API設計
- AI差分検出`
  },
  30: {
    description: `## 概要
ミエルファイルのファイル管理APIを設計・実装する。

## エンドポイント
- GET /api/files
- POST /api/files/upload
- GET /api/files/:id/versions

## 参照SSOT
- docs/SSOT_MIEL_FILE.md`
  },
  31: {
    description: `## 概要
AIによるファイル差分検出機能を実装する。

## 機能
- 図面等のファイルバージョン比較
- 変更箇所のハイライト
- 変更サマリー生成

## 参照SSOT
- docs/SSOT_MIEL_FILE.md`
  },
  32: {
    description: `## 概要
ミエルプラスAI（AIコンシェルジュ）の基盤設計。

## 内容
- RAG（Retrieval-Augmented Generation）設計
- プロンプトテンプレート
- API設計

## 参照SSOT
- docs/AI_ROLES/STRATEGIC_CONTEXT_PROMPT.md`
  },
  33: {
    description: `## 概要
AIチャットUIの実装。

## 対象ファイル
- \`components/AiChatWidget.vue\` ← 作成済み

## 機能
- チャットインターフェース
- クイックアクション
- 応答表示

## 参照SSOT
- docs/SSOT_BRAND.md`
  },
  34: {
    description: `## 概要
本番環境（ConoHa VPS）の構築。

## 内容
- Docker Compose設定
- PostgreSQL設定
- Nginx設定

## 参照SSOT
- docs/SSOT_GENBA_WEEK.md (4-6. インフラ)
- docs/phase0_architecture.md`
  },
  35: {
    description: `## 概要
ドメイン・SSL設定。

## 内容
- ドメイン設定
- Let's Encrypt SSL証明書
- HTTPS強制`
  }
};

async function updateIssueDescription(issueUUID, description) {
  const url = `${PLANE_BASE_URL}/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${PLANE_PROJECT_UUID}/issues/${issueUUID}/`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'X-API-Key': PLANE_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      description_html: `<p>${description.replace(/\n/g, '</p><p>').replace(/## /g, '<strong>').replace(/<\/p><p>- /g, '</p><ul><li>').replace(/<\/p><p>/g, '</p><p>')}</p>`
    })
  });

  if (!response.ok) {
    throw new Error(`Failed to update issue: ${response.status}`);
  }

  return response.json();
}

async function main() {
  console.log('📝 Plane Issue本文を更新中...\n');

  // まずIssue一覧を取得してUUIDをマッピング
  const issuesUrl = `${PLANE_BASE_URL}/workspaces/${PLANE_WORKSPACE_SLUG}/projects/${PLANE_PROJECT_UUID}/issues/`;
  const response = await fetch(issuesUrl, {
    headers: { 'X-API-Key': PLANE_API_KEY }
  });
  const data = await response.json();
  
  const issueMap = new Map();
  for (const issue of data.results) {
    issueMap.set(issue.sequence_id, issue.id);
  }

  // 各Issueを更新
  let updated = 0;
  let failed = 0;

  for (const [seqId, content] of Object.entries(issueDescriptions)) {
    const uuid = issueMap.get(parseInt(seqId));
    if (!uuid) {
      console.log(`⚠️  WBS-${seqId}: UUID not found`);
      failed++;
      continue;
    }

    try {
      await updateIssueDescription(uuid, content.description);
      console.log(`✅ WBS-${seqId}: 更新完了`);
      updated++;
      // Rate limit対策
      await new Promise(r => setTimeout(r, 300));
    } catch (error) {
      console.log(`❌ WBS-${seqId}: ${error.message}`);
      failed++;
    }
  }

  console.log(`\n📊 結果: ${updated}件更新, ${failed}件失敗`);
}

main().catch(console.error);


#!/bin/bash
# 自動監査スクリプト
# 使い方: ./scripts/auto-audit.sh WBS-11

set -e

ISSUE_ID=$1
SSOT_FILE=".claude/${ISSUE_ID}_prompt.md"
AUDIT_MODEL="${AUDIT_MODEL:-gpt-4o}"  # デフォルトはgpt-4o、GPT-5.2が使えれば変更

echo "🔍 監査開始: $ISSUE_ID"
echo "📋 モデル: $AUDIT_MODEL"

# 1. git diff を取得
DIFF=$(git diff HEAD~1)

# 2. typecheck 実行
echo "⚙️ TypeCheck..."
npm run typecheck || { echo "❌ TypeCheck失敗"; exit 1; }

# 3. テスト実行
echo "🧪 Tests..."
npm run test || { echo "❌ テスト失敗"; exit 1; }

# 4. SSOT準拠監査（別LLMで実行）
echo "📝 SSOT監査中..."

AUDIT_PROMPT="以下のgit diffがSSOT（${SSOT_FILE}）に準拠しているか監査してください。

## SSOT内容
$(cat $SSOT_FILE 2>/dev/null || echo '(ファイルなし)')

## Git Diff
$DIFF

## 監査項目
1. やることリストの完了状況
2. やらないことに手を出していないか
3. 完了条件を満たしているか

## 出力形式
- 判定: 承認 or 差し戻し
- 理由: (簡潔に)
- 修正指示: (差し戻しの場合のみ)"

# OpenAI API で監査（要: OPENAI_API_KEY環境変数）
if [ -n "$OPENAI_API_KEY" ]; then
  AUDIT_RESULT=$(curl -s https://api.openai.com/v1/chat/completions \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $OPENAI_API_KEY" \
    -d "{
      \"model\": \"$AUDIT_MODEL\",
      \"messages\": [{\"role\": \"user\", \"content\": $(echo "$AUDIT_PROMPT" | jq -Rs .)}],
      \"max_tokens\": 1000
    }" | jq -r '.choices[0].message.content')
  
  echo ""
  echo "📋 監査結果:"
  echo "$AUDIT_RESULT"
  
  # 承認判定
  if echo "$AUDIT_RESULT" | grep -qi "承認"; then
    echo ""
    echo "✅ 監査承認"
    exit 0
  else
    echo ""
    echo "❌ 差し戻し"
    echo "$AUDIT_RESULT" > ".claude/${ISSUE_ID}_feedback.md"
    exit 2
  fi
else
  echo "⚠️ OPENAI_API_KEY未設定。手動監査が必要です。"
  exit 1
fi

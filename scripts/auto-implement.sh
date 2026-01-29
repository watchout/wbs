#!/bin/bash
# 自動実装→監査→修正ループ
# 使い方: ./scripts/auto-implement.sh WBS-11

set -e

ISSUE_ID=$1
PROMPT_FILE=".claude/${ISSUE_ID}_prompt.md"
MAX_RETRIES=3
RETRY_COUNT=0

if [ ! -f "$PROMPT_FILE" ]; then
  echo "❌ プロンプトファイルが見つかりません: $PROMPT_FILE"
  exit 1
fi

echo "🚀 自動実装開始: $ISSUE_ID"
echo "📋 プロンプト: $PROMPT_FILE"
echo ""

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔄 試行 $((RETRY_COUNT + 1))/$MAX_RETRIES"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  
  # 1. Claude Codeで実装（自動承認モード）
  echo "🤖 Claude Code 実行中..."
  
  # フィードバックがあれば追加
  if [ -f ".claude/${ISSUE_ID}_feedback.md" ]; then
    FEEDBACK=$(cat ".claude/${ISSUE_ID}_feedback.md")
    PROMPT="$PROMPT_FILE を読んで実行。前回の差し戻しフィードバック: $FEEDBACK"
  else
    PROMPT="$PROMPT_FILE を読んで実行"
  fi
  
  # Claude Code実行（--dangerously-skip-permissions で自動承認）
  claude --dangerously-skip-permissions "$PROMPT" || {
    echo "⚠️ Claude Code実行エラー"
    RETRY_COUNT=$((RETRY_COUNT + 1))
    continue
  }
  
  # 2. 監査実行
  echo ""
  echo "🔍 監査実行中..."
  
  if ./scripts/auto-audit.sh "$ISSUE_ID"; then
    echo ""
    echo "✅ 実装完了・監査承認"
    echo ""
    echo "次のアクション:"
    echo "  git push origin main"
    echo "  node scripts/plane-lib/update-issue.cjs $ISSUE_ID done"
    rm -f ".claude/${ISSUE_ID}_feedback.md"
    exit 0
  else
    EXIT_CODE=$?
    if [ $EXIT_CODE -eq 2 ]; then
      echo ""
      echo "🔄 差し戻し。修正を試みます..."
      RETRY_COUNT=$((RETRY_COUNT + 1))
    else
      echo "❌ 監査エラー"
      exit 1
    fi
  fi
done

echo ""
echo "❌ 最大リトライ回数($MAX_RETRIES)に達しました。手動確認が必要です。"
exit 1

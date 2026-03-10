// server/api/ai/command.post.ts
// AIコマンドバー用APIエンドポイント（Sprint 3: AC-S3-01〜08）
// 既存AIパイプライン活用、コマンドバー専用システムプロンプト

import { createError, readBody } from 'h3'
import { requireAuth } from '../../utils/authMiddleware'
import { useAiCredit, getAiCreditBalance } from '../../utils/aiCredits'
import { createLlmProvider } from '../../utils/llm/factory'
import { ASSISTANT_TOOLS, COMMAND_BAR_SYSTEM_PROMPT, executeTool } from '../../utils/llm/tools'
import { createAuditLog, AUDIT_ACTIONS } from '../../utils/auditLog'
import type { LlmMessage } from '../../utils/llm/provider'

const MAX_MESSAGE_LENGTH = 2000
const MAX_TOOL_CALLS = 3

// レート制限（組織単位: 30回/分）
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_PER_MINUTE = 30
const RATE_LIMIT_WINDOW_MS = 60 * 1000

function checkRateLimit(key: string): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS })
    return true
  }

  if (entry.count >= RATE_LIMIT_PER_MINUTE) {
    return false
  }

  entry.count++
  return true
}

// 定期クリーンアップ
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key)
    }
  }
}, 5 * 60 * 1000)

/** preview_assignment ブロックをパースする */
function extractPreviewData(reply: string): Record<string, unknown> | null {
  const match = reply.match(/```preview_assignment\s*([\s\S]*?)```/)
  if (match) {
    try {
      return JSON.parse(match[1]) as Record<string, unknown>
    } catch {
      return null
    }
  }
  return null
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  // レート制限
  if (!checkRateLimit(`cmd:${auth.organizationId}`)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'リクエスト回数の上限に達しました。しばらくお待ちください。',
    })
  }

  const body = await readBody(event)
  const message = typeof body?.message === 'string' ? body.message.trim() : ''

  if (!message) {
    throw createError({
      statusCode: 400,
      statusMessage: 'メッセージを入力してください',
    })
  }

  if (message.length > MAX_MESSAGE_LENGTH) {
    throw createError({
      statusCode: 400,
      statusMessage: `メッセージは${MAX_MESSAGE_LENGTH}文字以内で入力してください`,
    })
  }

  // クレジット残高確認
  const creditInfo = await getAiCreditBalance(auth.organizationId)
  if (!creditInfo.isUnlimited && creditInfo.balance <= 0) {
    throw createError({
      statusCode: 402,
      statusMessage: 'AIクレジットが不足しています。追加パックをご購入ください。',
    })
  }

  // LLMプロバイダー取得
  let provider
  try {
    provider = await createLlmProvider(auth.organizationId)
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'AIサービスが利用できません。管理者にお問い合わせください。',
    })
  }

  // 今日の日付をコンテキストに含める
  const today = new Date().toISOString().split('T')[0]
  const systemPrompt = `${COMMAND_BAR_SYSTEM_PROMPT}\n\n今日の日付: ${today}`

  // コマンドバー用ツール（execute_assignment は含めない — §12 AI Interaction Policy 準拠）
  const commandBarTools = ASSISTANT_TOOLS.filter(
    (t) => t.name !== 'propose_allocation'
  )

  const messages: LlmMessage[] = [
    { role: 'user', content: message },
  ]

  try {
    let response = await provider.chat(messages, {
      systemPrompt,
      tools: commandBarTools,
      maxTokens: 1024,
      temperature: 0.7,
    })

    // ツール呼び出しがあれば実行
    if (response.toolCalls && response.toolCalls.length > 0) {
      const toolResults: string[] = []
      const toolsToExecute = response.toolCalls.slice(0, MAX_TOOL_CALLS)

      for (const tc of toolsToExecute) {
        const result = await executeTool(
          tc.name,
          tc.arguments,
          auth.organizationId
        )
        toolResults.push(
          `ツール「${tc.name}」の結果: ${result.message}\n${JSON.stringify(result.data, null, 2)}`
        )
      }

      const followUpMessages: LlmMessage[] = [
        { role: 'user', content: message },
        { role: 'assistant', content: response.content || 'ツールを実行しました。' },
        { role: 'user', content: `ツール実行結果:\n${toolResults.join('\n\n')}` },
      ]

      response = await provider.chat(followUpMessages, {
        systemPrompt,
        maxTokens: 1024,
        temperature: 0.7,
      })
    }

    // クレジット消費
    const creditResult = await useAiCredit(
      auth.organizationId,
      `AIコマンド: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`
    )

    // 監査ログ記録
    createAuditLog({
      organizationId: auth.organizationId,
      userId: auth.userId,
      action: AUDIT_ACTIONS.AI_COMMAND,
      meta: { message: message.substring(0, 200) },
    })

    // プレビューデータ抽出
    const previewData = extractPreviewData(response.content || '')
    const responseType = previewData ? 'preview' : 'search_result'

    return {
      success: true,
      type: responseType,
      reply: response.content,
      data: previewData,
      creditsRemaining: creditResult.balanceAfter,
      provider: provider.type,
    }
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'AIサービスでエラーが発生しました。しばらくお待ちください。',
    })
  }
})

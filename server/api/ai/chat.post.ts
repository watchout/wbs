// server/api/ai/chat.post.ts
// 業務画面AIチャットAPI — 認証必須・クレジット消費

import { createError, readBody } from 'h3'
import { requireAuth } from '../../utils/authMiddleware'
import { useAiCredit, getAiCreditBalance } from '../../utils/aiCredits'
import { createLlmProvider } from '../../utils/llm/factory'
import { ASSISTANT_TOOLS, BUSINESS_SYSTEM_PROMPT, executeTool } from '../../utils/llm/tools'
import type { LlmMessage } from '../../utils/llm/provider'

const MAX_MESSAGE_LENGTH = 2000

export default defineEventHandler(async (event) => {
  // 認証
  const auth = await requireAuth(event)

  // リクエスト解析
  const body = await readBody(event)
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  const conversationId = typeof body?.conversationId === 'string' ? body.conversationId : undefined

  // バリデーション
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
  } catch (err) {
    throw createError({
      statusCode: 503,
      statusMessage: 'AIサービスが利用できません。管理者にお問い合わせください。',
    })
  }

  // LLM 呼び出し
  const messages: LlmMessage[] = [
    { role: 'user', content: message },
  ]

  try {
    let response = await provider.chat(messages, {
      systemPrompt: BUSINESS_SYSTEM_PROMPT,
      tools: ASSISTANT_TOOLS,
      maxTokens: 1024,
      temperature: 0.7,
    })

    // ツール呼び出しがあれば実行して再度LLMに渡す（1回のみ）
    if (response.toolCalls && response.toolCalls.length > 0) {
      const toolResults: string[] = []

      for (const tc of response.toolCalls) {
        const result = await executeTool(
          tc.name,
          tc.arguments,
          auth.organizationId
        )
        toolResults.push(
          `ツール「${tc.name}」の結果: ${result.message}\n${JSON.stringify(result.data, null, 2)}`
        )
      }

      // ツール結果を含めて再度LLMに問い合わせ
      const followUpMessages: LlmMessage[] = [
        { role: 'user', content: message },
        { role: 'assistant', content: response.content || 'ツールを実行しました。' },
        { role: 'user', content: `ツール実行結果:\n${toolResults.join('\n\n')}` },
      ]

      response = await provider.chat(followUpMessages, {
        systemPrompt: BUSINESS_SYSTEM_PROMPT,
        maxTokens: 1024,
        temperature: 0.7,
      })
    }

    // クレジット消費（成功後に消費）
    const creditResult = await useAiCredit(
      auth.organizationId,
      `AIチャット: ${message.substring(0, 50)}${message.length > 50 ? '...' : ''}`
    )

    return {
      success: true,
      reply: response.content,
      creditsRemaining: creditResult.balanceAfter,
      provider: provider.type,
    }
  } catch (err) {
    // LLMプロバイダーのエラー
    const errorMessage = err instanceof Error ? err.message : 'Unknown error'
    throw createError({
      statusCode: 503,
      statusMessage: `AIサービスでエラーが発生しました: ${errorMessage}`,
    })
  }
})

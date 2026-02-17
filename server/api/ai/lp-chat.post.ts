// server/api/ai/lp-chat.post.ts
// LP向けチャットAPI — 認証なし・レート制限あり・クレジット消費なし

import { createError, readBody, getRequestIP } from 'h3'
import { createLpLlmProvider } from '../../utils/llm/factory'
import { LP_SYSTEM_PROMPT } from '../../utils/llm/tools'
import type { LlmMessage } from '../../utils/llm/provider'

const MAX_MESSAGE_LENGTH = 500

// 簡易レート制限（インメモリ）
// 本番環境では Redis 等に置き換え
const rateLimitMap = new Map<string, { count: number; resetAt: number }>()
const RATE_LIMIT_PER_MINUTE = 10
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

// 定期クリーンアップ（メモリリーク防止）
setInterval(() => {
  const now = Date.now()
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) {
      rateLimitMap.delete(key)
    }
  }
}, 5 * 60 * 1000) // 5分ごと

export default defineEventHandler(async (event) => {
  // レート制限チェック
  const ip = getRequestIP(event, { xForwardedFor: true }) ?? 'unknown'
  if (!checkRateLimit(ip)) {
    throw createError({
      statusCode: 429,
      statusMessage: 'リクエスト回数の上限に達しました。しばらくお待ちください。',
    })
  }

  // リクエスト解析
  const body = await readBody(event)
  const message = typeof body?.message === 'string' ? body.message.trim() : ''
  const sessionId = typeof body?.sessionId === 'string' ? body.sessionId : ''

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

  if (!sessionId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'セッションIDが必要です',
    })
  }

  // LLMプロバイダー取得（LP用: 認証なし、フォールバック順）
  let provider
  try {
    provider = createLpLlmProvider()
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'AIサービスが現在利用できません。',
    })
  }

  // LLM 呼び出し（ツールなし、LP用）
  const messages: LlmMessage[] = [
    { role: 'user', content: message },
  ]

  try {
    const response = await provider.chat(messages, {
      systemPrompt: LP_SYSTEM_PROMPT,
      maxTokens: 512,
      temperature: 0.5,
    })

    return {
      success: true,
      reply: response.content,
    }
  } catch {
    throw createError({
      statusCode: 503,
      statusMessage: 'AIサービスでエラーが発生しました。しばらくお待ちください。',
    })
  }
})

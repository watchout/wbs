/**
 * POST /api/billing/credits/use
 *
 * AI クレジットを1消費する（内部 API）
 * 認証必須
 */

import { defineEventHandler, readBody, createError } from 'h3'
import { requireAuth } from '~/server/utils/authMiddleware'
import { useAiCredit } from '~/server/utils/aiCredits'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  const body = await readBody(event)
  const { description } = body as { description?: string }

  const result = await useAiCredit(
    auth.organizationId,
    description || 'AI機能使用'
  )

  if (!result.success) {
    throw createError({
      statusCode: 402,
      message: result.error || 'クレジット不足',
    })
  }

  return {
    success: true,
    balanceAfter: result.balanceAfter,
  }
})

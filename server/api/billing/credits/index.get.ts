/**
 * GET /api/billing/credits
 *
 * AI クレジット残高・使用履歴を取得する
 * 認証必須
 */

import { defineEventHandler, getQuery } from 'h3'
import { requireAuth } from '~/server/utils/authMiddleware'
import { getAiCreditBalance, getCreditHistory } from '~/server/utils/aiCredits'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  const query = getQuery(event)

  const limit = Math.min(Number(query.limit) || 50, 100)
  const offset = Number(query.offset) || 0

  const [balance, history] = await Promise.all([
    getAiCreditBalance(auth.organizationId),
    getCreditHistory(auth.organizationId, limit, offset),
  ])

  return { balance, history }
})

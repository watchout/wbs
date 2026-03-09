/**
 * SiteDemand登録API
 *
 * POST /api/sites/:siteId/demands
 * 権限: LEADER+
 * organizationId スコープ必須
 *
 * SSOT参照: SSOT_SITE_ALLOCATION.md §10.2, §3-E E-2, §3-F, §3-G
 */

import { requireAuth, requireLeader } from '~/server/utils/authMiddleware'
import { prisma } from '~/server/utils/prisma'

const VALID_TIME_SLOTS = ['ALL_DAY', 'AM', 'PM', 'NIGHT'] as const
const VALID_PRIORITIES = ['HIGH', 'MEDIUM', 'LOW'] as const
const VALID_SOURCE_TYPES = ['MANUAL', 'AI_PARSED', 'IMPORTED'] as const

export default defineEventHandler(async (event) => {
  const authContext = await requireAuth(event)
  requireLeader(authContext)

  const siteId = getRouterParam(event, 'siteId')
  if (!siteId) {
    throw createError({ statusCode: 400, message: 'siteIdは必須です' })
  }

  // テナントスコープでSite存在チェック
  const site = await prisma.site.findFirst({
    where: {
      id: siteId,
      organizationId: authContext.organizationId,
      deletedAt: null,
    },
  })

  if (!site) {
    throw createError({ statusCode: 404, message: '現場が見つかりません' })
  }

  const body = await readBody(event)

  // バリデーション (§3-F)
  if (!body.date) {
    throw createError({ statusCode: 400, message: 'dateは必須です' })
  }
  if (!body.tradeType || typeof body.tradeType !== 'string' || body.tradeType.trim().length === 0) {
    throw createError({ statusCode: 400, message: 'tradeTypeは必須です' })
  }
  if (body.requiredCount === undefined || body.requiredCount === null) {
    throw createError({ statusCode: 400, message: 'requiredCountは必須です' })
  }
  const requiredCount = Number(body.requiredCount)
  if (!Number.isInteger(requiredCount) || requiredCount < 0) {
    throw createError({ statusCode: 400, message: 'requiredCountは0以上の整数です' })
  }
  if (requiredCount >= 1000) {
    throw createError({ statusCode: 400, message: 'requiredCountは999以下です' })
  }

  const timeSlot = body.timeSlot || 'ALL_DAY'
  if (!VALID_TIME_SLOTS.includes(timeSlot)) {
    throw createError({ statusCode: 400, message: `timeSlotは${VALID_TIME_SLOTS.join('/')}のいずれかです` })
  }

  const priority = body.priority || 'MEDIUM'
  if (!VALID_PRIORITIES.includes(priority)) {
    throw createError({ statusCode: 400, message: `priorityは${VALID_PRIORITIES.join('/')}のいずれかです` })
  }

  const sourceType = body.sourceType || 'MANUAL'
  if (!VALID_SOURCE_TYPES.includes(sourceType)) {
    throw createError({ statusCode: 400, message: `sourceTypeは${VALID_SOURCE_TYPES.join('/')}のいずれかです` })
  }

  // confidence バリデーション (§3-F)
  if (body.confidence !== undefined && body.confidence !== null) {
    const confidence = Number(body.confidence)
    if (isNaN(confidence) || confidence < 0 || confidence > 1.0) {
      throw createError({ statusCode: 400, message: 'confidenceは0.0〜1.0の範囲です' })
    }
  }

  // ユニーク制約チェック (§3-G: 重複 SiteDemand → 409)
  const existing = await prisma.siteDemand.findUnique({
    where: {
      siteId_date_tradeType_timeSlot: {
        siteId,
        date: new Date(body.date),
        tradeType: body.tradeType.trim(),
        timeSlot,
      },
    },
  })

  if (existing) {
    throw createError({
      statusCode: 409,
      message: '同じ日付・工種・時間帯の需要が既に登録されています',
    })
  }

  const confirmationStatus = sourceType === 'MANUAL' ? 'CONFIRMED' : (body.confirmationStatus || 'UNCONFIRMED')

  const demand = await prisma.siteDemand.create({
    data: {
      organizationId: authContext.organizationId,
      siteId,
      date: new Date(body.date),
      tradeType: body.tradeType.trim(),
      requiredCount,
      timeSlot,
      priority,
      sourceType,
      sourceDocumentId: body.sourceDocumentId || null,
      confidence: body.confidence !== undefined && body.confidence !== null ? Number(body.confidence) : null,
      confirmationStatus,
      note: body.note?.trim() || null,
      createdBy: authContext.userId!,
    },
  })

  return {
    success: true,
    data: demand,
  }
})

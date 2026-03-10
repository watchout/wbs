/**
 * SiteDemand更新API
 *
 * PATCH /api/site-demands/:id
 * 権限: LEADER+
 * organizationId スコープ必須
 *
 * SSOT参照: SSOT_SITE_ALLOCATION.md §10.2
 */

import { requireAuth, requireLeader } from '~/server/utils/authMiddleware'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const authContext = await requireAuth(event)
  requireLeader(authContext)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({ statusCode: 400, message: 'IDは必須です' })
  }

  const existing = await prisma.siteDemand.findFirst({
    where: {
      id,
      organizationId: authContext.organizationId,
    },
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: '需要データが見つかりません' })
  }

  const body = await readBody(event)
  const updateData: Record<string, unknown> = {
    updatedBy: authContext.userId,
  }

  if (body.requiredCount !== undefined) {
    const requiredCount = Number(body.requiredCount)
    if (!Number.isInteger(requiredCount) || requiredCount < 0) {
      throw createError({ statusCode: 400, message: 'requiredCountは0以上の整数です' })
    }
    if (requiredCount >= 1000) {
      throw createError({ statusCode: 400, message: 'requiredCountは999以下です' })
    }
    updateData.requiredCount = requiredCount
  }

  if (body.priority !== undefined) updateData.priority = body.priority
  if (body.confirmationStatus !== undefined) updateData.confirmationStatus = body.confirmationStatus
  if (body.note !== undefined) updateData.note = body.note?.trim() || null
  if (body.tradeType !== undefined) updateData.tradeType = body.tradeType.trim()

  const demand = await prisma.siteDemand.update({
    where: { id },
    data: updateData,
  })

  return {
    success: true,
    data: demand,
  }
})

/**
 * Site更新API
 *
 * PATCH /api/sites/:id
 * 権限: ADMIN/LEADER
 * organizationId スコープ必須
 *
 * SSOT参照: SSOT_SITE_ALLOCATION.md §10.1
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

  // 存在チェック + テナントスコープ
  const existing = await prisma.site.findFirst({
    where: {
      id,
      organizationId: authContext.organizationId,
      deletedAt: null,
    },
  })

  if (!existing) {
    throw createError({ statusCode: 404, message: '現場が見つかりません' })
  }

  const body = await readBody(event)

  // バリデーション (§3-F)
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length === 0) {
      throw createError({ statusCode: 400, message: 'nameは必須です' })
    }
    if (body.name.length > 100) {
      throw createError({ statusCode: 400, message: 'nameは100文字以内です' })
    }
  }

  const updateData: Record<string, unknown> = {}
  if (body.name !== undefined) updateData.name = body.name.trim()
  if (body.address !== undefined) updateData.address = body.address?.trim() || null
  if (body.clientName !== undefined) updateData.clientName = body.clientName?.trim() || null
  if (body.status !== undefined) updateData.status = body.status
  if (body.startDate !== undefined) updateData.startDate = body.startDate ? new Date(body.startDate) : null
  if (body.endDate !== undefined) updateData.endDate = body.endDate ? new Date(body.endDate) : null
  if (body.note !== undefined) updateData.note = body.note?.trim() || null

  const site = await prisma.site.update({
    where: { id },
    data: updateData,
  })

  return {
    success: true,
    data: site,
  }
})

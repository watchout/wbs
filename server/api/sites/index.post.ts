/**
 * Site作成API
 *
 * POST /api/sites
 * 権限: ADMIN/LEADER
 * organizationId スコープ必須
 *
 * SSOT参照: SSOT_SITE_ALLOCATION.md §10.1, §3-F
 */

import { requireAuth, requireLeader } from '~/server/utils/authMiddleware'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const authContext = await requireAuth(event)
  requireLeader(authContext)

  const body = await readBody(event)

  // バリデーション (§3-F)
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    throw createError({ statusCode: 400, message: 'nameは必須です' })
  }
  if (body.name.length > 100) {
    throw createError({ statusCode: 400, message: 'nameは100文字以内です' })
  }

  const site = await prisma.site.create({
    data: {
      organizationId: authContext.organizationId,
      name: body.name.trim(),
      address: body.address?.trim() || null,
      clientName: body.clientName?.trim() || null,
      status: body.status || 'ACTIVE',
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      note: body.note?.trim() || null,
      createdBy: authContext.userId!,
    },
  })

  return {
    success: true,
    data: site,
  }
})

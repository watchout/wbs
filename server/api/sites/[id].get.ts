/**
 * Site詳細API
 *
 * GET /api/sites/:id
 * 権限: MEMBER+
 * organizationId スコープ必須
 *
 * SSOT参照: SSOT_SITE_ALLOCATION.md §10.1
 */

import { requireAuth } from '~/server/utils/authMiddleware'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const authContext = await requireAuth(event)
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({ statusCode: 400, message: 'IDは必須です' })
  }

  const site = await prisma.site.findFirst({
    where: {
      id,
      organizationId: authContext.organizationId,
      deletedAt: null,
    },
  })

  if (!site) {
    throw createError({ statusCode: 404, message: '現場が見つかりません' })
  }

  return {
    success: true,
    data: site,
  }
})

/**
 * SiteDemand削除API
 *
 * DELETE /api/site-demands/:id
 * 権限: ADMINのみ
 * organizationId スコープ必須
 *
 * SSOT参照: SSOT_SITE_ALLOCATION.md §10.2
 */

import { requireAuth, requireAdmin } from '~/server/utils/authMiddleware'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const authContext = await requireAuth(event)
  requireAdmin(authContext)

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

  await prisma.siteDemand.delete({
    where: { id },
  })

  return {
    success: true,
    message: '需要データを削除しました',
  }
})

/**
 * Site削除API（論理削除）
 *
 * DELETE /api/sites/:id
 * 権限: ADMINのみ
 * organizationId スコープ必須
 *
 * SSOT参照: SSOT_SITE_ALLOCATION.md §10.1, FR-SITE-003
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

  // 論理削除
  await prisma.site.update({
    where: { id },
    data: { deletedAt: new Date() },
  })

  return {
    success: true,
    message: '現場を削除しました',
  }
})

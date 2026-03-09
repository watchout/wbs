/**
 * Site一覧API
 *
 * GET /api/sites
 * クエリ: status, search
 * 権限: MEMBER+
 * organizationId スコープ必須
 *
 * SSOT参照: SSOT_SITE_ALLOCATION.md §10.1
 */

import { requireAuth } from '~/server/utils/authMiddleware'
import { prisma } from '~/server/utils/prisma'

export default defineEventHandler(async (event) => {
  const authContext = await requireAuth(event)
  const query = getQuery(event)

  const status = query.status as string | undefined
  const search = query.search as string | undefined

  const where: Record<string, unknown> = {
    organizationId: authContext.organizationId,
    deletedAt: null,
  }

  if (status) {
    where.status = status
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { address: { contains: search, mode: 'insensitive' } },
      { clientName: { contains: search, mode: 'insensitive' } },
    ]
  }

  const sites = await prisma.site.findMany({
    where,
    orderBy: [{ status: 'asc' }, { name: 'asc' }],
  })

  return {
    success: true,
    data: sites,
  }
})

// server/api/notifications/history.get.ts
// Sprint 6: 通知履歴取得（ADMIN）

import { prisma } from '~/server/utils/prisma'
import { requireAuth, requireAdmin } from '~/server/utils/authMiddleware'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireAdmin(auth)

  const query = getQuery(event)
  const limit = Math.min(parseInt(query.limit as string) || 50, 200)
  const offset = parseInt(query.offset as string) || 0
  const channel = query.channel as string | undefined
  const status = query.status as string | undefined

  const where: Record<string, unknown> = {
    organizationId: auth.organizationId,
  }
  if (channel) where.channel = channel
  if (status) where.status = status

  const [logs, total] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.notificationLog.count({ where }),
  ])

  return {
    success: true,
    data: logs,
    pagination: { limit, offset, total, hasMore: offset + limit < total },
  }
})

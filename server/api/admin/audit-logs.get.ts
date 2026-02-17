/**
 * 操作ログ取得API（AUDIT-001）
 *
 * GET /api/admin/audit-logs
 * ADMIN権限必須
 */

import { getQuery, createError } from 'h3'
import { requireAuth, requireAdmin } from '../../utils/authMiddleware'
import { getAuditLogs } from '../../utils/auditLog'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)
  requireAdmin(auth)

  const query = getQuery(event)

  const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1)
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '50'), 10) || 50))
  const action = typeof query.action === 'string' ? query.action : undefined
  const userId = typeof query.userId === 'string' ? query.userId : undefined

  const from = typeof query.from === 'string' ? new Date(query.from) : undefined
  const to = typeof query.to === 'string' ? new Date(query.to) : undefined

  if (from && isNaN(from.getTime())) {
    throw createError({
      statusCode: 400,
      statusMessage: 'from の日時形式が不正です',
    })
  }

  if (to && isNaN(to.getTime())) {
    throw createError({
      statusCode: 400,
      statusMessage: 'to の日時形式が不正です',
    })
  }

  const result = await getAuditLogs(auth.organizationId, {
    page,
    limit,
    action,
    userId,
    from,
    to,
  })

  return {
    success: true,
    ...result,
  }
})

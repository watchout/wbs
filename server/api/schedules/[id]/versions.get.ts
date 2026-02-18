/**
 * スケジュール変更履歴取得API（AUDIT-003）
 *
 * GET /api/schedules/:id/versions
 */

import { createError, getRouterParam, getQuery } from 'h3'
import { requireAuth } from '~/server/utils/authMiddleware'
import { getScheduleVersions } from '~/server/utils/scheduleVersion'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'スケジュールIDは必須です',
    })
  }

  const query = getQuery(event)
  const page = Math.max(1, parseInt(String(query.page || '1'), 10))
  const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10)))

  const result = await getScheduleVersions(id, auth.organizationId, { page, limit })

  if (!result) {
    throw createError({
      statusCode: 404,
      statusMessage: 'スケジュールが見つかりません',
    })
  }

  return {
    success: true,
    ...result,
  }
})

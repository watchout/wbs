/**
 * バックアップ一覧取得API（OPS-003）
 *
 * GET /api/admin/backups
 * ADMIN権限必須
 */

import { createError } from 'h3'
import { requireAuth } from '~/server/utils/authMiddleware'
import { listBackups } from '~/server/utils/backup'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  if (auth.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: '管理者権限が必要です',
    })
  }

  const backups = listBackups()

  return {
    success: true,
    backups,
    total: backups.length,
  }
})

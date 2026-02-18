/**
 * 手動バックアップ実行API（OPS-003）
 *
 * POST /api/admin/backups
 * ADMIN権限必須
 */

import { createError } from 'h3'
import { requireAuth } from '~/server/utils/authMiddleware'
import { createBackup, pruneOldBackups } from '~/server/utils/backup'
import { createAuditLog, AUDIT_ACTIONS } from '~/server/utils/auditLog'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  if (auth.role !== 'ADMIN') {
    throw createError({
      statusCode: 403,
      statusMessage: '管理者権限が必要です',
    })
  }

  const backup = createBackup('manual')

  if (!backup) {
    throw createError({
      statusCode: 500,
      statusMessage: 'バックアップの作成に失敗しました',
    })
  }

  // 古いバックアップを自動削除
  const pruned = pruneOldBackups()

  // 操作ログ
  await createAuditLog({
    organizationId: auth.organizationId,
    userId: auth.userId,
    action: AUDIT_ACTIONS.ORGANIZATION_UPDATE,
    meta: { type: 'backup_create', filename: backup.filename, pruned: String(pruned) },
  })

  return {
    success: true,
    backup,
    pruned,
  }
})

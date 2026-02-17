/**
 * スケジュール削除API
 *
 * DELETE /api/schedules/:id
 */

import { createError, getRouterParam } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth, requireScheduleEditPermission } from '~/server/utils/authMiddleware'
import { emitScheduleDeleted } from '~/server/utils/socket'
import { createAuditLog, AUDIT_ACTIONS } from '~/server/utils/auditLog'

interface DeleteScheduleResponse {
  success: boolean
  message: string
}

export default defineEventHandler(async (event): Promise<DeleteScheduleResponse> => {
  const auth = await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'スケジュールIDは必須です'
    })
  }

  // 存在確認 + 組織フィルタ
  const existing = await prisma.schedule.findFirst({
    where: {
      id,
      organizationId: auth.organizationId,
      deletedAt: null  // ソフトデリート済みは除外
    },
    include: {
      author: {
        select: { departmentId: true }
      }
    }
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'スケジュールが見つかりません'
    })
  }

  // 現在のユーザーの部署を取得
  const currentUser = await prisma.user.findUnique({
    where: { id: auth.userId },
    select: { departmentId: true }
  })

  // 権限チェック: ADMIN, LEADER(同部署), または本人
  requireScheduleEditPermission({
    authContext: auth,
    scheduleAuthorId: existing.authorId,
    scheduleAuthorDepartmentId: existing.author?.departmentId ?? null,
    userDepartmentId: currentUser?.departmentId ?? null
  })

  // ソフトデリート（物理削除ではなく論理削除）
  await prisma.schedule.update({
    where: { id },
    data: { deletedAt: new Date() }
  })

  // リアルタイム通知（WBS-008）
  emitScheduleDeleted({
    scheduleId: id,
    organizationId: auth.organizationId,
    employeeId: existing.authorId ?? undefined,
  })

  // 操作ログ（AUDIT-001）
  await createAuditLog({
    organizationId: auth.organizationId,
    userId: auth.userId,
    action: AUDIT_ACTIONS.SCHEDULE_DELETE,
    targetId: id,
    meta: { title: existing.title },
  })

  return {
    success: true,
    message: 'スケジュールを削除しました'
  }
})

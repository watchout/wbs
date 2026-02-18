/**
 * スケジュール更新API
 *
 * PATCH /api/schedules/:id
 */

import { readBody, createError, getRouterParam } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth, requireScheduleEditPermission } from '~/server/utils/authMiddleware'
import { emitScheduleUpdated } from '~/server/utils/socket'
import { createAuditLog, AUDIT_ACTIONS } from '~/server/utils/auditLog'
import { createScheduleSnapshot, computeScheduleDiff, createScheduleVersion } from '~/server/utils/scheduleVersion'
import { notifyScheduleChange } from '~/server/utils/scheduleNotifier'

interface UpdateScheduleRequest {
  title?: string
  description?: string | null
  start?: string
  end?: string
  authorId?: string | null
  color?: string | null
}

interface UpdateScheduleResponse {
  success: boolean
  schedule: {
    id: string
    title: string
    description: string | null
    start: string
    end: string
    authorId: string | null
    color: string | null
    updatedAt: string
  }
}

export default defineEventHandler(async (event): Promise<UpdateScheduleResponse> => {
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

  const body = await readBody<UpdateScheduleRequest>(event)

  // title が空文字の場合はエラー
  if (body.title !== undefined && body.title.trim() === '') {
    throw createError({
      statusCode: 400,
      statusMessage: 'タイトルは空にできません'
    })
  }

  // start / end の整合性チェック
  const newStart = body.start ? new Date(body.start) : existing.start
  const newEnd = body.end ? new Date(body.end) : existing.end

  if (body.start && isNaN(newStart.getTime())) {
    throw createError({
      statusCode: 400,
      statusMessage: '開始日時の形式が不正です'
    })
  }
  if (body.end && isNaN(newEnd.getTime())) {
    throw createError({
      statusCode: 400,
      statusMessage: '終了日時の形式が不正です'
    })
  }

  if (newStart >= newEnd) {
    throw createError({
      statusCode: 400,
      statusMessage: '開始日時は終了日時より前である必要があります'
    })
  }

  // authorId が指定された場合、同一組織のユーザーか確認
  if (body.authorId) {
    const author = await prisma.user.findFirst({
      where: {
        id: body.authorId,
        organizationId: auth.organizationId
      }
    })
    if (!author) {
      throw createError({
        statusCode: 400,
        statusMessage: '指定されたユーザーが見つかりません'
      })
    }
  }

  // 変更前のスナップショット（AUDIT-003）
  const beforeSnapshot = createScheduleSnapshot(existing)

  const schedule = await prisma.schedule.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title.trim() }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.start && { start: newStart }),
      ...(body.end && { end: newEnd }),
      ...(body.authorId !== undefined && { authorId: body.authorId }),
      ...(body.color !== undefined && { color: body.color })
    }
  })

  // 変更後のスナップショット + バージョン記録（AUDIT-003）
  const afterSnapshot = createScheduleSnapshot(schedule)
  const diff = computeScheduleDiff(beforeSnapshot, afterSnapshot)
  await createScheduleVersion(schedule.id, diff)

  // リアルタイム通知（WBS-008）
  emitScheduleUpdated({
    scheduleId: schedule.id,
    organizationId: auth.organizationId,
    employeeId: schedule.authorId ?? undefined,
  })

  // 操作ログ（AUDIT-001）
  await createAuditLog({
    organizationId: auth.organizationId,
    userId: auth.userId,
    action: AUDIT_ACTIONS.SCHEDULE_UPDATE,
    targetId: schedule.id,
    meta: { title: schedule.title },
  })

  // メール通知（NOTIF-001）
  notifyScheduleChange({
    scheduleId: schedule.id,
    scheduleTitle: schedule.title,
    changeType: 'updated',
    changedByUserId: auth.userId,
    organizationId: auth.organizationId,
    start: schedule.start.toISOString(),
    end: schedule.end.toISOString(),
  })

  return {
    success: true,
    schedule: {
      id: schedule.id,
      title: schedule.title,
      description: schedule.description,
      start: schedule.start.toISOString(),
      end: schedule.end.toISOString(),
      authorId: schedule.authorId,
      color: schedule.color,
      updatedAt: schedule.updatedAt.toISOString()
    }
  }
})

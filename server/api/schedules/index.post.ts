/**
 * スケジュール作成API
 *
 * POST /api/schedules
 */

import { readBody, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth, requireScheduleEditPermission } from '~/server/utils/authMiddleware'
import { emitScheduleCreated } from '~/server/utils/socket'
import { createAuditLog, AUDIT_ACTIONS } from '~/server/utils/auditLog'
import { notifyScheduleChange } from '~/server/utils/scheduleNotifier'

interface CreateScheduleRequest {
  title: string
  description?: string
  start: string
  end: string
  authorId?: string
  color?: string
}

interface CreateScheduleResponse {
  success: boolean
  schedule: {
    id: string
    title: string
    description: string | null
    start: string
    end: string
    authorId: string | null
    color: string | null
    createdAt: string
  }
}

export default defineEventHandler(async (event): Promise<CreateScheduleResponse> => {
  const auth = await requireAuth(event)

  const body = await readBody<CreateScheduleRequest>(event)

  // title 必須チェック
  if (!body.title || body.title.trim() === '') {
    throw createError({
      statusCode: 400,
      statusMessage: 'タイトルは必須です'
    })
  }

  // start / end 必須チェック
  if (!body.start || !body.end) {
    throw createError({
      statusCode: 400,
      statusMessage: '開始日時と終了日時は必須です'
    })
  }

  const start = new Date(body.start)
  const end = new Date(body.end)

  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    throw createError({
      statusCode: 400,
      statusMessage: '日時の形式が不正です'
    })
  }

  // start < end チェック
  if (start >= end) {
    throw createError({
      statusCode: 400,
      statusMessage: '開始日時は終了日時より前である必要があります'
    })
  }

  // authorId の決定と権限チェック
  let authorId = auth.userId || null
  if (body.authorId && body.authorId !== auth.userId) {
    // 他人の予定を作成する場合: 存在確認 + 権限チェック
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

    // 操作者の部署情報を取得
    const currentUser = await prisma.user.findUnique({
      where: { id: auth.userId }
    })

    // ADMIN / LEADER（同部署）のみ他人の予定を作成可能
    requireScheduleEditPermission({
      authContext: auth,
      scheduleAuthorId: body.authorId,
      scheduleAuthorDepartmentId: author.departmentId,
      userDepartmentId: currentUser?.departmentId ?? null
    })

    authorId = body.authorId
  }

  const schedule = await prisma.schedule.create({
    data: {
      organizationId: auth.organizationId,
      title: body.title.trim(),
      description: body.description || null,
      start,
      end,
      authorId,
      color: body.color || null
    }
  })

  // リアルタイム通知（WBS-008）
  emitScheduleCreated({
    scheduleId: schedule.id,
    organizationId: auth.organizationId,
    employeeId: schedule.authorId ?? undefined,
  })

  // 操作ログ（AUDIT-001）
  await createAuditLog({
    organizationId: auth.organizationId,
    userId: auth.userId,
    action: AUDIT_ACTIONS.SCHEDULE_CREATE,
    targetId: schedule.id,
    meta: { title: schedule.title },
  })

  // メール通知（NOTIF-001）
  notifyScheduleChange({
    scheduleId: schedule.id,
    scheduleTitle: schedule.title,
    changeType: 'created',
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
      createdAt: schedule.createdAt.toISOString()
    }
  }
})

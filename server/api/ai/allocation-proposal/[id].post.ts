// server/api/ai/allocation-proposal/[id].post.ts
// Sprint 5: AI提案を仮配置（DRAFT）として適用（AC-S5-04〜07）

import { createError, readBody } from 'h3'
import { requireAuth } from '~/server/utils/authMiddleware'
import { prisma } from '~/server/utils/prisma'
import { createAuditLog, AUDIT_ACTIONS } from '~/server/utils/auditLog'
import { logger } from '~/server/utils/logger'
import { sendNotification, buildAssignmentChangeEmail } from '~/server/utils/notification'

interface ApplyRequest {
  siteId: string
  date: string // YYYY-MM-DD
  selectedUserIds: string[]
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  // LEADER+ のみ
  if (auth.role === 'MEMBER') {
    throw createError({
      statusCode: 403,
      statusMessage: '仮配置にはリーダー以上の権限が必要です。',
    })
  }

  const { id: proposalId } = event.context.params as { id: string }
  const body = await readBody<ApplyRequest>(event)

  if (!body.siteId || !body.date || !body.selectedUserIds?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'siteId, date, selectedUserIds は必須です。',
    })
  }

  // 現場の組織チェック
  const site = await prisma.site.findUnique({
    where: { id: body.siteId },
    select: { id: true, name: true, organizationId: true },
  })

  if (!site || site.organizationId !== auth.organizationId) {
    throw createError({ statusCode: 404, statusMessage: '現場が見つかりません。' })
  }

  // 選択されたユーザーの組織チェック
  const users = await prisma.user.findMany({
    where: {
      id: { in: body.selectedUserIds },
      organizationId: auth.organizationId,
    },
    select: { id: true, name: true },
  })

  if (users.length !== body.selectedUserIds.length) {
    throw createError({
      statusCode: 400,
      statusMessage: '指定されたユーザーの一部が見つかりません。',
    })
  }

  // 仮配置スケジュールを作成（isDraft = true）
  const schedStart = new Date(body.date + 'T08:00:00')
  const schedEnd = new Date(body.date + 'T17:00:00')

  const createdSchedules: string[] = []

  for (const user of users) {
    // 同日・同現場に既存スケジュールがないか確認
    const existing = await prisma.schedule.findFirst({
      where: {
        authorId: user.id,
        siteId: body.siteId,
        deletedAt: null,
        start: { gte: new Date(body.date + 'T00:00:00'), lte: new Date(body.date + 'T23:59:59') },
      },
    })

    if (existing) continue // 既に配置済みならスキップ

    const schedule = await prisma.schedule.create({
      data: {
        authorId: user.id,
        organizationId: auth.organizationId,
        siteId: body.siteId,
        title: `${site.name}（仮配置）`,
        description: JSON.stringify({
          siteName: site.name,
          source: 'ai_proposal',
          proposalId,
        }),
        start: schedStart,
        end: schedEnd,
        isDraft: true,
        proposalId,
      },
      select: { id: true },
    })

    createdSchedules.push(schedule.id)
  }

  // 監査ログ記録（AC-S5-07）
  createAuditLog({
    organizationId: auth.organizationId,
    userId: auth.userId,
    action: AUDIT_ACTIONS.AI_ASSIGNMENT,
    meta: {
      type: 'ai_draft_assignment',
      proposalId,
      siteId: body.siteId,
      siteName: site.name,
      date: body.date,
      selectedUsers: users.map((u) => ({ id: u.id, name: u.name })),
      createdScheduleIds: createdSchedules,
    },
  })

  // メール通知（Sprint 6: AC-N1-01）
  const appUrl = process.env.NUXT_PUBLIC_APP_URL || 'https://app.mielboard.com'
  for (const user of users) {
    const email = buildAssignmentChangeEmail({
      recipientName: user.name || '担当者',
      siteName: site.name,
      date: body.date,
      isDraft: true,
      appUrl: `${appUrl}/org/${auth.organizationId}/weekly-board`,
    })
    sendNotification({
      organizationId: auth.organizationId,
      recipientId: user.id,
      channel: 'EMAIL',
      eventType: 'assignment_change',
      subject: email.subject,
      body: email.body,
    })
  }

  logger.info('AI proposal applied as draft', {
    proposalId,
    siteId: body.siteId,
    date: body.date,
    draftCount: createdSchedules.length,
    userId: auth.userId,
  })

  return {
    success: true,
    proposalId,
    createdDrafts: createdSchedules.length,
    message: `${createdSchedules.length}件の仮配置を作成しました。確定するには個別に承認してください。`,
  }
})

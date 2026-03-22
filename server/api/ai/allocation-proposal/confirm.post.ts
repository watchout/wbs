// server/api/ai/allocation-proposal/confirm.post.ts
// Sprint 5: 仮配置を確定に変更（AC-S5-06）

import { createError, readBody } from 'h3'
import { requireAuth } from '~/server/utils/authMiddleware'
import { prisma } from '~/server/utils/prisma'
import { createAuditLog, AUDIT_ACTIONS } from '~/server/utils/auditLog'
import { logger } from '~/server/utils/logger'

interface ConfirmRequest {
  scheduleIds: string[]
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  if (auth.role === 'MEMBER') {
    throw createError({
      statusCode: 403,
      statusMessage: '配置確定にはリーダー以上の権限が必要です。',
    })
  }

  const body = await readBody<ConfirmRequest>(event)

  if (!body.scheduleIds?.length) {
    throw createError({
      statusCode: 400,
      statusMessage: 'scheduleIds は必須です。',
    })
  }

  // 仮配置スケジュールを取得
  const drafts = await prisma.schedule.findMany({
    where: {
      id: { in: body.scheduleIds },
      organizationId: auth.organizationId,
      isDraft: true,
      deletedAt: null,
    },
    select: { id: true, title: true, siteId: true, authorId: true },
  })

  if (drafts.length === 0) {
    throw createError({
      statusCode: 404,
      statusMessage: '確定可能な仮配置が見つかりません。',
    })
  }

  // isDraft = false に更新、タイトルから「（仮配置）」を除去
  await prisma.schedule.updateMany({
    where: {
      id: { in: drafts.map((d) => d.id) },
    },
    data: {
      isDraft: false,
    },
  })

  // タイトル更新（個別）
  for (const draft of drafts) {
    await prisma.schedule.update({
      where: { id: draft.id },
      data: {
        title: draft.title.replace('（仮配置）', '').trim(),
      },
    })
  }

  // 監査ログ
  createAuditLog({
    organizationId: auth.organizationId,
    userId: auth.userId,
    action: AUDIT_ACTIONS.AI_ASSIGNMENT,
    meta: {
      type: 'draft_confirmed',
      confirmedIds: drafts.map((d) => d.id),
      count: drafts.length,
    },
  })

  logger.info('Draft assignments confirmed', {
    confirmedCount: drafts.length,
    userId: auth.userId,
  })

  return {
    success: true,
    confirmedCount: drafts.length,
    message: `${drafts.length}件の仮配置を確定しました。`,
  }
})

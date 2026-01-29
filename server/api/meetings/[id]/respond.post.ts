/**
 * 日程調整回答API
 * 
 * POST /api/meetings/:id/respond
 */

import { readBody, createError, getRouterParam } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/authMiddleware'

interface RespondRequest {
  candidateIds: string[]
}

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'IDは必須です'
    })
  }

  const body = await readBody<RespondRequest>(event)

  if (!body.candidateIds || body.candidateIds.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: '候補日時を選択してください'
    })
  }

  // 日程調整リクエストを取得
  const meeting = await prisma.meetingRequest.findFirst({
    where: {
      id,
      organizationId: auth.organizationId,
      deletedAt: null,
      status: 'OPEN'
    }
  })

  if (!meeting) {
    throw createError({
      statusCode: 404,
      statusMessage: '日程調整リクエストが見つかりません'
    })
  }

  // 招待者として登録されているか確認
  const invitee = await prisma.meetingInvitee.findUnique({
    where: {
      meetingRequestId_userId: {
        meetingRequestId: id,
        userId: auth.userId!
      }
    }
  })

  if (!invitee) {
    throw createError({
      statusCode: 403,
      statusMessage: 'この日程調整の招待者ではありません'
    })
  }

  if (invitee.status === 'RESPONDED') {
    throw createError({
      statusCode: 400,
      statusMessage: 'すでに回答済みです'
    })
  }

  // 回答を保存
  await prisma.meetingInvitee.update({
    where: { id: invitee.id },
    data: {
      status: 'RESPONDED',
      selectedCandidateIds: body.candidateIds,
      respondedAt: new Date()
    }
  })

  // 候補日時の回答数を更新
  for (const candidateId of body.candidateIds) {
    await prisma.meetingCandidate.update({
      where: { id: candidateId },
      data: { responseCount: { increment: 1 } }
    })
  }

  return {
    success: true,
    message: '回答を送信しました'
  }
})

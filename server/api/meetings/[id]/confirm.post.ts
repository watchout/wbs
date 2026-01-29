/**
 * 日程調整確定API
 * 
 * POST /api/meetings/:id/confirm
 */

import { readBody, createError, getRouterParam } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/authMiddleware'

interface ConfirmRequest {
  candidateId: string
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

  const body = await readBody<ConfirmRequest>(event)

  if (!body.candidateId) {
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

  // 主催者のみ確定可能
  if (meeting.organizerId !== auth.userId) {
    throw createError({
      statusCode: 403,
      statusMessage: '主催者のみが日程を確定できます'
    })
  }

  // 候補日時を取得
  const candidate = await prisma.meetingCandidate.findFirst({
    where: {
      id: body.candidateId,
      meetingRequestId: id
    }
  })

  if (!candidate) {
    throw createError({
      statusCode: 400,
      statusMessage: '無効な候補日時です'
    })
  }

  // 日程を確定
  await prisma.meetingRequest.update({
    where: { id },
    data: {
      status: 'CONFIRMED',
      confirmedStart: candidate.start,
      confirmedEnd: candidate.end
    }
  })

  // 参加者全員のスケジュールを自動作成
  const invitees = await prisma.meetingInvitee.findMany({
    where: { meetingRequestId: id },
    select: { userId: true }
  })

  const allUserIds = [meeting.organizerId, ...invitees.map(i => i.userId)]
  
  for (const userId of allUserIds) {
    await prisma.schedule.create({
      data: {
        organizationId: auth.organizationId,
        authorId: userId,
        title: meeting.title,
        description: meeting.description,
        start: candidate.start,
        end: candidate.end,
        source: 'INTERNAL'
      }
    })
  }

  return {
    success: true,
    message: '日程を確定しました',
    confirmedStart: candidate.start.toISOString(),
    confirmedEnd: candidate.end.toISOString()
  }
})

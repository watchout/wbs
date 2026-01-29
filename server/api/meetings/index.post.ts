/**
 * 日程調整リクエスト作成API
 * 
 * POST /api/meetings
 */

import { readBody, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth, requireLeader } from '~/server/utils/authMiddleware'
import { findAvailableSlots } from '~/server/utils/meetingScheduler'

interface CreateMeetingRequest {
  title: string
  description?: string
  duration: number
  dateRangeStart: string
  dateRangeEnd: string
  inviteeUserIds: string[]
  autoSuggestCandidates?: boolean
}

interface CreateMeetingResponse {
  success: boolean
  meeting: {
    id: string
    title: string
    status: string
    candidateCount: number
  }
}

export default defineEventHandler(async (event): Promise<CreateMeetingResponse> => {
  const auth = await requireAuth(event)
  requireLeader(auth)

  const body = await readBody<CreateMeetingRequest>(event)

  if (!body.title?.trim()) {
    throw createError({
      statusCode: 400,
      statusMessage: 'タイトルは必須です'
    })
  }

  if (!body.duration || body.duration < 15) {
    throw createError({
      statusCode: 400,
      statusMessage: '会議時間は15分以上で指定してください'
    })
  }

  if (!body.inviteeUserIds || body.inviteeUserIds.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: '招待者を指定してください'
    })
  }

  const dateRangeStart = new Date(body.dateRangeStart)
  const dateRangeEnd = new Date(body.dateRangeEnd)

  if (isNaN(dateRangeStart.getTime()) || isNaN(dateRangeEnd.getTime())) {
    throw createError({
      statusCode: 400,
      statusMessage: '日付形式が不正です'
    })
  }

  // 招待者が同じ組織に属しているか確認
  const invitees = await prisma.user.findMany({
    where: {
      id: { in: body.inviteeUserIds },
      organizationId: auth.organizationId,
      deletedAt: null
    },
    select: { id: true }
  })

  if (invitees.length !== body.inviteeUserIds.length) {
    throw createError({
      statusCode: 400,
      statusMessage: '無効な招待者が含まれています'
    })
  }

  // 日程調整リクエストを作成
  const meeting = await prisma.meetingRequest.create({
    data: {
      organizationId: auth.organizationId,
      organizerId: auth.userId!,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      duration: body.duration,
      dateRangeStart,
      dateRangeEnd,
      status: 'DRAFT',
      invitees: {
        create: body.inviteeUserIds.map(userId => ({
          userId,
          status: 'PENDING'
        }))
      }
    }
  })

  // 自動で候補日時を提案
  let candidateCount = 0
  if (body.autoSuggestCandidates !== false) {
    const allUserIds = [auth.userId!, ...body.inviteeUserIds]
    const candidates = await findAvailableSlots({
      organizationId: auth.organizationId,
      userIds: allUserIds,
      dateRangeStart,
      dateRangeEnd,
      duration: body.duration
    })

    // 上位10件を候補として保存
    const topCandidates = candidates.slice(0, 10)
    if (topCandidates.length > 0) {
      await prisma.meetingCandidate.createMany({
        data: topCandidates.map(c => ({
          meetingRequestId: meeting.id,
          start: c.start,
          end: c.end,
          isAiSuggested: true
        }))
      })
      candidateCount = topCandidates.length
    }
  }

  // ステータスをOPENに更新
  await prisma.meetingRequest.update({
    where: { id: meeting.id },
    data: { status: 'OPEN' }
  })

  return {
    success: true,
    meeting: {
      id: meeting.id,
      title: meeting.title,
      status: 'OPEN',
      candidateCount
    }
  }
})

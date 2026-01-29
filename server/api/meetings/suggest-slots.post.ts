/**
 * 空き時間候補取得API
 * 
 * POST /api/meetings/suggest-slots
 * 
 * 指定された参加者の空き時間を検索し、候補日時を提案
 */

import { readBody, createError } from 'h3'
import { requireAuth, requireLeader } from '~/server/utils/authMiddleware'
import { findAvailableSlots, findAllAvailableSlots } from '~/server/utils/meetingScheduler'

interface SuggestSlotsRequest {
  userIds: string[]
  dateRangeStart: string
  dateRangeEnd: string
  duration: number  // 分
  requireAllAvailable?: boolean
}

interface SuggestSlotsResponse {
  success: boolean
  candidates: Array<{
    start: string
    end: string
    availableUserIds: string[]
    score: number
  }>
}

export default defineEventHandler(async (event): Promise<SuggestSlotsResponse> => {
  const auth = await requireAuth(event)
  requireLeader(auth)  // LEADER以上のみ利用可能

  const body = await readBody<SuggestSlotsRequest>(event)

  if (!body.userIds || body.userIds.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: '参加者を指定してください'
    })
  }

  if (!body.dateRangeStart || !body.dateRangeEnd) {
    throw createError({
      statusCode: 400,
      statusMessage: '検索範囲を指定してください'
    })
  }

  if (!body.duration || body.duration < 15) {
    throw createError({
      statusCode: 400,
      statusMessage: '会議時間は15分以上で指定してください'
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

  if (dateRangeStart >= dateRangeEnd) {
    throw createError({
      statusCode: 400,
      statusMessage: '開始日は終了日より前である必要があります'
    })
  }

  const params = {
    organizationId: auth.organizationId,
    userIds: body.userIds,
    dateRangeStart,
    dateRangeEnd,
    duration: body.duration
  }

  const candidates = body.requireAllAvailable
    ? await findAllAvailableSlots(params)
    : await findAvailableSlots(params)

  return {
    success: true,
    candidates: candidates.map(c => ({
      start: c.start.toISOString(),
      end: c.end.toISOString(),
      availableUserIds: c.availableUserIds,
      score: c.score
    }))
  }
})

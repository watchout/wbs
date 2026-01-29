/**
 * スケジュール作成API
 *
 * POST /api/schedules
 */

import { readBody, createError } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/authMiddleware'

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

  // authorId が指定された場合、同一組織のユーザーか確認
  let authorId = auth.userId || null
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

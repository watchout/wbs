/**
 * 日程調整リクエスト詳細取得API
 * 
 * GET /api/meetings/:id
 */

import { createError, getRouterParam } from 'h3'
import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/authMiddleware'

export default defineEventHandler(async (event) => {
  const auth = await requireAuth(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'IDは必須です'
    })
  }

  const meeting = await prisma.meetingRequest.findFirst({
    where: {
      id,
      organizationId: auth.organizationId,
      deletedAt: null
    },
    include: {
      organizer: {
        select: { id: true, name: true }
      },
      candidates: {
        orderBy: { start: 'asc' }
      },
      invitees: {
        include: {
          user: {
            select: { id: true, name: true, email: true }
          }
        }
      }
    }
  })

  if (!meeting) {
    throw createError({
      statusCode: 404,
      statusMessage: '日程調整リクエストが見つかりません'
    })
  }

  return {
    success: true,
    meeting: {
      id: meeting.id,
      title: meeting.title,
      description: meeting.description,
      status: meeting.status,
      duration: meeting.duration,
      dateRangeStart: meeting.dateRangeStart.toISOString(),
      dateRangeEnd: meeting.dateRangeEnd.toISOString(),
      confirmedStart: meeting.confirmedStart?.toISOString() ?? null,
      confirmedEnd: meeting.confirmedEnd?.toISOString() ?? null,
      organizer: meeting.organizer,
      createdAt: meeting.createdAt.toISOString()
    },
    candidates: meeting.candidates.map(c => ({
      id: c.id,
      start: c.start.toISOString(),
      end: c.end.toISOString(),
      isAiSuggested: c.isAiSuggested,
      responseCount: c.responseCount
    })),
    invitees: meeting.invitees.map(i => ({
      id: i.id,
      user: i.user,
      status: i.status,
      selectedCandidateIds: i.selectedCandidateIds,
      respondedAt: i.respondedAt?.toISOString() ?? null
    }))
  }
})

/**
 * 日程調整リクエスト一覧取得API
 * 
 * GET /api/meetings
 * 
 * 自分が主催者または招待者の日程調整リクエストを取得
 */

import { prisma } from '~/server/utils/prisma'
import { requireAuth } from '~/server/utils/authMiddleware'

interface MeetingListResponse {
  success: boolean
  meetings: Array<{
    id: string
    title: string
    status: string
    duration: number
    dateRangeStart: string
    dateRangeEnd: string
    organizer: { id: string; name: string | null }
    inviteeCount: number
    confirmedStart: string | null
    createdAt: string
  }>
}

export default defineEventHandler(async (event): Promise<MeetingListResponse> => {
  const auth = await requireAuth(event)

  const meetings = await prisma.meetingRequest.findMany({
    where: {
      organizationId: auth.organizationId,
      deletedAt: null,
      OR: [
        { organizerId: auth.userId },
        { invitees: { some: { userId: auth.userId } } }
      ]
    },
    include: {
      organizer: {
        select: { id: true, name: true }
      },
      _count: {
        select: { invitees: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  })

  return {
    success: true,
    meetings: meetings.map(m => ({
      id: m.id,
      title: m.title,
      status: m.status,
      duration: m.duration,
      dateRangeStart: m.dateRangeStart.toISOString(),
      dateRangeEnd: m.dateRangeEnd.toISOString(),
      organizer: m.organizer,
      inviteeCount: m._count.invitees,
      confirmedStart: m.confirmedStart?.toISOString() ?? null,
      createdAt: m.createdAt.toISOString()
    }))
  }
})

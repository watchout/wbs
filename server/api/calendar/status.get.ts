/**
 * GET /api/calendar/status
 * Get current calendar connection status
 */
import { requireAuth } from '~/server/utils/authMiddleware'
import { prisma } from '~/server/utils/prisma'

interface ConnectionStatus {
  id: string
  provider: string
  status: string
  lastSyncedAt: string | null
  syncRangeStart: number
  syncRangeEnd: number
}

interface StatusResponse {
  connected: boolean
  connection: ConnectionStatus | null
}

export default defineEventHandler(async (event): Promise<StatusResponse> => {
  // 1. Require authentication
  const auth = await requireAuth(event)

  // 2. Get user's calendar connection
  const connection = await prisma.userCalendarConnection.findFirst({
    where: {
      userId: auth.userId,
      organizationId: auth.organizationId,
      provider: 'google'
    },
    select: {
      id: true,
      provider: true,
      status: true,
      lastSyncedAt: true,
      syncRangeStart: true,
      syncRangeEnd: true
    }
  })

  if (!connection) {
    return {
      connected: false,
      connection: null
    }
  }

  return {
    connected: true,
    connection: {
      id: connection.id,
      provider: connection.provider,
      status: connection.status,
      lastSyncedAt: connection.lastSyncedAt?.toISOString() || null,
      syncRangeStart: connection.syncRangeStart,
      syncRangeEnd: connection.syncRangeEnd
    }
  }
})

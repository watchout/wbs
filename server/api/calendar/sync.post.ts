/**
 * POST /api/calendar/sync
 * Manual synchronization with Google Calendar
 */
import { createLogger } from '~/server/utils/logger'
import { requireAuth } from '~/server/utils/authMiddleware'
import { prisma } from '~/server/utils/prisma'
import { syncCalendar } from '~/server/utils/calendarSync'

const log = createLogger('calendar-sync-api')

interface SyncRequest {
  direction?: 'import' | 'export' | 'both'
}

interface SyncResponse {
  success: boolean
  imported: number
  exported: number
  errors?: string[]
}

export default defineEventHandler(async (event): Promise<SyncResponse> => {
  // 1. Require authentication
  const auth = await requireAuth(event)

  // 2. Read request body
  const body = await readBody<SyncRequest>(event)
  const direction = body?.direction || 'both'

  // 3. Validate direction
  if (!['import', 'export', 'both'].includes(direction)) {
    throw createError({
      statusCode: 400,
      statusMessage: '無効な同期方向です。import, export, both のいずれかを指定してください'
    })
  }

  // 4. Get user's calendar connection
  const connection = await prisma.userCalendarConnection.findFirst({
    where: {
      userId: auth.userId,
      organizationId: auth.organizationId,
      provider: 'google',
      status: { not: 'disconnected' }
    }
  })

  if (!connection) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Googleカレンダーが連携されていません'
    })
  }

  // 5. Perform sync
  try {
    const result = await syncCalendar(connection, direction)

    // 6. Log the sync
    await prisma.auditLog.create({
      data: {
        organizationId: auth.organizationId,
        userId: auth.userId,
        action: 'CALENDAR_SYNCED',
        targetId: connection.id,
        meta: {
          direction,
          imported: result.imported,
          exported: result.exported,
          errors: result.errors.length
        }
      }
    })

    return {
      success: result.errors.length === 0,
      imported: result.imported,
      exported: result.exported,
      errors: result.errors.length > 0 ? result.errors : undefined
    }
  } catch (err) {
    log.error('Calendar sync failed', { error: err instanceof Error ? err : new Error(String(err)) })

    throw createError({
      statusCode: 500,
      statusMessage: 'カレンダー同期に失敗しました。しばらく後にお試しください'
    })
  }
})

/**
 * GET /api/calendar/google/connect
 * Start OAuth flow for Google Calendar integration
 */
import { requireAuth } from '~/server/utils/authMiddleware'
import { generateAuthUrl } from '~/server/utils/googleCalendar'
import { prisma } from '~/server/utils/prisma'

interface ConnectResponse {
  redirectUrl: string
}

export default defineEventHandler(async (event): Promise<ConnectResponse> => {
  // 1. Require authentication
  const auth = await requireAuth(event)

  // 2. Check if user already has a connection
  const existingConnection = await prisma.userCalendarConnection.findFirst({
    where: {
      userId: auth.userId,
      organizationId: auth.organizationId,
      provider: 'google'
    }
  })

  if (existingConnection && existingConnection.status === 'active') {
    throw createError({
      statusCode: 400,
      statusMessage: '既にGoogleカレンダーと連携済みです'
    })
  }

  // 3. Generate state for CSRF protection
  // State includes: sessionId, organizationId, userId (base64 encoded JSON)
  const stateData = {
    sessionId: getCookie(event, 'session_id'),
    organizationId: auth.organizationId,
    userId: auth.userId,
    timestamp: Date.now()
  }
  const state = Buffer.from(JSON.stringify(stateData)).toString('base64url')

  // 4. Generate OAuth URL
  const redirectUrl = generateAuthUrl(state)

  return { redirectUrl }
})

/**
 * GET /api/calendar/google/callback
 * OAuth callback handler for Google Calendar
 */
import { exchangeCodeForTokens } from '~/server/utils/googleCalendar'
import { encrypt } from '~/server/utils/encryption'
import { prisma } from '~/server/utils/prisma'
import { getSession } from '~/server/utils/session'

interface StateData {
  sessionId: string
  organizationId: string
  userId: string
  timestamp: number
}

export default defineEventHandler(async (event) => {
  // 1. Get query parameters
  const query = getQuery(event)
  const code = query.code as string | undefined
  const state = query.state as string | undefined
  const error = query.error as string | undefined

  // 2. Handle OAuth errors
  if (error) {
    console.error('[Calendar OAuth] Error:', error)
    return sendRedirect(event, '/settings/calendar?error=auth_failed')
  }

  if (!code || !state) {
    return sendRedirect(event, '/settings/calendar?error=invalid_request')
  }

  // 3. Validate state parameter
  let stateData: StateData
  try {
    const decoded = Buffer.from(state, 'base64url').toString('utf-8')
    stateData = JSON.parse(decoded)
  } catch {
    return sendRedirect(event, '/settings/calendar?error=invalid_state')
  }

  // 4. Verify session matches
  const currentSessionId = getCookie(event, 'session_id')
  if (!currentSessionId || currentSessionId !== stateData.sessionId) {
    return sendRedirect(event, '/settings/calendar?error=session_mismatch')
  }

  // 5. Verify session is still valid
  const session = getSession(currentSessionId)
  if (!session) {
    return sendRedirect(event, '/login?redirect=/settings/calendar')
  }

  // 6. Verify state timestamp (max 10 minutes old)
  const maxAge = 10 * 60 * 1000 // 10 minutes
  if (Date.now() - stateData.timestamp > maxAge) {
    return sendRedirect(event, '/settings/calendar?error=expired')
  }

  try {
    // 7. Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // 8. Encrypt tokens before storage
    const encryptedAccessToken = encrypt(tokens.accessToken)
    const encryptedRefreshToken = encrypt(tokens.refreshToken)

    // 9. Generate webhook token for verification
    const webhookToken = crypto.randomUUID()

    // 10. Create or update calendar connection
    await prisma.userCalendarConnection.upsert({
      where: {
        userId_provider: {
          userId: stateData.userId,
          provider: 'google'
        }
      },
      create: {
        userId: stateData.userId,
        organizationId: stateData.organizationId,
        provider: 'google',
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        calendarId: 'primary',
        webhookToken,
        status: 'active'
      },
      update: {
        organizationId: stateData.organizationId,
        accessToken: encryptedAccessToken,
        refreshToken: encryptedRefreshToken,
        tokenExpiresAt: tokens.expiresAt,
        webhookToken,
        status: 'active',
        lastSyncedAt: null
      }
    })

    // 11. Log the connection event
    await prisma.auditLog.create({
      data: {
        organizationId: stateData.organizationId,
        userId: stateData.userId,
        action: 'CALENDAR_CONNECTED',
        targetId: stateData.userId,
        meta: { provider: 'google' }
      }
    })

    // 12. Redirect to settings page with success
    return sendRedirect(event, '/settings/calendar?success=connected')
  } catch (err) {
    console.error('[Calendar OAuth] Token exchange failed:', err)
    return sendRedirect(event, '/settings/calendar?error=token_failed')
  }
})

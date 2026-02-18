/**
 * GET /api/calendar/google/callback
 * OAuth callback handler for Google Calendar
 */
import { exchangeCodeForTokens, getCalendarClient, setupWebhook } from '~/server/utils/googleCalendar'
import { encrypt } from '~/server/utils/encryption'
import { prisma } from '~/server/utils/prisma'
import { getSession } from '~/server/utils/session'
import { syncCalendar } from '~/server/utils/calendarSync'
import { createLogger } from '~/server/utils/logger'

const log = createLogger('calendar-oauth')

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
    log.error('OAuth error', { error: new Error(String(error)) })
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

    // 12. Initial sync — fetch the saved connection and import events
    const savedConnection = await prisma.userCalendarConnection.findUnique({
      where: {
        userId_provider: {
          userId: stateData.userId,
          provider: 'google'
        }
      }
    })

    if (savedConnection) {
      // 12a. Initial sync — import events from Google Calendar
      try {
        const syncResult = await syncCalendar(savedConnection, 'import')
        log.info('Initial sync completed', { imported: syncResult.imported, errors: syncResult.errors.length })
      } catch (syncErr) {
        // 初期同期の失敗は接続成功を妨げない（次回手動同期で対応可能）
        log.error('Initial sync failed', { error: syncErr instanceof Error ? syncErr : new Error(String(syncErr)) })
      }

      // 12b. Setup webhook for real-time sync (production only — localhost cannot receive webhooks)
      const appBaseUrl = process.env.APP_BASE_URL
      if (appBaseUrl && !appBaseUrl.includes('localhost')) {
        try {
          const calendar = await getCalendarClient(savedConnection.id)
          const webhookUrl = `${appBaseUrl}/api/calendar/webhook`
          const webhook = await setupWebhook(
            calendar,
            savedConnection.calendarId,
            webhookUrl,
            savedConnection.webhookToken || webhookToken
          )

          await prisma.userCalendarConnection.update({
            where: { id: savedConnection.id },
            data: {
              webhookChannelId: webhook.channelId,
              webhookExpiration: webhook.expiration
            }
          })

          log.info('Webhook registered', { channelId: webhook.channelId, expires: webhook.expiration.toISOString() })
        } catch (webhookErr) {
          // Webhook登録の失敗は接続成功を妨げない（手動同期で対応可能）
          log.error('Webhook setup failed', { error: webhookErr instanceof Error ? webhookErr : new Error(String(webhookErr)) })
        }
      }
    }

    // 13. Redirect to settings page with success
    return sendRedirect(event, '/settings/calendar?success=connected')
  } catch (err) {
    log.error('Token exchange failed', { error: err instanceof Error ? err : new Error(String(err)) })
    return sendRedirect(event, '/settings/calendar?error=token_failed')
  }
})

/**
 * DELETE /api/calendar/connection
 * Disconnect Google Calendar integration
 */
import { requireAuth } from '~/server/utils/authMiddleware'
import { prisma } from '~/server/utils/prisma'
import { decrypt } from '~/server/utils/encryption'
import { revokeToken, getCalendarClient, stopWebhook } from '~/server/utils/googleCalendar'

interface DisconnectResponse {
  success: boolean
}

export default defineEventHandler(async (event): Promise<DisconnectResponse> => {
  // 1. Require authentication
  const auth = await requireAuth(event)

  // 2. Find user's calendar connection
  const connection = await prisma.userCalendarConnection.findFirst({
    where: {
      userId: auth.userId,
      organizationId: auth.organizationId,
      provider: 'google'
    }
  })

  if (!connection) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Googleカレンダーが連携されていません'
    })
  }

  try {
    // 3. Stop webhook if active
    if (connection.webhookChannelId) {
      try {
        const calendar = await getCalendarClient(connection.id)
        // Note: We need resourceId to stop the webhook, but we don't store it
        // For now, just mark it as expired and Google will clean up
        console.log(`[Calendar Disconnect] Webhook channel ${connection.webhookChannelId} will expire`)
      } catch (err) {
        console.warn('[Calendar Disconnect] Failed to stop webhook:', err)
        // Continue with disconnection even if webhook stop fails
      }
    }

    // 4. Revoke OAuth token
    try {
      const accessToken = decrypt(connection.accessToken)
      await revokeToken(accessToken)
    } catch (err) {
      console.warn('[Calendar Disconnect] Failed to revoke token:', err)
      // Continue with disconnection even if revoke fails
    }

    // 5. Delete the connection (physical delete for security)
    await prisma.userCalendarConnection.delete({
      where: { id: connection.id }
    })

    // 6. Log the disconnection
    await prisma.auditLog.create({
      data: {
        organizationId: auth.organizationId,
        userId: auth.userId,
        action: 'CALENDAR_DISCONNECTED',
        targetId: auth.userId,
        meta: { provider: 'google' }
      }
    })

    return { success: true }
  } catch (err) {
    console.error('[Calendar Disconnect] Failed:', err)
    throw createError({
      statusCode: 500,
      statusMessage: 'カレンダー連携の解除に失敗しました'
    })
  }
})

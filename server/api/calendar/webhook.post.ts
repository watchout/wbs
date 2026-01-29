/**
 * POST /api/calendar/webhook
 * Receive Google Calendar push notifications (webhooks)
 *
 * NOTE: This endpoint does NOT use requireAuth() because it's called by Google.
 * Authentication is done via X-Goog-Channel-ID and X-Goog-Channel-Token headers.
 */
import { prisma } from '~/server/utils/prisma'
import { syncCalendar } from '~/server/utils/calendarSync'

export default defineEventHandler(async (event) => {
  // 1. Get Google webhook headers
  const channelId = getHeader(event, 'X-Goog-Channel-ID')
  const channelToken = getHeader(event, 'X-Goog-Channel-Token')
  const resourceState = getHeader(event, 'X-Goog-Resource-State')

  // 2. Validate required headers
  if (!channelId) {
    console.warn('[Calendar Webhook] Missing X-Goog-Channel-ID')
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing channel ID'
    })
  }

  // 3. Handle sync notification (skip validation for "sync" state - initial setup)
  if (resourceState === 'sync') {
    // This is the initial verification request from Google
    // Just return 200 OK
    return { success: true, message: 'sync acknowledged' }
  }

  // 4. Find connection by webhook channel ID
  const connection = await prisma.userCalendarConnection.findFirst({
    where: {
      webhookChannelId: channelId
    }
  })

  if (!connection) {
    console.warn(`[Calendar Webhook] Unknown channel ID: ${channelId}`)
    throw createError({
      statusCode: 404,
      statusMessage: 'Channel not found'
    })
  }

  // 5. Verify channel token
  if (connection.webhookToken && connection.webhookToken !== channelToken) {
    console.warn(`[Calendar Webhook] Token mismatch for channel ${channelId}`)
    throw createError({
      statusCode: 403,
      statusMessage: 'Invalid channel token'
    })
  }

  // 6. Check if connection is active
  if (connection.status === 'disconnected') {
    console.warn(`[Calendar Webhook] Connection disconnected for channel ${channelId}`)
    return { success: false, message: 'Connection disconnected' }
  }

  // 7. Handle different resource states
  if (resourceState === 'exists' || resourceState === 'update') {
    // Calendar has been updated - trigger import sync
    try {
      console.log(`[Calendar Webhook] Syncing for user ${connection.userId}`)

      // Only import (don't export during webhook to avoid loops)
      const result = await syncCalendar(connection, 'import')

      console.log(
        `[Calendar Webhook] Sync completed: imported=${result.imported}, errors=${result.errors.length}`
      )

      return {
        success: true,
        imported: result.imported,
        errors: result.errors.length
      }
    } catch (err) {
      console.error('[Calendar Webhook] Sync failed:', err)
      return { success: false, error: 'Sync failed' }
    }
  }

  // 8. Handle channel expiration or other states
  if (resourceState === 'not_exists') {
    // Resource was deleted or channel expired
    console.log(`[Calendar Webhook] Channel ${channelId} resource no longer exists`)

    await prisma.userCalendarConnection.update({
      where: { id: connection.id },
      data: {
        webhookChannelId: null,
        webhookExpiration: null,
        status: 'error'
      }
    })

    return { success: true, message: 'Channel cleared' }
  }

  // Default response for unknown states
  return { success: true }
})

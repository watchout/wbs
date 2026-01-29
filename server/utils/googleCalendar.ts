/**
 * Google Calendar API utility
 * Handles OAuth flow and calendar operations
 */
import { google, calendar_v3 } from 'googleapis'
import { encrypt, decrypt } from './encryption'
import { prisma } from './prisma'

// OAuth2 configuration
const SCOPES = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/calendar.events'
]

/**
 * Get OAuth2 client configuration
 */
function getOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri = process.env.GOOGLE_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error('Google OAuth environment variables not configured')
  }

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

/**
 * Generate OAuth authorization URL
 * @param state - State parameter for CSRF protection (should include session info)
 * @returns Authorization URL to redirect user to
 */
export function generateAuthUrl(state: string): string {
  const oauth2Client = getOAuth2Client()

  return oauth2Client.generateAuthUrl({
    access_type: 'offline', // Get refresh token
    scope: SCOPES,
    state,
    prompt: 'consent' // Force consent to get refresh token
  })
}

/**
 * Exchange authorization code for tokens
 * @param code - Authorization code from OAuth callback
 * @returns Token response
 */
export async function exchangeCodeForTokens(code: string) {
  const oauth2Client = getOAuth2Client()

  const { tokens } = await oauth2Client.getToken(code)

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Failed to obtain tokens from Google')
  }

  return {
    accessToken: tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt: tokens.expiry_date
      ? new Date(tokens.expiry_date)
      : new Date(Date.now() + 3600 * 1000) // Default 1 hour
  }
}

/**
 * Refresh access token using refresh token
 * @param refreshToken - Encrypted refresh token from database
 * @returns New access token and expiry
 */
export async function refreshAccessToken(encryptedRefreshToken: string) {
  const oauth2Client = getOAuth2Client()

  const refreshToken = decrypt(encryptedRefreshToken)
  oauth2Client.setCredentials({ refresh_token: refreshToken })

  const { credentials } = await oauth2Client.refreshAccessToken()

  if (!credentials.access_token) {
    throw new Error('Failed to refresh access token')
  }

  return {
    accessToken: credentials.access_token,
    expiresAt: credentials.expiry_date
      ? new Date(credentials.expiry_date)
      : new Date(Date.now() + 3600 * 1000)
  }
}

/**
 * Get authenticated Calendar API client
 * @param connectionId - UserCalendarConnection ID
 * @returns Calendar API client
 */
export async function getCalendarClient(connectionId: string): Promise<calendar_v3.Calendar> {
  const connection = await prisma.userCalendarConnection.findUnique({
    where: { id: connectionId }
  })

  if (!connection) {
    throw new Error('Calendar connection not found')
  }

  // Check if token needs refresh
  const now = new Date()
  let accessToken = decrypt(connection.accessToken)

  if (connection.tokenExpiresAt <= now) {
    // Refresh the token
    const refreshed = await refreshAccessToken(connection.refreshToken)
    accessToken = refreshed.accessToken

    // Update stored tokens
    await prisma.userCalendarConnection.update({
      where: { id: connectionId },
      data: {
        accessToken: encrypt(refreshed.accessToken),
        tokenExpiresAt: refreshed.expiresAt
      }
    })
  }

  const oauth2Client = getOAuth2Client()
  oauth2Client.setCredentials({ access_token: accessToken })

  return google.calendar({ version: 'v3', auth: oauth2Client })
}

/**
 * Fetch events from Google Calendar
 * @param calendar - Calendar API client
 * @param calendarId - Calendar ID (usually 'primary')
 * @param timeMin - Start of time range
 * @param timeMax - End of time range
 * @returns List of calendar events
 */
export async function fetchEvents(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  timeMin: Date,
  timeMax: Date
): Promise<calendar_v3.Schema$Event[]> {
  const response = await calendar.events.list({
    calendarId,
    timeMin: timeMin.toISOString(),
    timeMax: timeMax.toISOString(),
    singleEvents: true,
    orderBy: 'startTime'
  })

  return response.data.items || []
}

/**
 * Create an event in Google Calendar
 * @param calendar - Calendar API client
 * @param calendarId - Calendar ID
 * @param event - Event data
 * @returns Created event
 */
export async function createEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  event: {
    summary: string
    description?: string
    start: Date
    end: Date
  }
): Promise<calendar_v3.Schema$Event> {
  const response = await calendar.events.insert({
    calendarId,
    requestBody: {
      summary: event.summary,
      description: event.description,
      start: {
        dateTime: event.start.toISOString(),
        timeZone: 'Asia/Tokyo'
      },
      end: {
        dateTime: event.end.toISOString(),
        timeZone: 'Asia/Tokyo'
      }
    }
  })

  return response.data
}

/**
 * Update an event in Google Calendar
 * @param calendar - Calendar API client
 * @param calendarId - Calendar ID
 * @param eventId - Google event ID
 * @param event - Updated event data
 * @returns Updated event
 */
export async function updateEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  eventId: string,
  event: {
    summary?: string
    description?: string
    start?: Date
    end?: Date
  }
): Promise<calendar_v3.Schema$Event> {
  const requestBody: calendar_v3.Schema$Event = {}

  if (event.summary !== undefined) {
    requestBody.summary = event.summary
  }
  if (event.description !== undefined) {
    requestBody.description = event.description
  }
  if (event.start !== undefined) {
    requestBody.start = {
      dateTime: event.start.toISOString(),
      timeZone: 'Asia/Tokyo'
    }
  }
  if (event.end !== undefined) {
    requestBody.end = {
      dateTime: event.end.toISOString(),
      timeZone: 'Asia/Tokyo'
    }
  }

  const response = await calendar.events.patch({
    calendarId,
    eventId,
    requestBody
  })

  return response.data
}

/**
 * Delete an event from Google Calendar
 * @param calendar - Calendar API client
 * @param calendarId - Calendar ID
 * @param eventId - Google event ID
 */
export async function deleteEvent(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  eventId: string
): Promise<void> {
  await calendar.events.delete({
    calendarId,
    eventId
  })
}

/**
 * Set up a webhook for calendar changes
 * @param calendar - Calendar API client
 * @param calendarId - Calendar ID
 * @param webhookUrl - URL to receive notifications
 * @param channelToken - Token for verification
 * @returns Channel info including ID and expiration
 */
export async function setupWebhook(
  calendar: calendar_v3.Calendar,
  calendarId: string,
  webhookUrl: string,
  channelToken: string
): Promise<{
  channelId: string
  expiration: Date
}> {
  const channelId = crypto.randomUUID()

  // Webhook expires in 7 days (Google's default max is ~2 weeks)
  const expiration = new Date()
  expiration.setDate(expiration.getDate() + 7)

  const response = await calendar.events.watch({
    calendarId,
    requestBody: {
      id: channelId,
      type: 'web_hook',
      address: webhookUrl,
      token: channelToken,
      expiration: expiration.getTime().toString()
    }
  })

  return {
    channelId: response.data.id || channelId,
    expiration: response.data.expiration
      ? new Date(parseInt(response.data.expiration))
      : expiration
  }
}

/**
 * Stop a webhook channel
 * @param calendar - Calendar API client
 * @param channelId - Channel ID to stop
 * @param resourceId - Resource ID from watch response
 */
export async function stopWebhook(
  calendar: calendar_v3.Calendar,
  channelId: string,
  resourceId: string
): Promise<void> {
  await calendar.channels.stop({
    requestBody: {
      id: channelId,
      resourceId
    }
  })
}

/**
 * Revoke OAuth tokens
 * @param accessToken - Access token to revoke (decrypted)
 */
export async function revokeToken(accessToken: string): Promise<void> {
  const oauth2Client = getOAuth2Client()
  await oauth2Client.revokeToken(accessToken)
}

/**
 * Calculate sync date range based on connection settings
 * @param syncRangeStart - Days in the past (negative number)
 * @param syncRangeEnd - Days in the future (positive number)
 * @returns Start and end dates for sync
 */
export function calculateSyncRange(
  syncRangeStart: number,
  syncRangeEnd: number
): { timeMin: Date; timeMax: Date } {
  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const timeMin = new Date(now)
  timeMin.setDate(timeMin.getDate() + syncRangeStart)

  const timeMax = new Date(now)
  timeMax.setDate(timeMax.getDate() + syncRangeEnd)
  timeMax.setHours(23, 59, 59, 999)

  return { timeMin, timeMax }
}

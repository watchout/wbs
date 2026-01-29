import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest'
import handler from './webhook.post'
import { createTestContext, cleanupTestData, cleanupSession } from '~/tests/helpers'
import { prisma } from '~/server/utils/prisma'

// Mock calendarSync module
vi.mock('~/server/utils/calendarSync', () => ({
  syncCalendar: vi.fn().mockResolvedValue({
    imported: 2,
    exported: 0,
    errors: []
  })
}))

import { syncCalendar } from '~/server/utils/calendarSync'

function createMockEvent(options: {
  headers?: Record<string, string>
}) {
  const { headers = {} } = options

  return {
    node: {
      req: {
        headers: {
          'content-type': 'application/json',
          ...headers
        },
        url: '/api/calendar/webhook'
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn()
      }
    },
    _headers: headers
  } as any
}

// Mock getHeader globally
vi.stubGlobal('getHeader', (event: any, name: string) => {
  return event._headers?.[name.toLowerCase()]
})

describe('POST /api/calendar/webhook', () => {
  let ctxA: Awaited<ReturnType<typeof createTestContext>>
  let ctxB: Awaited<ReturnType<typeof createTestContext>>
  let connectionA: any

  beforeAll(async () => {
    ctxA = await createTestContext('cal-webhook-a')
    ctxB = await createTestContext('cal-webhook-b')
  })

  afterAll(async () => {
    cleanupSession(ctxA.sessionId)
    cleanupSession(ctxB.sessionId)
    await prisma.userCalendarConnection.deleteMany({
      where: { organizationId: { in: [ctxA.org.id, ctxB.org.id] } }
    })
    await cleanupTestData(ctxA.org.id)
    await cleanupTestData(ctxB.org.id)
  })

  beforeEach(async () => {
    vi.clearAllMocks()
    await prisma.userCalendarConnection.deleteMany({
      where: { organizationId: { in: [ctxA.org.id, ctxB.org.id] } }
    })

    // Create connection with webhook channel
    connectionA = await prisma.userCalendarConnection.create({
      data: {
        userId: ctxA.user.id,
        organizationId: ctxA.org.id,
        provider: 'google',
        accessToken: 'encrypted-access',
        refreshToken: 'encrypted-refresh',
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        webhookChannelId: 'channel-123',
        webhookToken: 'token-abc',
        webhookExpiration: new Date(Date.now() + 7 * 24 * 3600 * 1000),
        status: 'active'
      }
    })
  })

  describe('正常系', () => {
    it('should handle sync resource state (initial setup)', async () => {
      const event = createMockEvent({
        headers: {
          'x-goog-channel-id': 'channel-123',
          'x-goog-resource-state': 'sync'
        }
      })

      const response = await handler(event)

      expect(response.success).toBe(true)
      expect(response.message).toBe('sync acknowledged')
      // syncCalendar should NOT be called for 'sync' state
      expect(syncCalendar).not.toHaveBeenCalled()
    })

    it('should trigger import sync on exists state', async () => {
      const event = createMockEvent({
        headers: {
          'x-goog-channel-id': 'channel-123',
          'x-goog-channel-token': 'token-abc',
          'x-goog-resource-state': 'exists'
        }
      })

      const response = await handler(event)

      expect(response.success).toBe(true)
      expect(response.imported).toBe(2)
      expect(syncCalendar).toHaveBeenCalledWith(
        expect.objectContaining({ id: connectionA.id }),
        'import' // Only import during webhook
      )
    })

    it('should trigger import sync on update state', async () => {
      const event = createMockEvent({
        headers: {
          'x-goog-channel-id': 'channel-123',
          'x-goog-channel-token': 'token-abc',
          'x-goog-resource-state': 'update'
        }
      })

      const response = await handler(event)

      expect(response.success).toBe(true)
      expect(syncCalendar).toHaveBeenCalledWith(expect.anything(), 'import')
    })

    it('should clear webhook channel on not_exists state', async () => {
      const event = createMockEvent({
        headers: {
          'x-goog-channel-id': 'channel-123',
          'x-goog-channel-token': 'token-abc',
          'x-goog-resource-state': 'not_exists'
        }
      })

      const response = await handler(event)

      expect(response.success).toBe(true)
      expect(response.message).toBe('Channel cleared')

      // Check connection was updated
      const updated = await prisma.userCalendarConnection.findUnique({
        where: { id: connectionA.id }
      })
      expect(updated?.webhookChannelId).toBeNull()
      expect(updated?.status).toBe('error')
    })
  })

  describe('認証（チャンネル検証）', () => {
    it('should return 400 when channel ID is missing', async () => {
      const event = createMockEvent({
        headers: {
          'x-goog-resource-state': 'exists'
        }
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400
      })
    })

    it('should return 404 for unknown channel ID', async () => {
      const event = createMockEvent({
        headers: {
          'x-goog-channel-id': 'unknown-channel',
          'x-goog-resource-state': 'exists'
        }
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 404
      })
    })

    it('should return 403 for invalid token', async () => {
      const event = createMockEvent({
        headers: {
          'x-goog-channel-id': 'channel-123',
          'x-goog-channel-token': 'wrong-token',
          'x-goog-resource-state': 'exists'
        }
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 403
      })
    })
  })

  describe('エラーハンドリング', () => {
    it('should handle sync failure gracefully', async () => {
      vi.mocked(syncCalendar).mockRejectedValueOnce(new Error('API Error'))

      const event = createMockEvent({
        headers: {
          'x-goog-channel-id': 'channel-123',
          'x-goog-channel-token': 'token-abc',
          'x-goog-resource-state': 'exists'
        }
      })

      const response = await handler(event)

      expect(response.success).toBe(false)
      expect(response.error).toBe('Sync failed')
    })

    it('should not sync disconnected connections', async () => {
      // Update connection to disconnected
      await prisma.userCalendarConnection.update({
        where: { id: connectionA.id },
        data: { status: 'disconnected' }
      })

      const event = createMockEvent({
        headers: {
          'x-goog-channel-id': 'channel-123',
          'x-goog-channel-token': 'token-abc',
          'x-goog-resource-state': 'exists'
        }
      })

      const response = await handler(event)

      expect(response.success).toBe(false)
      expect(response.message).toBe('Connection disconnected')
      expect(syncCalendar).not.toHaveBeenCalled()
    })
  })

  describe('マルチテナント境界（最重要）', () => {
    it('should only sync the connection that matches channel ID', async () => {
      // Create connection for orgB with different channel
      await prisma.userCalendarConnection.create({
        data: {
          userId: ctxB.user.id,
          organizationId: ctxB.org.id,
          provider: 'google',
          accessToken: 'encrypted-access-b',
          refreshToken: 'encrypted-refresh-b',
          tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
          webhookChannelId: 'channel-456',
          webhookToken: 'token-xyz',
          status: 'active'
        }
      })

      // Webhook for channel-123 should only sync orgA's connection
      const event = createMockEvent({
        headers: {
          'x-goog-channel-id': 'channel-123',
          'x-goog-channel-token': 'token-abc',
          'x-goog-resource-state': 'exists'
        }
      })

      await handler(event)

      // Verify sync was called with orgA's connection
      expect(syncCalendar).toHaveBeenCalledTimes(1)
      expect(syncCalendar).toHaveBeenCalledWith(
        expect.objectContaining({
          organizationId: ctxA.org.id
        }),
        'import'
      )
    })

    it('should not allow cross-org channel access', async () => {
      // Create connection for orgB with a channel
      await prisma.userCalendarConnection.create({
        data: {
          userId: ctxB.user.id,
          organizationId: ctxB.org.id,
          provider: 'google',
          accessToken: 'encrypted-access-b',
          refreshToken: 'encrypted-refresh-b',
          tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
          webhookChannelId: 'channel-456',
          webhookToken: 'token-xyz',
          status: 'active'
        }
      })

      // Try to access orgB's channel with orgA's token (should fail)
      const event = createMockEvent({
        headers: {
          'x-goog-channel-id': 'channel-456',
          'x-goog-channel-token': 'token-abc', // OrgA's token
          'x-goog-resource-state': 'exists'
        }
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 403
      })
    })
  })
})

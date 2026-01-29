import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest'
import handler from './sync.post'
import { createTestContext, cleanupTestData, cleanupSession } from '~/tests/helpers'
import { prisma } from '~/server/utils/prisma'

// Mock calendarSync module
vi.mock('~/server/utils/calendarSync', () => ({
  syncCalendar: vi.fn().mockResolvedValue({
    imported: 5,
    exported: 3,
    errors: []
  })
}))

import { syncCalendar } from '~/server/utils/calendarSync'

function createMockEvent(options: {
  sessionId?: string
  body?: Record<string, unknown>
}) {
  const { sessionId, body = {} } = options

  return {
    node: {
      req: {
        headers: {
          'content-type': 'application/json',
          cookie: sessionId ? `session_id=${sessionId}` : ''
        },
        url: '/api/calendar/sync'
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn()
      }
    },
    _body: body,
    _cookies: sessionId ? { session_id: sessionId } : {}
  } as any
}

describe('POST /api/calendar/sync', () => {
  let ctxA: Awaited<ReturnType<typeof createTestContext>>
  let ctxB: Awaited<ReturnType<typeof createTestContext>>

  beforeAll(async () => {
    ctxA = await createTestContext('cal-sync-a')
    ctxB = await createTestContext('cal-sync-b')
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
  })

  async function createConnection(userId: string, organizationId: string) {
    return prisma.userCalendarConnection.create({
      data: {
        userId,
        organizationId,
        provider: 'google',
        accessToken: 'encrypted-access',
        refreshToken: 'encrypted-refresh',
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        status: 'active'
      }
    })
  }

  describe('正常系', () => {
    it('should sync calendar with default direction (both)', async () => {
      await createConnection(ctxA.user.id, ctxA.org.id)

      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        body: {}
      })

      const response = await handler(event)

      expect(response.success).toBe(true)
      expect(response.imported).toBe(5)
      expect(response.exported).toBe(3)
      expect(syncCalendar).toHaveBeenCalledWith(
        expect.objectContaining({ userId: ctxA.user.id }),
        'both'
      )
    })

    it('should sync with import direction only', async () => {
      await createConnection(ctxA.user.id, ctxA.org.id)
      vi.mocked(syncCalendar).mockResolvedValueOnce({
        imported: 10,
        exported: 0,
        errors: []
      })

      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        body: { direction: 'import' }
      })

      const response = await handler(event)

      expect(response.imported).toBe(10)
      expect(response.exported).toBe(0)
      expect(syncCalendar).toHaveBeenCalledWith(expect.anything(), 'import')
    })

    it('should sync with export direction only', async () => {
      await createConnection(ctxA.user.id, ctxA.org.id)
      vi.mocked(syncCalendar).mockResolvedValueOnce({
        imported: 0,
        exported: 7,
        errors: []
      })

      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        body: { direction: 'export' }
      })

      const response = await handler(event)

      expect(response.imported).toBe(0)
      expect(response.exported).toBe(7)
      expect(syncCalendar).toHaveBeenCalledWith(expect.anything(), 'export')
    })

    it('should return errors when sync has partial failures', async () => {
      await createConnection(ctxA.user.id, ctxA.org.id)
      vi.mocked(syncCalendar).mockResolvedValueOnce({
        imported: 3,
        exported: 1,
        errors: ['Failed to import event X']
      })

      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        body: {}
      })

      const response = await handler(event)

      expect(response.success).toBe(false)
      expect(response.imported).toBe(3)
      expect(response.errors).toHaveLength(1)
    })
  })

  describe('認証', () => {
    it('should return 401 when not authenticated', async () => {
      const event = createMockEvent({})

      await expect(handler(event)).rejects.toThrow()
    })
  })

  describe('バリデーション', () => {
    it('should return 404 when not connected', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        body: {}
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 404
      })
    })

    it('should return 400 for invalid direction', async () => {
      await createConnection(ctxA.user.id, ctxA.org.id)

      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        body: { direction: 'invalid' }
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400
      })
    })
  })

  describe('マルチテナント境界（最重要）', () => {
    it('should only sync own calendar connection', async () => {
      // Create connections for both users
      await createConnection(ctxA.user.id, ctxA.org.id)
      await createConnection(ctxB.user.id, ctxB.org.id)

      const eventA = createMockEvent({
        sessionId: ctxA.sessionId,
        body: {}
      })

      await handler(eventA)

      // Verify sync was called with orgA's connection
      expect(syncCalendar).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: ctxA.user.id,
          organizationId: ctxA.org.id
        }),
        'both'
      )

      // Verify orgB's connection was NOT used
      const calls = vi.mocked(syncCalendar).mock.calls
      const connectionUsed = calls[0][0]
      expect(connectionUsed.organizationId).toBe(ctxA.org.id)
      expect(connectionUsed.organizationId).not.toBe(ctxB.org.id)
    })

    it('should not access other org connections', async () => {
      // Only create connection for orgB
      await createConnection(ctxB.user.id, ctxB.org.id)

      // User A tries to sync (but has no connection)
      const eventA = createMockEvent({
        sessionId: ctxA.sessionId,
        body: {}
      })

      // Should fail because orgA has no connection
      await expect(handler(eventA)).rejects.toMatchObject({
        statusCode: 404
      })
    })
  })
})

import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest'
import handler from './connection.delete'
import { createTestContext, cleanupTestData, cleanupSession } from '~/tests/helpers'
import { prisma } from '~/server/utils/prisma'

// Mock googleCalendar module
vi.mock('~/server/utils/googleCalendar', () => ({
  getCalendarClient: vi.fn().mockResolvedValue({}),
  revokeToken: vi.fn().mockResolvedValue(undefined),
  stopWebhook: vi.fn().mockResolvedValue(undefined)
}))

// Mock encryption module
vi.mock('~/server/utils/encryption', () => ({
  decrypt: vi.fn((text: string) => text.replace('encrypted:', ''))
}))

import { revokeToken } from '~/server/utils/googleCalendar'

function createMockEvent(options: { sessionId?: string }) {
  const { sessionId } = options

  return {
    node: {
      req: {
        headers: {
          'content-type': 'application/json',
          cookie: sessionId ? `session_id=${sessionId}` : ''
        },
        url: '/api/calendar/connection',
        method: 'DELETE'
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn()
      }
    },
    _cookies: sessionId ? { session_id: sessionId } : {}
  } as any
}

describe('DELETE /api/calendar/connection', () => {
  let ctxA: Awaited<ReturnType<typeof createTestContext>>
  let ctxB: Awaited<ReturnType<typeof createTestContext>>

  beforeAll(async () => {
    ctxA = await createTestContext('cal-disconnect-a')
    ctxB = await createTestContext('cal-disconnect-b')
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
        accessToken: 'encrypted:access-token',
        refreshToken: 'encrypted:refresh-token',
        tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
        status: 'active'
      }
    })
  }

  describe('正常系', () => {
    it('should delete calendar connection', async () => {
      const connection = await createConnection(ctxA.user.id, ctxA.org.id)

      const event = createMockEvent({ sessionId: ctxA.sessionId })

      const response = await handler(event)

      expect(response.success).toBe(true)

      // Verify connection was deleted
      const deleted = await prisma.userCalendarConnection.findUnique({
        where: { id: connection.id }
      })
      expect(deleted).toBeNull()
    })

    it('should revoke OAuth token', async () => {
      await createConnection(ctxA.user.id, ctxA.org.id)

      const event = createMockEvent({ sessionId: ctxA.sessionId })

      await handler(event)

      expect(revokeToken).toHaveBeenCalledWith('access-token')
    })

    it('should create audit log on disconnect', async () => {
      await createConnection(ctxA.user.id, ctxA.org.id)

      const event = createMockEvent({ sessionId: ctxA.sessionId })

      await handler(event)

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          organizationId: ctxA.org.id,
          action: 'CALENDAR_DISCONNECTED'
        },
        orderBy: { createdAt: 'desc' }
      })

      expect(auditLog).not.toBeNull()
      expect(auditLog?.userId).toBe(ctxA.user.id)
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
      const event = createMockEvent({ sessionId: ctxA.sessionId })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 404
      })
    })
  })

  describe('マルチテナント境界（最重要）', () => {
    it('should only delete own organization connection', async () => {
      // Create connections for both orgs
      const connectionA = await createConnection(ctxA.user.id, ctxA.org.id)
      const connectionB = await createConnection(ctxB.user.id, ctxB.org.id)

      // User A disconnects
      const eventA = createMockEvent({ sessionId: ctxA.sessionId })
      await handler(eventA)

      // OrgA's connection should be deleted
      const deletedA = await prisma.userCalendarConnection.findUnique({
        where: { id: connectionA.id }
      })
      expect(deletedA).toBeNull()

      // OrgB's connection should still exist
      const existingB = await prisma.userCalendarConnection.findUnique({
        where: { id: connectionB.id }
      })
      expect(existingB).not.toBeNull()
    })

    it('should not delete other org connections even with matching userId', async () => {
      // This tests the case where a malicious user tries to access another org's connection

      // Create connection for orgB only
      const connectionB = await createConnection(ctxB.user.id, ctxB.org.id)

      // User A tries to disconnect (but has no connection in their org)
      const eventA = createMockEvent({ sessionId: ctxA.sessionId })

      // Should fail because orgA has no connection
      await expect(handler(eventA)).rejects.toMatchObject({
        statusCode: 404
      })

      // OrgB's connection should still exist
      const existingB = await prisma.userCalendarConnection.findUnique({
        where: { id: connectionB.id }
      })
      expect(existingB).not.toBeNull()
    })
  })
})

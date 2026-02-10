import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from 'vitest'
import handler from './callback.get'
import { createTestContext, cleanupTestData, cleanupSession } from '~/tests/helpers'
import { prisma } from '~/server/utils/prisma'

// Mock googleCalendar module
vi.mock('~/server/utils/googleCalendar', () => ({
  exchangeCodeForTokens: vi.fn().mockResolvedValue({
    accessToken: 'mock-access-token',
    refreshToken: 'mock-refresh-token',
    expiresAt: new Date(Date.now() + 3600 * 1000)
  }),
  getCalendarClient: vi.fn().mockResolvedValue({}),
  setupWebhook: vi.fn().mockResolvedValue({
    channelId: 'mock-channel-id',
    expiration: new Date(Date.now() + 7 * 24 * 3600 * 1000)
  })
}))

// Mock calendarSync module
vi.mock('~/server/utils/calendarSync', () => ({
  syncCalendar: vi.fn().mockResolvedValue({
    imported: 0,
    exported: 0,
    errors: []
  })
}))

// Mock encryption module
vi.mock('~/server/utils/encryption', () => ({
  encrypt: vi.fn((text: string) => `encrypted:${text}`),
  decrypt: vi.fn((text: string) => text.replace('encrypted:', ''))
}))

let redirectUrl: string | null = null

function createMockEvent(options: {
  sessionId?: string
  query?: Record<string, string>
}) {
  const { sessionId, query = {} } = options
  redirectUrl = null

  return {
    node: {
      req: {
        headers: {
          'content-type': 'application/json',
          cookie: sessionId ? `session_id=${sessionId}` : ''
        },
        url: '/api/calendar/google/callback'
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn(),
        writeHead: vi.fn(),
        end: vi.fn()
      }
    },
    _query: query,
    _cookies: sessionId ? { session_id: sessionId } : {},
    _redirect: (url: string) => {
      redirectUrl = url
    }
  } as any
}

// Mock sendRedirect
vi.stubGlobal('sendRedirect', (event: any, url: string) => {
  event._redirect(url)
  return Promise.resolve()
})

describe('GET /api/calendar/google/callback', () => {
  let ctxA: Awaited<ReturnType<typeof createTestContext>>
  let ctxB: Awaited<ReturnType<typeof createTestContext>>

  beforeAll(async () => {
    ctxA = await createTestContext('cal-callback-a')
    ctxB = await createTestContext('cal-callback-b')
  })

  afterAll(async () => {
    cleanupSession(ctxA.sessionId)
    cleanupSession(ctxB.sessionId)
    await prisma.userCalendarConnection.deleteMany({
      where: {
        organizationId: { in: [ctxA.org.id, ctxB.org.id] }
      }
    })
    await cleanupTestData(ctxA.org.id)
    await cleanupTestData(ctxB.org.id)
  })

  beforeEach(async () => {
    // Clean up connections before each test
    await prisma.userCalendarConnection.deleteMany({
      where: {
        organizationId: { in: [ctxA.org.id, ctxB.org.id] }
      }
    })
  })

  function createValidState(sessionId: string, organizationId: string, userId: string) {
    const stateData = {
      sessionId,
      organizationId,
      userId,
      timestamp: Date.now()
    }
    return Buffer.from(JSON.stringify(stateData)).toString('base64url')
  }

  describe('正常系', () => {
    it('should create connection and redirect on success', async () => {
      const state = createValidState(ctxA.sessionId, ctxA.org.id, ctxA.user.id)
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { code: 'valid-auth-code', state }
      })

      await handler(event)

      // Should redirect to success
      expect(redirectUrl).toBe('/settings/calendar?success=connected')

      // Should create connection
      const connection = await prisma.userCalendarConnection.findFirst({
        where: {
          userId: ctxA.user.id,
          organizationId: ctxA.org.id
        }
      })
      expect(connection).not.toBeNull()
      expect(connection?.provider).toBe('google')
      expect(connection?.status).toBe('active')
      expect(connection?.accessToken).toContain('encrypted:')
      expect(connection?.refreshToken).toContain('encrypted:')
    })

    it('should create audit log on successful connection', async () => {
      const state = createValidState(ctxA.sessionId, ctxA.org.id, ctxA.user.id)
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { code: 'valid-auth-code', state }
      })

      await handler(event)

      const auditLog = await prisma.auditLog.findFirst({
        where: {
          organizationId: ctxA.org.id,
          action: 'CALENDAR_CONNECTED'
        },
        orderBy: { createdAt: 'desc' }
      })

      expect(auditLog).not.toBeNull()
      expect(auditLog?.userId).toBe(ctxA.user.id)
    })
  })

  describe('エラーハンドリング', () => {
    it('should redirect with error when OAuth fails', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { error: 'access_denied' }
      })

      await handler(event)

      expect(redirectUrl).toBe('/settings/calendar?error=auth_failed')
    })

    it('should redirect with error when code is missing', async () => {
      const state = createValidState(ctxA.sessionId, ctxA.org.id, ctxA.user.id)
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { state }
      })

      await handler(event)

      expect(redirectUrl).toBe('/settings/calendar?error=invalid_request')
    })

    it('should redirect with error when state is invalid', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { code: 'valid-code', state: 'invalid-base64' }
      })

      await handler(event)

      expect(redirectUrl).toBe('/settings/calendar?error=invalid_state')
    })

    it('should redirect with error when session does not match', async () => {
      // State has different sessionId
      const state = createValidState('different-session', ctxA.org.id, ctxA.user.id)
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { code: 'valid-code', state }
      })

      await handler(event)

      expect(redirectUrl).toBe('/settings/calendar?error=session_mismatch')
    })

    it('should redirect with error when state is expired', async () => {
      // State with old timestamp
      const stateData = {
        sessionId: ctxA.sessionId,
        organizationId: ctxA.org.id,
        userId: ctxA.user.id,
        timestamp: Date.now() - 15 * 60 * 1000 // 15 minutes ago
      }
      const state = Buffer.from(JSON.stringify(stateData)).toString('base64url')

      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { code: 'valid-code', state }
      })

      await handler(event)

      expect(redirectUrl).toBe('/settings/calendar?error=expired')
    })
  })

  describe('マルチテナント境界（最重要）', () => {
    it('should create connection with correct organizationId from state', async () => {
      const stateA = createValidState(ctxA.sessionId, ctxA.org.id, ctxA.user.id)
      const eventA = createMockEvent({
        sessionId: ctxA.sessionId,
        query: { code: 'code-a', state: stateA }
      })

      await handler(eventA)

      const connectionA = await prisma.userCalendarConnection.findFirst({
        where: { userId: ctxA.user.id }
      })

      // Connection should have orgA's organizationId
      expect(connectionA?.organizationId).toBe(ctxA.org.id)
      expect(connectionA?.organizationId).not.toBe(ctxB.org.id)
    })

    it('should not allow state tampering to access different org', async () => {
      // Attacker tries to use their session but with victim's organizationId
      // This should fail because sessionId in state won't match
      const tamperedState = createValidState(
        ctxB.sessionId, // Attacker's session
        ctxA.org.id, // Victim's org
        ctxA.user.id // Victim's user
      )

      const event = createMockEvent({
        sessionId: ctxA.sessionId, // Different session
        query: { code: 'valid-code', state: tamperedState }
      })

      await handler(event)

      // Should fail due to session mismatch
      expect(redirectUrl).toBe('/settings/calendar?error=session_mismatch')
    })
  })
})

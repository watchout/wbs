import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import handler from './connect.get'
import { createTestContext, cleanupTestData, cleanupSession } from '~/tests/helpers'
import { prisma } from '~/server/utils/prisma'

// Mock googleCalendar module
vi.mock('~/server/utils/googleCalendar', () => ({
  generateAuthUrl: vi.fn((state: string) => `https://accounts.google.com/oauth?state=${state}`)
}))

function createMockEvent(options: {
  sessionId?: string
  query?: Record<string, string>
}) {
  const { sessionId, query = {} } = options

  return {
    node: {
      req: {
        headers: {
          'content-type': 'application/json',
          cookie: sessionId ? `session_id=${sessionId}` : ''
        },
        url: '/api/calendar/google/connect'
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn()
      }
    },
    _query: query,
    _cookies: sessionId ? { session_id: sessionId } : {}
  } as any
}

describe('GET /api/calendar/google/connect', () => {
  let ctxA: Awaited<ReturnType<typeof createTestContext>>
  let ctxB: Awaited<ReturnType<typeof createTestContext>>

  beforeAll(async () => {
    ctxA = await createTestContext('cal-connect-a')
    ctxB = await createTestContext('cal-connect-b')
  })

  afterAll(async () => {
    cleanupSession(ctxA.sessionId)
    cleanupSession(ctxB.sessionId)
    await cleanupTestData(ctxA.org.id)
    await cleanupTestData(ctxB.org.id)
  })

  describe('正常系', () => {
    it('should return redirect URL for authenticated user', async () => {
      const event = createMockEvent({ sessionId: ctxA.sessionId })

      const response = await handler(event)

      expect(response).toHaveProperty('redirectUrl')
      expect(response.redirectUrl).toContain('https://accounts.google.com/oauth')
      expect(response.redirectUrl).toContain('state=')
    })

    it('should include state with session info', async () => {
      const event = createMockEvent({ sessionId: ctxA.sessionId })

      const response = await handler(event)

      // Extract state from URL
      const url = new URL(response.redirectUrl)
      const state = url.searchParams.get('state')
      expect(state).toBeTruthy()

      // Decode state
      const decoded = JSON.parse(Buffer.from(state!, 'base64url').toString())
      expect(decoded).toHaveProperty('sessionId', ctxA.sessionId)
      expect(decoded).toHaveProperty('organizationId', ctxA.org.id)
      expect(decoded).toHaveProperty('userId', ctxA.user.id)
      expect(decoded).toHaveProperty('timestamp')
    })
  })

  describe('認証', () => {
    it('should return 401 when not authenticated', async () => {
      const event = createMockEvent({})

      await expect(handler(event)).rejects.toThrow()
    })
  })

  describe('バリデーション', () => {
    it('should return 400 when already connected', async () => {
      // Create existing connection
      await prisma.userCalendarConnection.create({
        data: {
          userId: ctxB.user.id,
          organizationId: ctxB.org.id,
          provider: 'google',
          accessToken: 'encrypted-token',
          refreshToken: 'encrypted-refresh',
          tokenExpiresAt: new Date(Date.now() + 3600 * 1000),
          status: 'active'
        }
      })

      const event = createMockEvent({ sessionId: ctxB.sessionId })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400
      })

      // Cleanup
      await prisma.userCalendarConnection.deleteMany({
        where: { userId: ctxB.user.id }
      })
    })
  })

  describe('マルチテナント境界（最重要）', () => {
    it('should generate state with correct organizationId', async () => {
      const eventA = createMockEvent({ sessionId: ctxA.sessionId })
      const eventB = createMockEvent({ sessionId: ctxB.sessionId })

      const responseA = await handler(eventA)
      const responseB = await handler(eventB)

      // Extract and decode states
      const urlA = new URL(responseA.redirectUrl)
      const urlB = new URL(responseB.redirectUrl)
      const stateA = JSON.parse(
        Buffer.from(urlA.searchParams.get('state')!, 'base64url').toString()
      )
      const stateB = JSON.parse(
        Buffer.from(urlB.searchParams.get('state')!, 'base64url').toString()
      )

      // Each user should have their own organization in state
      expect(stateA.organizationId).toBe(ctxA.org.id)
      expect(stateB.organizationId).toBe(ctxB.org.id)
      expect(stateA.organizationId).not.toBe(stateB.organizationId)
    })
  })
})

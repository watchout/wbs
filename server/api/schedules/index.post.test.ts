/**
 * Schedule Create API Integration Tests
 *
 * POST /api/schedules
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestContext, cleanupTestData, cleanupSession } from '../../../tests/helpers'
import createHandler from './index.post'

function createMockEvent(options: {
  sessionId?: string
  body?: Record<string, unknown>
}) {
  const bodyData = options.body || {}

  return {
    node: {
      req: {
        headers: {
          cookie: options.sessionId ? `session_id=${options.sessionId}` : '',
          'content-type': 'application/json'
        },
        url: '/api/schedules'
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn()
      }
    },
    context: {},
    _cookies: options.sessionId ? { session_id: options.sessionId } : {},
    _body: bodyData,
    _requestBody: bodyData
  } as any
}

// readBody のモック
vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    readBody: (event: any) => Promise.resolve(event._body)
  }
})

describe('POST /api/schedules', () => {
  let ctxA: Awaited<ReturnType<typeof createTestContext>>
  let ctxB: Awaited<ReturnType<typeof createTestContext>>

  beforeAll(async () => {
    ctxA = await createTestContext('sched-post-a')
    ctxB = await createTestContext('sched-post-b')
  })

  afterAll(async () => {
    cleanupSession(ctxA.sessionId)
    cleanupSession(ctxB.sessionId)
    await cleanupTestData(ctxA.org.id)
    await cleanupTestData(ctxB.org.id)
  })

  describe('正常系', () => {
    it('should create a schedule with required fields', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        body: {
          title: 'テスト工事',
          start: '2026-02-01T09:00:00Z',
          end: '2026-02-01T18:00:00Z'
        }
      })

      const response = await createHandler(event)

      expect(response.success).toBe(true)
      expect(response.schedule.title).toBe('テスト工事')
      expect(response.schedule.id).toBeDefined()
    })

    it('should create a schedule with all optional fields', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        body: {
          title: 'フルオプション工事',
          description: '{"site":"現場A"}',
          start: '2026-02-02T09:00:00Z',
          end: '2026-02-02T18:00:00Z',
          authorId: ctxA.user.id,
          color: 'blue'
        }
      })

      const response = await createHandler(event)

      expect(response.success).toBe(true)
      expect(response.schedule.description).toBe('{"site":"現場A"}')
      expect(response.schedule.color).toBe('blue')
      expect(response.schedule.authorId).toBe(ctxA.user.id)
    })
  })

  describe('バリデーション', () => {
    it('should reject empty title', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        body: {
          title: '',
          start: '2026-02-01T09:00:00Z',
          end: '2026-02-01T18:00:00Z'
        }
      })

      await expect(createHandler(event)).rejects.toMatchObject({
        statusCode: 400
      })
    })

    it('should reject missing start/end', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        body: {
          title: 'テスト'
        }
      })

      await expect(createHandler(event)).rejects.toMatchObject({
        statusCode: 400
      })
    })

    it('should reject start >= end', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        body: {
          title: 'テスト',
          start: '2026-02-01T18:00:00Z',
          end: '2026-02-01T09:00:00Z'
        }
      })

      await expect(createHandler(event)).rejects.toMatchObject({
        statusCode: 400
      })
    })

    it('should reject authorId from different organization', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        body: {
          title: 'テスト',
          start: '2026-02-01T09:00:00Z',
          end: '2026-02-01T18:00:00Z',
          authorId: ctxB.user.id
        }
      })

      await expect(createHandler(event)).rejects.toMatchObject({
        statusCode: 400
      })
    })
  })

  describe('マルチテナント境界（最重要）', () => {
    it('should create schedule in authenticated organization only', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        body: {
          title: 'テナント確認',
          start: '2026-03-01T09:00:00Z',
          end: '2026-03-01T18:00:00Z'
        }
      })

      const response = await createHandler(event)

      // Prisma で直接確認
      const { prisma } = await import('~/server/utils/prisma')
      const created = await prisma.schedule.findUnique({
        where: { id: response.schedule.id }
      })

      expect(created?.organizationId).toBe(ctxA.org.id)
      expect(created?.organizationId).not.toBe(ctxB.org.id)
    })
  })
})

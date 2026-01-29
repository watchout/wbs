/**
 * Schedule Update API Integration Tests
 *
 * PATCH /api/schedules/:id
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestContext, cleanupTestData, createTestSchedule, cleanupSession } from '../../../tests/helpers'
import patchHandler from './[id].patch'

function createMockEvent(options: {
  sessionId?: string
  routeParams?: Record<string, string>
  body?: Record<string, unknown>
}) {
  return {
    node: {
      req: {
        headers: {
          cookie: options.sessionId ? `session_id=${options.sessionId}` : '',
          'content-type': 'application/json'
        },
        url: `/api/schedules/${options.routeParams?.id || ''}`
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn()
      }
    },
    context: {
      params: options.routeParams || {}
    },
    _cookies: options.sessionId ? { session_id: options.sessionId } : {},
    _body: options.body || {},
    _requestBody: options.body || {}
  } as any
}

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    readBody: (event: any) => Promise.resolve(event._body),
    getRouterParam: (event: any, name: string) => event.context?.params?.[name]
  }
})

describe('PATCH /api/schedules/:id', () => {
  let ctxA: Awaited<ReturnType<typeof createTestContext>>
  let ctxB: Awaited<ReturnType<typeof createTestContext>>
  let scheduleA: Awaited<ReturnType<typeof createTestSchedule>>
  let scheduleB: Awaited<ReturnType<typeof createTestSchedule>>

  beforeAll(async () => {
    ctxA = await createTestContext('sched-patch-a')
    ctxB = await createTestContext('sched-patch-b')

    scheduleA = await createTestSchedule(ctxA.org.id, ctxA.user.id, {
      title: '更新テスト用'
    })
    scheduleB = await createTestSchedule(ctxB.org.id, ctxB.user.id, {
      title: '他組織スケジュール'
    })
  })

  afterAll(async () => {
    cleanupSession(ctxA.sessionId)
    cleanupSession(ctxB.sessionId)
    await cleanupTestData(ctxA.org.id)
    await cleanupTestData(ctxB.org.id)
  })

  describe('正常系', () => {
    it('should update schedule title', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        routeParams: { id: scheduleA.id },
        body: { title: '更新後タイトル' }
      })

      const response = await patchHandler(event)

      expect(response.success).toBe(true)
      expect(response.schedule.title).toBe('更新後タイトル')
    })

    it('should update partial fields only', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        routeParams: { id: scheduleA.id },
        body: { color: 'red' }
      })

      const response = await patchHandler(event)

      expect(response.success).toBe(true)
      expect(response.schedule.color).toBe('red')
      expect(response.schedule.title).toBe('更新後タイトル')
    })
  })

  describe('バリデーション', () => {
    it('should reject empty title', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        routeParams: { id: scheduleA.id },
        body: { title: '  ' }
      })

      await expect(patchHandler(event)).rejects.toMatchObject({
        statusCode: 400
      })
    })

    it('should reject start >= end', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        routeParams: { id: scheduleA.id },
        body: {
          start: '2026-03-01T18:00:00Z',
          end: '2026-03-01T09:00:00Z'
        }
      })

      await expect(patchHandler(event)).rejects.toMatchObject({
        statusCode: 400
      })
    })
  })

  describe('権限', () => {
    it('should allow owner to update', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        routeParams: { id: scheduleA.id },
        body: { color: 'green' }
      })

      const response = await patchHandler(event)
      expect(response.success).toBe(true)
    })
  })

  describe('マルチテナント境界（最重要）', () => {
    it('should not allow updating schedule from another organization', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        routeParams: { id: scheduleB.id },
        body: { title: '不正更新' }
      })

      await expect(patchHandler(event)).rejects.toMatchObject({
        statusCode: 404
      })
    })
  })
})

/**
 * User Update API Integration Tests
 *
 * PATCH /api/users/:id
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestContext, cleanupTestData, cleanupSession } from '../../../tests/helpers'
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
        url: `/api/users/${options.routeParams?.id || ''}`
      },
      res: { setHeader: vi.fn(), getHeader: vi.fn() }
    },
    context: { params: options.routeParams || {} },
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

describe('PATCH /api/users/:id', () => {
  let ctxA: Awaited<ReturnType<typeof createTestContext>>
  let ctxB: Awaited<ReturnType<typeof createTestContext>>

  beforeAll(async () => {
    ctxA = await createTestContext('users-patch-a')
    ctxB = await createTestContext('users-patch-b')
  })

  afterAll(async () => {
    cleanupSession(ctxA.sessionId)
    cleanupSession(ctxB.sessionId)
    await cleanupTestData(ctxA.org.id)
    await cleanupTestData(ctxB.org.id)
  })

  describe('正常系', () => {
    it('should update user name', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        routeParams: { id: ctxA.user.id },
        body: { name: '更新後の名前' }
      })

      const response = await patchHandler(event)

      expect(response.success).toBe(true)
      expect(response.user.name).toBe('更新後の名前')
    })
  })

  describe('マルチテナント境界（最重要）', () => {
    it('should not allow updating user from another organization', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        routeParams: { id: ctxB.user.id },
        body: { name: '不正更新' }
      })

      await expect(patchHandler(event)).rejects.toMatchObject({
        statusCode: 404
      })
    })
  })
})

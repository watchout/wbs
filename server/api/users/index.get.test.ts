/**
 * Users List API Integration Tests
 *
 * GET /api/users
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestContext, cleanupTestData, cleanupSession } from '../../../tests/helpers'
import getUsersHandler from './index.get'

function createMockEvent(options: { sessionId?: string }) {
  return {
    node: {
      req: {
        headers: {
          cookie: options.sessionId ? `session_id=${options.sessionId}` : ''
        },
        url: '/api/users'
      },
      res: { setHeader: vi.fn(), getHeader: vi.fn() }
    },
    context: {},
    _cookies: options.sessionId ? { session_id: options.sessionId } : {}
  } as any
}

describe('GET /api/users', () => {
  let ctxA: Awaited<ReturnType<typeof createTestContext>>
  let ctxB: Awaited<ReturnType<typeof createTestContext>>

  beforeAll(async () => {
    ctxA = await createTestContext('users-get-a')
    ctxB = await createTestContext('users-get-b')
  })

  afterAll(async () => {
    cleanupSession(ctxA.sessionId)
    cleanupSession(ctxB.sessionId)
    await cleanupTestData(ctxA.org.id)
    await cleanupTestData(ctxB.org.id)
  })

  describe('正常系', () => {
    it('should return users for authenticated organization', async () => {
      const event = createMockEvent({ sessionId: ctxA.sessionId })
      const response = await getUsersHandler(event)

      expect(response.success).toBe(true)
      expect(Array.isArray(response.users)).toBe(true)
      expect(response.users.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('マルチテナント境界（最重要）', () => {
    it('should not leak users from other organization', async () => {
      const eventA = createMockEvent({ sessionId: ctxA.sessionId })
      const responseA = await getUsersHandler(eventA)

      const eventB = createMockEvent({ sessionId: ctxB.sessionId })
      const responseB = await getUsersHandler(eventB)

      const idsA = responseA.users.map((u: any) => u.id)
      const idsB = responseB.users.map((u: any) => u.id)

      // 互いに含まれない
      expect(idsA).not.toContain(ctxB.user.id)
      expect(idsB).not.toContain(ctxA.user.id)
    })
  })

  describe('レスポンス形式', () => {
    it('should return user with correct properties', async () => {
      const event = createMockEvent({ sessionId: ctxA.sessionId })
      const response = await getUsersHandler(event)

      const user = response.users[0]
      expect(user).toHaveProperty('id')
      expect(user).toHaveProperty('email')
      expect(user).toHaveProperty('name')
      expect(user).toHaveProperty('role')
      expect(user).toHaveProperty('department')
      expect(user).toHaveProperty('createdAt')
    })
  })
})

/**
 * User Create API Integration Tests
 *
 * POST /api/users
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestContext, cleanupTestData, createTestDepartment, cleanupSession } from '../../../tests/helpers'
import { prisma } from '~/server/utils/prisma'
import createHandler from './index.post'

function createMockEvent(options: {
  sessionId?: string
  body?: Record<string, unknown>
}) {
  return {
    node: {
      req: {
        headers: {
          cookie: options.sessionId ? `session_id=${options.sessionId}` : '',
          'content-type': 'application/json'
        },
        url: '/api/users'
      },
      res: { setHeader: vi.fn(), getHeader: vi.fn() }
    },
    context: {},
    _cookies: options.sessionId ? { session_id: options.sessionId } : {},
    _body: options.body || {},
    _requestBody: options.body || {}
  } as any
}

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    readBody: (event: any) => Promise.resolve(event._body)
  }
})

describe('POST /api/users', () => {
  let ctxA: Awaited<ReturnType<typeof createTestContext>>
  let ctxB: Awaited<ReturnType<typeof createTestContext>>
  let deptA: Awaited<ReturnType<typeof createTestDepartment>>
  const createdUserIds: string[] = []

  beforeAll(async () => {
    ctxA = await createTestContext('users-post-a')
    ctxB = await createTestContext('users-post-b')
    deptA = await createTestDepartment(ctxA.org.id, 'Engineering')
  })

  afterAll(async () => {
    // 追加作成したユーザーを削除
    for (const id of createdUserIds) {
      await prisma.user.delete({ where: { id } }).catch(() => {})
    }
    cleanupSession(ctxA.sessionId)
    cleanupSession(ctxB.sessionId)
    await cleanupTestData(ctxA.org.id)
    await cleanupTestData(ctxB.org.id)
  })

  describe('正常系', () => {
    it('should create a user with required fields', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        body: {
          email: `new-user-${Date.now()}@example.com`,
          name: '新規ユーザー'
        }
      })

      const response = await createHandler(event)
      createdUserIds.push(response.user.id)

      expect(response.success).toBe(true)
      expect(response.user.email).toContain('new-user-')
      expect(response.user.role).toBe('MEMBER')
    })

    it('should create a user with department', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        body: {
          email: `dept-user-${Date.now()}@example.com`,
          name: '部署ユーザー',
          departmentId: deptA.id
        }
      })

      const response = await createHandler(event)
      createdUserIds.push(response.user.id)

      expect(response.success).toBe(true)
      expect(response.user.departmentId).toBe(deptA.id)
    })
  })

  describe('バリデーション', () => {
    it('should reject empty email', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        body: { email: '' }
      })

      await expect(createHandler(event)).rejects.toMatchObject({
        statusCode: 400
      })
    })

    it('should reject invalid email format', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        body: { email: 'not-an-email' }
      })

      await expect(createHandler(event)).rejects.toMatchObject({
        statusCode: 400
      })
    })

    it('should reject duplicate email', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        body: { email: ctxA.user.email }
      })

      await expect(createHandler(event)).rejects.toMatchObject({
        statusCode: 409
      })
    })
  })

  describe('マルチテナント境界（最重要）', () => {
    it('should create user in authenticated organization only', async () => {
      const email = `tenant-check-${Date.now()}@example.com`
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        body: { email }
      })

      const response = await createHandler(event)
      createdUserIds.push(response.user.id)

      const created = await prisma.user.findUnique({
        where: { id: response.user.id }
      })

      expect(created?.organizationId).toBe(ctxA.org.id)
      expect(created?.organizationId).not.toBe(ctxB.org.id)
    })
  })
})

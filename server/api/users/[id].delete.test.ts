/**
 * User Delete API Integration Tests
 *
 * DELETE /api/users/:id
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestContext, cleanupTestData, cleanupSession } from '../../../tests/helpers'
import { prisma } from '~/server/utils/prisma'
import deleteHandler from './[id].delete'

function createMockEvent(options: {
  sessionId?: string
  routeParams?: Record<string, string>
}) {
  return {
    node: {
      req: {
        headers: {
          cookie: options.sessionId ? `session_id=${options.sessionId}` : ''
        },
        url: `/api/users/${options.routeParams?.id || ''}`
      },
      res: { setHeader: vi.fn(), getHeader: vi.fn() }
    },
    context: { params: options.routeParams || {} },
    _cookies: options.sessionId ? { session_id: options.sessionId } : {}
  } as any
}

vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return {
    ...actual,
    getRouterParam: (event: any, name: string) => event.context?.params?.[name]
  }
})

describe('DELETE /api/users/:id', () => {
  let ctxA: Awaited<ReturnType<typeof createTestContext>>
  let ctxB: Awaited<ReturnType<typeof createTestContext>>

  beforeAll(async () => {
    ctxA = await createTestContext('users-del-a')
    ctxB = await createTestContext('users-del-b')
  })

  afterAll(async () => {
    cleanupSession(ctxA.sessionId)
    cleanupSession(ctxB.sessionId)
    await cleanupTestData(ctxA.org.id)
    await cleanupTestData(ctxB.org.id)
  })

  describe('正常系', () => {
    it('should delete a user', async () => {
      // 削除用ユーザーを作成
      const target = await prisma.user.create({
        data: {
          organizationId: ctxA.org.id,
          email: `delete-target-${Date.now()}@example.com`,
          name: '削除対象',
          role: 'MEMBER'
        }
      })

      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        routeParams: { id: target.id }
      })

      const response = await deleteHandler(event)

      expect(response.success).toBe(true)

      // ソフトデリート: deletedAt が設定されていることを確認
      const deleted = await prisma.user.findUnique({ where: { id: target.id } })
      expect(deleted).not.toBeNull()
      expect(deleted?.deletedAt).not.toBeNull()
    })
  })

  describe('エラー系', () => {
    it('should not allow deleting self', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        routeParams: { id: ctxA.user.id }
      })

      await expect(deleteHandler(event)).rejects.toMatchObject({
        statusCode: 400
      })
    })

    it('should return 404 for non-existent user', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        routeParams: { id: 'non-existent-id' }
      })

      await expect(deleteHandler(event)).rejects.toMatchObject({
        statusCode: 404
      })
    })
  })

  describe('マルチテナント境界（最重要）', () => {
    it('should not allow deleting user from another organization', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId,
        routeParams: { id: ctxB.user.id }
      })

      await expect(deleteHandler(event)).rejects.toMatchObject({
        statusCode: 404
      })
    })
  })
})

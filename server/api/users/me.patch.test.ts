/**
 * Profile Update API Integration Tests
 *
 * PATCH /api/users/me
 * プロフィール更新テスト
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestContext, cleanupTestData, cleanupSession } from '../../../tests/helpers'
import { prisma } from '~/server/utils/prisma'

// APIハンドラを直接インポート
import profileUpdateHandler from './me.patch'

// H3イベントのモック作成ヘルパー
function createMockEvent(
  body: Record<string, any>,
  sessionId?: string,
  options?: { organizationId?: string; userId?: string; role?: string }
) {
  return {
    node: {
      req: {
        headers: {
          'content-type': 'application/json',
          cookie: sessionId ? `session_id=${sessionId}` : ''
        },
        url: '/api/users/me',
        method: 'PATCH'
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn()
      }
    },
    context: {},
    _body: body,
    _organizationId: options?.organizationId,
    _userId: options?.userId,
    _role: options?.role
  } as any
}

// h3のモック
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: (event: any) => Promise.resolve(event._body),
    getCookie: (event: any, name: string) => {
      if (name === 'session_id') {
        const match = event.node.req.headers.cookie?.match(/session_id=([^;]+)/)
        return match ? match[1] : undefined
      }
      return undefined
    }
  }
})

describe('PATCH /api/users/me', () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>
  let ctx2: Awaited<ReturnType<typeof createTestContext>>

  beforeAll(async () => {
    // テスト用コンテキスト作成
    ctx = await createTestContext('profile-update-test')
    // マルチテナント境界テスト用の別組織
    ctx2 = await createTestContext('profile-update-test-2')
  })

  afterAll(async () => {
    cleanupSession(ctx.sessionId)
    cleanupSession(ctx2.sessionId)
    await cleanupTestData(ctx.org.id)
    await cleanupTestData(ctx2.org.id)
  })

  describe('認証', () => {
    it('should return 401 when not authenticated', async () => {
      const event = createMockEvent({ name: '新しい名前' })

      await expect(profileUpdateHandler(event)).rejects.toThrow()

      try {
        await profileUpdateHandler(event)
      } catch (error: any) {
        expect(error.statusCode).toBe(401)
      }
    })
  })

  describe('バリデーション', () => {
    it('should return 400 when name is empty string', async () => {
      const event = createMockEvent({ name: '' }, ctx.sessionId)

      await expect(profileUpdateHandler(event)).rejects.toThrow()

      try {
        await profileUpdateHandler(event)
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
      }
    })

    it('should return 400 when name is only whitespace', async () => {
      const event = createMockEvent({ name: '   ' }, ctx.sessionId)

      await expect(profileUpdateHandler(event)).rejects.toThrow()

      try {
        await profileUpdateHandler(event)
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
      }
    })

    it('should return 400 when name is too long (over 100 chars)', async () => {
      const event = createMockEvent({ name: 'a'.repeat(101) }, ctx.sessionId)

      await expect(profileUpdateHandler(event)).rejects.toThrow()

      try {
        await profileUpdateHandler(event)
      } catch (error: any) {
        expect(error.statusCode).toBe(400)
      }
    })
  })

  describe('正常系', () => {
    it('should update user name successfully', async () => {
      const newName = `Updated Name ${Date.now()}`
      const event = createMockEvent({ name: newName }, ctx.sessionId)

      const response = await profileUpdateHandler(event)

      expect(response.success).toBe(true)
      expect(response.user.name).toBe(newName)
      expect(response.user.id).toBe(ctx.user.id)

      // DBに反映されていることを確認
      const dbUser = await prisma.user.findUnique({ where: { id: ctx.user.id } })
      expect(dbUser?.name).toBe(newName)
    })

    it('should trim whitespace from name', async () => {
      const event = createMockEvent({ name: '  田中太郎  ' }, ctx.sessionId)

      const response = await profileUpdateHandler(event)

      expect(response.user.name).toBe('田中太郎')
    })

    it('should return user email in response', async () => {
      const event = createMockEvent({ name: 'Test' }, ctx.sessionId)

      const response = await profileUpdateHandler(event)

      expect(response.user.email).toBe(ctx.user.email)
    })
  })

  describe('マルチテナント境界', () => {
    it('should only update user within same organization', async () => {
      // ctx2のセッションを使用してリクエスト
      const newName = `Cross-Org Test ${Date.now()}`
      const event = createMockEvent({ name: newName }, ctx2.sessionId)

      const response = await profileUpdateHandler(event)

      // ctx2のユーザーが更新される
      expect(response.user.id).toBe(ctx2.user.id)

      // ctx1のユーザーは変更されていない
      const ctx1User = await prisma.user.findUnique({ where: { id: ctx.user.id } })
      expect(ctx1User?.name).not.toBe(newName)
    })
  })
})

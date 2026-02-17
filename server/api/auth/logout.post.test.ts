/**
 * Logout API Integration Tests
 *
 * POST /api/auth/logout
 * ログアウトフローテスト
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestContext, cleanupTestData, cleanupSession } from '../../../tests/helpers'
import { getSession, createSession } from '../../utils/session'

// APIハンドラを直接インポート
import logoutHandler from './logout.post'

// H3のモック
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    getCookie: (event: any, name: string) => {
      return event._cookies?.[name] ?? undefined
    },
    setCookie: (event: any, name: string, value: string, options?: any) => {
      if (!event._setCookies) event._setCookies = {}
      event._setCookies[name] = { value, options }
    }
  }
})

function createMockEvent(cookies: Record<string, string> = {}) {
  return {
    node: {
      req: {
        headers: { 'content-type': 'application/json' },
        url: '/api/auth/logout',
        method: 'POST'
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn()
      }
    },
    context: {},
    _cookies: cookies,
    _setCookies: {} as Record<string, { value: string; options?: any }>
  } as any
}

describe('POST /api/auth/logout', () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>

  beforeAll(async () => {
    ctx = await createTestContext('logout-test')
  })

  afterAll(async () => {
    cleanupSession(ctx.sessionId)
    await cleanupTestData(ctx.org.id)
  })

  describe('正常系', () => {
    it('should logout and delete session when valid session exists', async () => {
      // 新しいセッションを作成
      const sessionId = createSession({
        userId: ctx.user.id,
        organizationId: ctx.org.id,
        email: ctx.user.email,
        role: ctx.user.role
      })

      // セッションが存在することを確認
      expect(getSession(sessionId)).not.toBeNull()

      const event = createMockEvent({ session_id: sessionId })
      const result = await logoutHandler(event)

      expect(result.success).toBe(true)
      expect(result.message).toBe('ログアウトしました')

      // セッションが削除されていることを確認
      expect(getSession(sessionId)).toBeNull()

      // Cookieがクリアされていることを確認
      expect(event._setCookies.session_id).toBeDefined()
      expect(event._setCookies.session_id.value).toBe('')
      expect(event._setCookies.session_id.options?.maxAge).toBe(0)
    })

    it('should return success even without session cookie (idempotent)', async () => {
      const event = createMockEvent({})
      const result = await logoutHandler(event)

      expect(result.success).toBe(true)
      expect(result.message).toBe('ログアウトしました')
    })

    it('should return success for invalid/expired session (idempotent)', async () => {
      const event = createMockEvent({ session_id: 'non-existent-session-id' })
      const result = await logoutHandler(event)

      expect(result.success).toBe(true)
      expect(result.message).toBe('ログアウトしました')
    })
  })

  describe('Cookie設定', () => {
    it('should set httpOnly cookie with maxAge 0', async () => {
      const event = createMockEvent({ session_id: 'any-session' })
      await logoutHandler(event)

      const cookie = event._setCookies.session_id
      expect(cookie).toBeDefined()
      expect(cookie.options?.httpOnly).toBe(true)
      expect(cookie.options?.sameSite).toBe('lax')
      expect(cookie.options?.path).toBe('/')
      expect(cookie.options?.maxAge).toBe(0)
    })
  })
})

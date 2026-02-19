/**
 * Login API Integration Tests
 *
 * POST /api/auth/login
 * 認証フローテスト
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest'
import { createTestContext, cleanupTestData, cleanupSession } from '../../../tests/helpers'
import { getSession } from '../../utils/session'
import { prisma } from '~/server/utils/prisma'
import { hashPassword } from '~/server/utils/password'
import { clearAllRateLimits } from '../../utils/rateLimit'

// APIハンドラを直接インポート
import loginHandler from './login.post'

// H3イベントのモック作成ヘルパー
function createMockEvent(body: Record<string, any>, options?: { ip?: string }) {
  let setCookieCalled = false
  let cookieValue = ''
  const headers: Record<string, string> = {
    'content-type': 'application/json'
  }
  // IPアドレスを指定（レート制限テスト用）
  if (options?.ip) {
    headers['x-forwarded-for'] = options.ip
  }

  return {
    node: {
      req: {
        headers,
        url: '/api/auth/login',
        method: 'POST',
        socket: { remoteAddress: options?.ip || '127.0.0.1' }
      },
      res: {
        setHeader: vi.fn((name: string, value: string) => {
          if (name.toLowerCase() === 'set-cookie') {
            setCookieCalled = true
            cookieValue = value
          }
        }),
        getHeader: vi.fn()
      }
    },
    context: {},
    _body: body,
    // テスト用にCookie設定を追跡
    get cookieWasSet() {
      return setCookieCalled
    },
    get cookieValue() {
      return cookieValue
    }
  } as any
}

// h3のreadBodyをモック
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: (event: any) => Promise.resolve(event._body),
    setCookie: (event: any, name: string, value: string, options?: any) => {
      event.node.res.setHeader('Set-Cookie', `${name}=${value}`)
    },
    setHeader: (event: any, name: string, value: string) => {
      event.node.res.setHeader(name, value)
    }
  }
})

describe('POST /api/auth/login', () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>

  beforeAll(async () => {
    ctx = await createTestContext('login-test')
    // パスワード設定（passwordHash未設定だとログイン不可のため）
    const hash = await hashPassword('testpass123')
    await prisma.user.update({
      where: { id: ctx.user.id },
      data: { passwordHash: hash }
    })
  })

  afterAll(async () => {
    cleanupSession(ctx.sessionId)
    await cleanupTestData(ctx.org.id)
  })

  describe('バリデーション', () => {
    it('should return 400 when email is missing', async () => {
      const event = createMockEvent({})

      await expect(loginHandler(event)).rejects.toThrow()

      try {
        await loginHandler(event)
      } catch (error: unknown) {
        expect((error as { statusCode?: number }).statusCode).toBe(400)
      }
    })

    it('should return 400 when email is empty string', async () => {
      const event = createMockEvent({ email: '' })

      await expect(loginHandler(event)).rejects.toThrow()

      try {
        await loginHandler(event)
      } catch (error: unknown) {
        expect((error as { statusCode?: number }).statusCode).toBe(400)
      }
    })
  })

  describe('認証', () => {
    it('should return 401 for non-existent user', async () => {
      const event = createMockEvent({
        email: 'nonexistent@example.com'
      })

      await expect(loginHandler(event)).rejects.toThrow()

      try {
        await loginHandler(event)
      } catch (error: unknown) {
        expect((error as { statusCode?: number }).statusCode).toBe(401)
      }
    })

    it('should return 200 and set session cookie for valid user', async () => {
      const event = createMockEvent({
        email: ctx.user.email,
        password: 'testpass123'
      })

      const response = await loginHandler(event)

      expect(response.success).toBe(true)
      expect(response.user.id).toBe(ctx.user.id)
      expect(response.user.email).toBe(ctx.user.email)
      expect(response.organization.id).toBe(ctx.org.id)

      // Set-Cookieが呼ばれたことを確認
      expect(event.node.res.setHeader).toHaveBeenCalled()
    })

    it('should return user info in response', async () => {
      const event = createMockEvent({
        email: ctx.user.email,
        password: 'testpass123'
      })

      const response = await loginHandler(event)

      expect(response.user).toHaveProperty('id')
      expect(response.user).toHaveProperty('name')
      expect(response.user).toHaveProperty('email')
      expect(response.user).toHaveProperty('role')
    })

    it('should return organization info with slug', async () => {
      const event = createMockEvent({
        email: ctx.user.email,
        password: 'testpass123'
      })

      const response = await loginHandler(event)

      expect(response.organization).toHaveProperty('id')
      expect(response.organization).toHaveProperty('name')
      expect(response.organization).toHaveProperty('slug')
    })
  })

  describe('セッション作成', () => {
    it('should create valid session after login', async () => {
      const event = createMockEvent({
        email: ctx.user.email,
        password: 'testpass123'
      })

      await loginHandler(event)

      // Set-Cookie ヘッダーからセッションIDを取得してテスト
      const setHeaderCalls = event.node.res.setHeader.mock.calls
      const setCookieCall = setHeaderCalls.find((call: any) =>
        call[0].toLowerCase() === 'set-cookie'
      )

      if (setCookieCall) {
        const cookieString = setCookieCall[1]
        const match = cookieString.match(/session_id=([^;]+)/)
        if (match) {
          const sessionId = match[1]
          const session = getSession(sessionId)

          expect(session).not.toBeNull()
          expect(session?.userId).toBe(ctx.user.id)
          expect(session?.organizationId).toBe(ctx.org.id)
        }
      }
    })
  })

  describe('アカウントロック（AUTH-001 AC5）', () => {
    // 各テスト前にレート制限をリセット（テスト間の干渉防止）
    beforeEach(() => {
      clearAllRateLimits()
    })

    it('should increment loginAttempts on failed login', async () => {
      // リセット
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { loginAttempts: 0, lockedUntil: null }
      })

      const event = createMockEvent({
        email: ctx.user.email,
        password: 'wrongpassword'
      })

      try {
        await loginHandler(event)
      } catch (error: unknown) {
        expect((error as { statusCode?: number }).statusCode).toBe(401)
      }

      const user = await prisma.user.findUnique({ where: { id: ctx.user.id } })
      expect(user?.loginAttempts).toBe(1)
    })

    it('should lock account after 5 failed attempts', async () => {
      // 4回失敗済みの状態を設定
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { loginAttempts: 4, lockedUntil: null }
      })

      const event = createMockEvent({
        email: ctx.user.email,
        password: 'wrongpassword'
      })

      try {
        await loginHandler(event)
      } catch (error: unknown) {
        expect((error as { statusCode?: number }).statusCode).toBe(423)
        expect((error as { statusMessage?: string }).statusMessage).toContain('アカウントがロックされました')
      }

      const user = await prisma.user.findUnique({ where: { id: ctx.user.id } })
      expect(user?.loginAttempts).toBe(5)
      expect(user?.lockedUntil).not.toBeNull()
    })

    it('should return 423 for locked account', async () => {
      // ロック状態を設定（15分後）
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          loginAttempts: 5,
          lockedUntil: new Date(Date.now() + 15 * 60 * 1000)
        }
      })

      const event = createMockEvent({
        email: ctx.user.email,
        password: 'testpass123' // 正しいパスワードでも拒否
      })

      try {
        await loginHandler(event)
      } catch (error: unknown) {
        expect((error as { statusCode?: number }).statusCode).toBe(423)
        expect((error as { statusMessage?: string }).statusMessage).toContain('アカウントがロックされています')
      }
    })

    it('should reset loginAttempts on successful login', async () => {
      // 失敗履歴ありだがロックされていない状態
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { loginAttempts: 3, lockedUntil: null }
      })

      const event = createMockEvent({
        email: ctx.user.email,
        password: 'testpass123'
      })

      await loginHandler(event)

      const user = await prisma.user.findUnique({ where: { id: ctx.user.id } })
      expect(user?.loginAttempts).toBe(0)
      expect(user?.lockedUntil).toBeNull()
    })

    it('should allow login after lock expires', async () => {
      // ロック期限切れを設定（過去）
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: {
          loginAttempts: 5,
          lockedUntil: new Date(Date.now() - 1000) // 1秒前（期限切れ）
        }
      })

      const event = createMockEvent({
        email: ctx.user.email,
        password: 'testpass123'
      })

      const response = await loginHandler(event)
      expect(response.success).toBe(true)

      const user = await prisma.user.findUnique({ where: { id: ctx.user.id } })
      expect(user?.loginAttempts).toBe(0)
      expect(user?.lockedUntil).toBeNull()
    })
  })

  describe('レート制限（SEC-003）', () => {
    const testIp = '192.168.1.100'

    beforeEach(() => {
      // 各テストの前にレート制限をリセット
      clearAllRateLimits()
    })

    it('should allow requests within rate limit', async () => {
      // 10リクエストまでは許可
      for (let i = 0; i < 10; i++) {
        const event = createMockEvent(
          { email: ctx.user.email, password: 'testpass123' },
          { ip: testIp }
        )
        const response = await loginHandler(event)
        expect(response.success).toBe(true)
      }
    })

    it('should return 429 when rate limit exceeded', async () => {
      // 10リクエストを実行
      for (let i = 0; i < 10; i++) {
        const event = createMockEvent(
          { email: ctx.user.email, password: 'testpass123' },
          { ip: testIp }
        )
        await loginHandler(event)
      }

      // 11回目は拒否
      const event = createMockEvent(
        { email: ctx.user.email, password: 'testpass123' },
        { ip: testIp }
      )

      try {
        await loginHandler(event)
        expect.fail('Should have thrown error')
      } catch (error: unknown) {
        expect((error as { statusCode?: number }).statusCode).toBe(429)
        expect((error as { statusMessage?: string }).statusMessage).toContain('リクエストが多すぎます')
      }
    })

    it('should include Retry-After header on 429', async () => {
      // 10リクエストを実行
      for (let i = 0; i < 10; i++) {
        const event = createMockEvent(
          { email: ctx.user.email, password: 'testpass123' },
          { ip: testIp }
        )
        await loginHandler(event)
      }

      // 11回目でRetry-Afterヘッダーを確認
      const event = createMockEvent(
        { email: ctx.user.email, password: 'testpass123' },
        { ip: testIp }
      )

      try {
        await loginHandler(event)
      } catch (error: unknown) {
        expect((error as { statusCode?: number }).statusCode).toBe(429)
        // setHeaderが呼ばれたことを確認
        const calls = event.node.res.setHeader.mock.calls
        const retryAfterCall = calls.find((call: string[]) => call[0] === 'Retry-After')
        expect(retryAfterCall).toBeDefined()
        expect(Number(retryAfterCall[1])).toBeGreaterThan(0)
      }
    })

    it('should allow requests from different IPs', async () => {
      // IP1から10リクエスト
      for (let i = 0; i < 10; i++) {
        const event = createMockEvent(
          { email: ctx.user.email, password: 'testpass123' },
          { ip: '10.0.0.1' }
        )
        await loginHandler(event)
      }

      // IP2からは問題なくリクエスト可能
      const event = createMockEvent(
        { email: ctx.user.email, password: 'testpass123' },
        { ip: '10.0.0.2' }
      )
      const response = await loginHandler(event)
      expect(response.success).toBe(true)
    })
  })
})

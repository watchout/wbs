/**
 * OTP API Integration Tests
 *
 * テスト対象:
 * - POST /api/auth/otp/send
 * - POST /api/auth/otp/verify
 * - GET /api/auth/otp/status
 *
 * 課金操作 2FA のための OTP エンドポイント統合テスト
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// ================================================================
// モック定義（vi.hoisted で変数を事前に定義）
// ================================================================

const {
  mockAuth,
  mockCreateOtp,
  mockVerifyOtp,
  mockSendEmail,
  mockBuildOtpEmail,
  mockCheckRateLimit,
  mockGetClientIp,
  mockSetOtpVerified,
  mockIsOtpVerified,
} = vi.hoisted(() => ({
  mockAuth: vi.fn(),
  mockCreateOtp: vi.fn(),
  mockVerifyOtp: vi.fn(),
  mockSendEmail: vi.fn(),
  mockBuildOtpEmail: vi.fn(),
  mockCheckRateLimit: vi.fn(),
  mockGetClientIp: vi.fn(),
  mockSetOtpVerified: vi.fn(),
  mockIsOtpVerified: vi.fn(),
}))

// モック登録
vi.mock('~/server/utils/authMiddleware', () => ({
  requireAuth: mockAuth,
}))

vi.mock('~/server/utils/otp', () => ({
  createOtp: mockCreateOtp,
  verifyOtp: mockVerifyOtp,
  OTP_VERIFIED_DURATION_MS: 30 * 60 * 1000,
}))

vi.mock('~/server/utils/email', () => ({
  sendEmail: mockSendEmail,
  buildOtpEmail: mockBuildOtpEmail,
}))

vi.mock('~/server/utils/rateLimit', () => ({
  checkRateLimit: mockCheckRateLimit,
  getClientIp: mockGetClientIp,
}))

vi.mock('~/server/utils/session', () => ({
  setOtpVerified: mockSetOtpVerified,
  isOtpVerified: mockIsOtpVerified,
}))

vi.mock('~/server/utils/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  }),
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}))

// h3 モック
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: (event: { _body: unknown }) => Promise.resolve(event._body),
    getCookie: (event: { _cookies?: Record<string, string> }, name: string) => {
      return event._cookies?.[name] || undefined
    },
  }
})

// ================================================================
// ヘルパー
// ================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockEvent(overrides: {
  body?: Record<string, unknown>
  cookies?: Record<string, string>
}): any {
  return {
    node: {
      req: {
        headers: {},
        url: '/api/auth/otp/test',
        method: 'POST',
        socket: { remoteAddress: '127.0.0.1' },
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn(),
      },
    },
    context: {},
    _body: overrides.body,
    _cookies: overrides.cookies,
  }
}

const MOCK_AUTH_ADMIN = {
  userId: 'user-1',
  organizationId: 'org-1',
  email: 'admin@example.com',
  role: 'ADMIN' as const,
}

// ================================================================
// テスト
// ================================================================

describe('OTP API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(MOCK_AUTH_ADMIN)
    mockGetClientIp.mockReturnValue('127.0.0.1')
    mockCheckRateLimit.mockReturnValue({
      allowed: true,
      current: 1,
      remaining: 2,
      retryAfterSeconds: 0,
    })
  })

  // ----------------------------------------------------------
  // POST /api/auth/otp/send
  // ----------------------------------------------------------
  describe('POST /api/auth/otp/send', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: any

    beforeEach(async () => {
      const mod = await import('./send.post')
      handler = mod.default
    })

    it('未認証で 401 を返す', async () => {
      mockAuth.mockRejectedValue(
        Object.assign(new Error('Unauthorized'), { statusCode: 401 })
      )

      const event = createMockEvent({})
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 401,
      })
    })

    it('非 ADMIN で 403 を返す', async () => {
      mockAuth.mockResolvedValue({ ...MOCK_AUTH_ADMIN, role: 'MEMBER' })

      const event = createMockEvent({})
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 403,
      })
    })

    it('email 未設定で 401 を返す', async () => {
      mockAuth.mockResolvedValue({
        ...MOCK_AUTH_ADMIN,
        email: undefined,
      })

      const event = createMockEvent({})
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 401,
      })
    })

    it('レート制限超過で 429 を返す', async () => {
      mockCheckRateLimit.mockReturnValue({
        allowed: false,
        current: 4,
        remaining: 0,
        retryAfterSeconds: 120,
      })

      const event = createMockEvent({})
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 429,
      })
    })

    it('正常系: OTP 生成・メール送信成功', async () => {
      mockCreateOtp.mockResolvedValue('123456')
      mockBuildOtpEmail.mockReturnValue({
        subject: '【ミエルプラス】認証コード',
        html: '<p>123456</p>',
      })
      mockSendEmail.mockResolvedValue({ success: true })

      const event = createMockEvent({})
      const result = await handler(event)

      // requireAuth が呼ばれていること
      expect(mockAuth).toHaveBeenCalledWith(event)

      // OTP が生成されていること
      expect(mockCreateOtp).toHaveBeenCalledWith({
        userId: 'user-1',
        purpose: 'billing',
      })

      // メールテンプレートが構築されていること
      expect(mockBuildOtpEmail).toHaveBeenCalledWith({ code: '123456' })

      // メールが送信されていること
      expect(mockSendEmail).toHaveBeenCalledWith({
        to: 'admin@example.com',
        subject: '【ミエルプラス】認証コード',
        html: '<p>123456</p>',
      })

      // レスポンスが正しいこと
      expect(result).toEqual({
        success: true,
        message: '認証コードをメールに送信しました',
      })
    })

    it('レート制限チェックに正しい識別子を渡す', async () => {
      mockGetClientIp.mockReturnValue('192.168.1.100')
      mockCreateOtp.mockResolvedValue('654321')
      mockBuildOtpEmail.mockReturnValue({ subject: 'test', html: '<p>test</p>' })
      mockSendEmail.mockResolvedValue({ success: true })

      const event = createMockEvent({})
      await handler(event)

      expect(mockCheckRateLimit).toHaveBeenCalledWith(
        'otp:192.168.1.100',
        expect.objectContaining({
          maxRequests: 3,
          windowMs: 5 * 60 * 1000,
        })
      )
    })
  })

  // ----------------------------------------------------------
  // POST /api/auth/otp/verify
  // ----------------------------------------------------------
  describe('POST /api/auth/otp/verify', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: any

    beforeEach(async () => {
      const mod = await import('./verify.post')
      handler = mod.default
    })

    it('未認証で 401 を返す', async () => {
      mockAuth.mockRejectedValue(
        Object.assign(new Error('Unauthorized'), { statusCode: 401 })
      )

      const event = createMockEvent({ body: { code: '123456' } })
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 401,
      })
    })

    it('非 ADMIN で 403 を返す', async () => {
      mockAuth.mockResolvedValue({ ...MOCK_AUTH_ADMIN, role: 'MEMBER' })

      const event = createMockEvent({ body: { code: '123456' } })
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 403,
      })
    })

    it('code なしで 400 を返す', async () => {
      const event = createMockEvent({ body: {} })
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('不正な code 形式（6桁でない）で 400 を返す', async () => {
      // 5桁
      const event5 = createMockEvent({ body: { code: '12345' } })
      await expect(handler(event5)).rejects.toMatchObject({
        statusCode: 400,
      })

      // 7桁
      const event7 = createMockEvent({ body: { code: '1234567' } })
      await expect(handler(event7)).rejects.toMatchObject({
        statusCode: 400,
      })

      // 英字混在
      const eventAlpha = createMockEvent({ body: { code: '12ab56' } })
      await expect(handler(eventAlpha)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('無効な code で 401 を返す', async () => {
      mockVerifyOtp.mockResolvedValue(false)

      const event = createMockEvent({ body: { code: '000000' } })
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 401,
      })

      expect(mockVerifyOtp).toHaveBeenCalledWith({
        userId: 'user-1',
        purpose: 'billing',
        code: '000000',
      })
    })

    it('正常系: 検証成功、セッションにフラグ設定', async () => {
      mockVerifyOtp.mockResolvedValue(true)
      mockSetOtpVerified.mockReturnValue(true)

      const event = createMockEvent({
        body: { code: '123456' },
        cookies: { session_id: 'sess-abc-123' },
      })
      const result = await handler(event)

      // requireAuth が呼ばれていること
      expect(mockAuth).toHaveBeenCalledWith(event)

      // verifyOtp が正しいパラメータで呼ばれていること
      expect(mockVerifyOtp).toHaveBeenCalledWith({
        userId: 'user-1',
        purpose: 'billing',
        code: '123456',
      })

      // セッションに OTP 検証済みフラグが設定されていること
      expect(mockSetOtpVerified).toHaveBeenCalledWith(
        'sess-abc-123',
        30 * 60 * 1000 // OTP_VERIFIED_DURATION_MS
      )

      // レスポンスが正しいこと
      expect(result).toEqual({
        success: true,
        message: '認証に成功しました',
        verifiedUntil: expect.any(String),
      })
    })

    it('セッション ID がない場合でも検証自体は成功する', async () => {
      mockVerifyOtp.mockResolvedValue(true)

      const event = createMockEvent({
        body: { code: '123456' },
        // cookies なし → session_id = undefined
      })
      const result = await handler(event)

      // setOtpVerified は呼ばれない（sessionId が falsy）
      expect(mockSetOtpVerified).not.toHaveBeenCalled()

      // 検証自体は成功する
      expect(result.success).toBe(true)
    })
  })

  // ----------------------------------------------------------
  // GET /api/auth/otp/status
  // ----------------------------------------------------------
  describe('GET /api/auth/otp/status', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: any

    beforeEach(async () => {
      const mod = await import('./status.get')
      handler = mod.default
    })

    it('未認証で 401 を返す', async () => {
      mockAuth.mockRejectedValue(
        Object.assign(new Error('Unauthorized'), { statusCode: 401 })
      )

      const event = createMockEvent({})
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 401,
      })
    })

    it('セッションなし（cookie なし）で verified: false を返す', async () => {
      const event = createMockEvent({})
      // cookies が未定義 → getCookie は undefined を返す
      const result = await handler(event)

      expect(result).toEqual({ verified: false })
      // isOtpVerified は呼ばれない（sessionId が falsy）
      expect(mockIsOtpVerified).not.toHaveBeenCalled()
    })

    it('OTP 未検証の場合 verified: false を返す', async () => {
      mockIsOtpVerified.mockReturnValue(false)

      const event = createMockEvent({
        cookies: { session_id: 'sess-abc-123' },
      })
      const result = await handler(event)

      expect(mockIsOtpVerified).toHaveBeenCalledWith('sess-abc-123')
      expect(result).toEqual({ verified: false })
    })

    it('OTP 検証済みの場合 verified: true を返す', async () => {
      mockIsOtpVerified.mockReturnValue(true)

      const event = createMockEvent({
        cookies: { session_id: 'sess-abc-123' },
      })
      const result = await handler(event)

      expect(mockIsOtpVerified).toHaveBeenCalledWith('sess-abc-123')
      expect(result).toEqual({ verified: true })
    })

    it('requireAuth が必ず呼ばれること（認証チェック）', async () => {
      mockIsOtpVerified.mockReturnValue(false)

      const event = createMockEvent({
        cookies: { session_id: 'sess-xyz' },
      })
      await handler(event)

      expect(mockAuth).toHaveBeenCalledWith(event)
    })
  })
})

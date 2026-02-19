/**
 * Device Login API Integration Tests
 *
 * POST /api/auth/device-login
 * デバイス認証テスト
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestContext, cleanupTestData, createTestDevice, cleanupSession } from '../../../tests/helpers'
import { getSession } from '../../utils/session'

// APIハンドラを直接インポート
import deviceLoginHandler from './device-login.post'

// H3イベントのモック作成ヘルパー
function createMockEvent(body: Record<string, any>) {
  return {
    node: {
      req: {
        headers: {
          'content-type': 'application/json'
        },
        url: '/api/auth/device-login',
        method: 'POST'
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn()
      }
    },
    context: {},
    _body: body
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
    }
  }
})

describe('POST /api/auth/device-login', () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>
  let device: Awaited<ReturnType<typeof createTestDevice>>

  beforeAll(async () => {
    ctx = await createTestContext('device-login-test')
    device = await createTestDevice(ctx.org.id, {
      name: 'Test Kiosk',
      kioskSecret: 'test-kiosk-secret-12345'
    })
  })

  afterAll(async () => {
    cleanupSession(ctx.sessionId)
    await cleanupTestData(ctx.org.id)
  })

  describe('バリデーション', () => {
    it('should return 400 when kioskSecret is missing', async () => {
      const event = createMockEvent({})

      await expect(deviceLoginHandler(event)).rejects.toThrow()

      try {
        await deviceLoginHandler(event)
      } catch (error: unknown) {
        expect((error as { statusCode?: number }).statusCode).toBe(400)
      }
    })

    it('should return 400 when kioskSecret is empty', async () => {
      const event = createMockEvent({ kioskSecret: '' })

      await expect(deviceLoginHandler(event)).rejects.toThrow()

      try {
        await deviceLoginHandler(event)
      } catch (error: unknown) {
        expect((error as { statusCode?: number }).statusCode).toBe(400)
      }
    })
  })

  describe('認証', () => {
    it('should return 401 for invalid kioskSecret', async () => {
      const event = createMockEvent({
        kioskSecret: 'invalid-secret'
      })

      await expect(deviceLoginHandler(event)).rejects.toThrow()

      try {
        await deviceLoginHandler(event)
      } catch (error: unknown) {
        expect((error as { statusCode?: number }).statusCode).toBe(401)
      }
    })

    it('should return 200 for valid kioskSecret', async () => {
      const event = createMockEvent({
        kioskSecret: device.kioskSecret
      })

      const response = await deviceLoginHandler(event)

      expect(response.success).toBe(true)
      expect(response.device.id).toBe(device.id)
      expect(response.device.name).toBe(device.name)
      expect(response.organization.id).toBe(ctx.org.id)
    })

    it('should set session cookie on successful login', async () => {
      const event = createMockEvent({
        kioskSecret: device.kioskSecret
      })

      await deviceLoginHandler(event)

      expect(event.node.res.setHeader).toHaveBeenCalled()

      const setHeaderCalls = event.node.res.setHeader.mock.calls
      const setCookieCall = setHeaderCalls.find((call: any) =>
        call[0].toLowerCase() === 'set-cookie'
      )

      expect(setCookieCall).toBeDefined()
    })
  })

  describe('レスポンス形式', () => {
    it('should return device info', async () => {
      const event = createMockEvent({
        kioskSecret: device.kioskSecret
      })

      const response = await deviceLoginHandler(event)

      expect(response.device).toHaveProperty('id')
      expect(response.device).toHaveProperty('name')
    })

    it('should return organization info', async () => {
      const event = createMockEvent({
        kioskSecret: device.kioskSecret
      })

      const response = await deviceLoginHandler(event)

      expect(response.organization).toHaveProperty('id')
      expect(response.organization).toHaveProperty('name')
    })
  })

  describe('セッション作成', () => {
    it('should create device session with deviceId', async () => {
      const event = createMockEvent({
        kioskSecret: device.kioskSecret
      })

      await deviceLoginHandler(event)

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
          expect(session?.deviceId).toBe(device.id)
          expect(session?.organizationId).toBe(ctx.org.id)
        }
      }
    })
  })

  describe('マルチテナント境界', () => {
    it('should return correct organization for device', async () => {
      const event = createMockEvent({
        kioskSecret: device.kioskSecret
      })

      const response = await deviceLoginHandler(event)

      // デバイスが所属する組織のIDが返されること
      expect(response.organization.id).toBe(ctx.org.id)
    })
  })
})

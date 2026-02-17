/**
 * Me API Integration Tests
 *
 * GET /api/auth/me
 * 現在のユーザー情報取得テスト
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestContext, createTestDepartment, createTestDevice, cleanupTestData, cleanupSession } from '../../../tests/helpers'
import { createSession, deleteSession } from '../../utils/session'
import { prisma } from '~/server/utils/prisma'

// APIハンドラを直接インポート
import meHandler from './me.get'

// H3のモック
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    getCookie: (event: any, name: string) => {
      return event._cookies?.[name] ?? undefined
    }
  }
})

function createMockEvent(cookies: Record<string, string> = {}) {
  return {
    node: {
      req: {
        headers: { 'content-type': 'application/json' },
        url: '/api/auth/me',
        method: 'GET'
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn()
      }
    },
    context: {},
    _cookies: cookies
  } as any
}

describe('GET /api/auth/me', () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>

  beforeAll(async () => {
    ctx = await createTestContext('me-test')
  })

  afterAll(async () => {
    cleanupSession(ctx.sessionId)
    await cleanupTestData(ctx.org.id)
  })

  describe('正常系（通常ユーザー）', () => {
    it('should return authenticated user info with valid session', async () => {
      const event = createMockEvent({ session_id: ctx.sessionId })
      const result = await meHandler(event)

      expect(result.success).toBe(true)
      expect(result.isAuthenticated).toBe(true)
      expect(result.isDevice).toBe(false)
      expect(result.user).toBeDefined()
      expect(result.user!.id).toBe(ctx.user.id)
      expect(result.user!.email).toBe(ctx.user.email)
      expect(result.user!.role).toBe('ADMIN')
      expect(result.organization).toBeDefined()
      expect(result.organization!.id).toBe(ctx.org.id)
    })

    it('should include department when user belongs to one', async () => {
      const dept = await createTestDepartment(ctx.org.id, 'テスト部門-me')
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { departmentId: dept.id }
      })

      const event = createMockEvent({ session_id: ctx.sessionId })
      const result = await meHandler(event)

      expect(result.user!.department).toBeDefined()
      expect(result.user!.department!.name).toBe('テスト部門-me')

      // クリーンアップ: 部門割当を解除
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { departmentId: null }
      })
    })

    it('should return null department when user has no department', async () => {
      const event = createMockEvent({ session_id: ctx.sessionId })
      const result = await meHandler(event)

      expect(result.user!.department).toBeNull()
    })
  })

  describe('正常系（デバイスセッション）', () => {
    it('should return device session info', async () => {
      const device = await createTestDevice(ctx.org.id, { name: 'テストデバイス-me' })
      const deviceSessionId = createSession({
        userId: device.id,
        organizationId: ctx.org.id,
        email: 'device@test.local',
        role: 'DEVICE',
        deviceId: device.id
      })

      const event = createMockEvent({ session_id: deviceSessionId })
      const result = await meHandler(event)

      expect(result.success).toBe(true)
      expect(result.isAuthenticated).toBe(true)
      expect(result.isDevice).toBe(true)
      expect(result.user!.role).toBe('DEVICE')
      expect(result.organization).toBeDefined()
      expect(result.organization!.id).toBe(ctx.org.id)

      deleteSession(deviceSessionId)
    })
  })

  describe('異常系', () => {
    it('should return unauthenticated when no session cookie', async () => {
      const event = createMockEvent({})
      const result = await meHandler(event)

      expect(result.success).toBe(false)
      expect(result.isAuthenticated).toBe(false)
      expect(result.user).toBeNull()
      expect(result.organization).toBeNull()
    })

    it('should return unauthenticated for invalid session', async () => {
      const event = createMockEvent({ session_id: 'invalid-session-id' })
      const result = await meHandler(event)

      expect(result.success).toBe(false)
      expect(result.isAuthenticated).toBe(false)
      expect(result.user).toBeNull()
    })

    it('should return unauthenticated when user is deleted from DB', async () => {
      // 一時的なユーザーを作成
      const tempUser = await prisma.user.create({
        data: {
          email: `temp-me-deleted-${Date.now()}@example.com`,
          name: 'Temp User',
          role: 'MEMBER',
          organizationId: ctx.org.id
        }
      })

      const tempSessionId = createSession({
        userId: tempUser.id,
        organizationId: ctx.org.id,
        email: tempUser.email,
        role: tempUser.role
      })

      // ユーザーを削除
      await prisma.user.delete({ where: { id: tempUser.id } })

      const event = createMockEvent({ session_id: tempSessionId })
      const result = await meHandler(event)

      expect(result.success).toBe(false)
      expect(result.isAuthenticated).toBe(false)
      expect(result.user).toBeNull()

      deleteSession(tempSessionId)
    })
  })

  describe('マルチテナント境界（最重要）', () => {
    it('should return correct organization for the authenticated user', async () => {
      const event = createMockEvent({ session_id: ctx.sessionId })
      const result = await meHandler(event)

      expect(result.organization!.id).toBe(ctx.org.id)
      expect(result.organization!.name).toBe(ctx.org.name)
    })
  })
})

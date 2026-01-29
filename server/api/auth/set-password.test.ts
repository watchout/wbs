/**
 * Set Password API Tests
 *
 * POST /api/auth/set-password (token-based)
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestContext, cleanupTestData, cleanupSession } from '../../../tests/helpers'
import { prisma } from '~/server/utils/prisma'
import setPasswordHandler from './set-password.post'

function createMockEvent(body: Record<string, unknown>) {
  return {
    node: {
      req: {
        headers: { 'content-type': 'application/json' },
        url: '/api/auth/set-password',
        method: 'POST'
      },
      res: { setHeader: vi.fn(), getHeader: vi.fn() }
    },
    context: {},
    _body: body
  } as any
}

vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: (event: any) => Promise.resolve(event._body)
  }
})

describe('POST /api/auth/set-password', () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>
  let targetUser: { id: string; email: string }
  const validToken = 'valid-setup-token-123'

  beforeAll(async () => {
    ctx = await createTestContext('set-pw-test')
    // パスワード未設定・トークンありのユーザーを作成
    targetUser = await prisma.user.create({
      data: {
        organizationId: ctx.org.id,
        email: `setup-${Date.now()}@example.com`,
        name: 'Setup User',
        role: 'MEMBER',
        setupToken: validToken,
        setupTokenExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000)
      }
    })
  })

  afterAll(async () => {
    await prisma.user.delete({ where: { id: targetUser.id } }).catch(() => {})
    cleanupSession(ctx.sessionId)
    await cleanupTestData(ctx.org.id)
  })

  it('should reject invalid token', async () => {
    const event = createMockEvent({
      email: targetUser.email,
      setupToken: 'wrong-token',
      password: 'newpassword123'
    })

    await expect(setPasswordHandler(event)).rejects.toMatchObject({
      statusCode: 400
    })
  })

  it('should reject expired token', async () => {
    // 期限切れユーザーを作成
    const expiredUser = await prisma.user.create({
      data: {
        organizationId: ctx.org.id,
        email: `expired-${Date.now()}@example.com`,
        role: 'MEMBER',
        setupToken: 'expired-token',
        setupTokenExpiry: new Date(Date.now() - 1000)
      }
    })

    const event = createMockEvent({
      email: expiredUser.email,
      setupToken: 'expired-token',
      password: 'newpassword123'
    })

    await expect(setPasswordHandler(event)).rejects.toMatchObject({
      statusCode: 400
    })

    await prisma.user.delete({ where: { id: expiredUser.id } })
  })

  it('should reject short password', async () => {
    const event = createMockEvent({
      email: targetUser.email,
      setupToken: validToken,
      password: 'short'
    })

    await expect(setPasswordHandler(event)).rejects.toMatchObject({
      statusCode: 400
    })
  })

  it('should set password with valid token', async () => {
    const event = createMockEvent({
      email: targetUser.email,
      setupToken: validToken,
      password: 'newpassword123'
    })

    const response = await setPasswordHandler(event)

    expect(response.success).toBe(true)

    // トークンがクリアされたことを確認
    const updated = await prisma.user.findUnique({ where: { id: targetUser.id } })
    expect(updated?.passwordHash).toBeTruthy()
    expect(updated?.setupToken).toBeNull()
    expect(updated?.setupTokenExpiry).toBeNull()
  })
})

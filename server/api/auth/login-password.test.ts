/**
 * Login API Password Tests
 *
 * POST /api/auth/login (with password)
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestContext, cleanupTestData, cleanupSession } from '../../../tests/helpers'
import { prisma } from '~/server/utils/prisma'
import { hashPassword } from '~/server/utils/password'
import loginHandler from './login.post'

function createMockEvent(body: Record<string, unknown>) {
  return {
    node: {
      req: {
        headers: { 'content-type': 'application/json' },
        url: '/api/auth/login',
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

vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: (event: any) => Promise.resolve(event._body),
    setCookie: (event: any, name: string, value: string) => {
      event.node.res.setHeader('Set-Cookie', `${name}=${value}`)
    }
  }
})

describe('POST /api/auth/login (password auth)', () => {
  let ctx: Awaited<ReturnType<typeof createTestContext>>

  beforeAll(async () => {
    ctx = await createTestContext('login-pw-test')
    // パスワードを設定
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

  it('should reject login without password when passwordHash is set', async () => {
    const event = createMockEvent({ email: ctx.user.email })

    await expect(loginHandler(event)).rejects.toMatchObject({
      statusCode: 400
    })
  })

  it('should reject wrong password', async () => {
    const event = createMockEvent({
      email: ctx.user.email,
      password: 'wrongpassword'
    })

    await expect(loginHandler(event)).rejects.toMatchObject({
      statusCode: 401
    })
  })

  it('should accept correct password', async () => {
    const event = createMockEvent({
      email: ctx.user.email,
      password: 'testpass123'
    })

    const response = await loginHandler(event)

    expect(response.success).toBe(true)
    expect(response.user.id).toBe(ctx.user.id)
  })

  it('should reject login for users without passwordHash (401)', async () => {
    const noPwUser = await prisma.user.create({
      data: {
        organizationId: ctx.org.id,
        email: `nopw-${Date.now()}@example.com`,
        name: 'No Password User',
        role: 'MEMBER'
      }
    })

    const event = createMockEvent({ email: noPwUser.email })

    await expect(loginHandler(event)).rejects.toMatchObject({
      statusCode: 401
    })

    await prisma.user.delete({ where: { id: noPwUser.id } })
  })
})

/**
 * Contact API Tests
 *
 * POST /api/contact
 * リード獲得APIのテスト
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { prisma } from '../utils/prisma'

// APIハンドラを直接インポート
import contactHandler from './contact.post'

// H3イベントのモック作成ヘルパー
function createMockEvent(body: Record<string, unknown>) {
  return {
    node: {
      req: {
        headers: {},
        method: 'POST'
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn()
      }
    },
    context: {},
    _body: body,
    _requestBody: body
  } as any
}

// readBody のモック
vi.mock('h3', async () => {
  const actual = await vi.importActual('h3')
  return {
    ...actual,
    readBody: vi.fn().mockImplementation((event) => Promise.resolve(event._body))
  }
})

describe('POST /api/contact', () => {
  const testEmails: string[] = []

  afterAll(async () => {
    // テストで作成したデータをクリーンアップ
    for (const email of testEmails) {
      try {
        const user = await prisma.user.findUnique({ where: { email } })
        if (user) {
          await prisma.user.delete({ where: { email } })
          await prisma.organization.delete({ where: { id: user.organizationId } })
        }
      } catch {
        // ignore
      }
    }
  })

  describe('バリデーション', () => {
    it('should return 400 when email is missing', async () => {
      const event = createMockEvent({})

      await expect(contactHandler(event)).rejects.toThrow()
    })

    it('should return 400 when email is invalid', async () => {
      const event = createMockEvent({ email: 'invalid-email' })

      await expect(contactHandler(event)).rejects.toThrow()
    })
  })

  describe('リード作成', () => {
    it('should create organization with company name when provided', async () => {
      const testEmail = `test-company-${Date.now()}@example.com`
      testEmails.push(testEmail)

      const event = createMockEvent({
        email: testEmail,
        companyName: 'テスト株式会社'
      })

      const response = await contactHandler(event)

      expect(response.success).toBe(true)
      expect(response.organizationId).toBeDefined()

      // Organization名が会社名になっていることを確認
      const org = await prisma.organization.findUnique({
        where: { id: response.organizationId }
      })
      expect(org?.name).toBe('テスト株式会社')
    })

    it('should create organization with domain name when company name not provided', async () => {
      const testEmail = `test-domain-${Date.now()}@example.com`
      testEmails.push(testEmail)

      const event = createMockEvent({
        email: testEmail
      })

      const response = await contactHandler(event)

      expect(response.success).toBe(true)
      expect(response.organizationId).toBeDefined()

      // Organization名がドメインから生成されていることを確認
      const org = await prisma.organization.findUnique({
        where: { id: response.organizationId }
      })
      expect(org?.name).toContain('example')
    })

    it('should return 409 when email already exists', async () => {
      const testEmail = `test-duplicate-${Date.now()}@example.com`
      testEmails.push(testEmail)

      // 1回目の登録
      const event1 = createMockEvent({ email: testEmail })
      await contactHandler(event1)

      // 2回目の登録（重複）
      const event2 = createMockEvent({ email: testEmail })
      await expect(contactHandler(event2)).rejects.toThrow()
    })
  })
})

/**
 * Departments API Integration Tests
 *
 * GET /api/departments
 * マルチテナント境界テスト
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { createTestContext, cleanupTestData, createTestDepartment, cleanupSession } from '../../../tests/helpers'

// APIハンドラを直接インポート
import departmentsHandler from './index.get'

// H3イベントのモック作成ヘルパー
function createMockEvent(options: {
  sessionId?: string
  organizationId?: string
}) {
  const cookies: Record<string, string> = {}
  if (options.sessionId) {
    cookies['session_id'] = options.sessionId
  }

  return {
    node: {
      req: {
        headers: {
          cookie: options.sessionId ? `session_id=${options.sessionId}` : '',
          'x-organization-id': options.organizationId || ''
        },
        url: '/api/departments'
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

describe('GET /api/departments', () => {
  let ctxA: Awaited<ReturnType<typeof createTestContext>>
  let ctxB: Awaited<ReturnType<typeof createTestContext>>
  let deptA1: Awaited<ReturnType<typeof createTestDepartment>>
  let deptA2: Awaited<ReturnType<typeof createTestDepartment>>
  let deptB1: Awaited<ReturnType<typeof createTestDepartment>>

  beforeAll(async () => {
    // 2つの異なる組織を作成
    ctxA = await createTestContext('dept-org-a')
    ctxB = await createTestContext('dept-org-b')

    // 組織Aに部門を作成
    deptA1 = await createTestDepartment(ctxA.org.id, 'Engineering A')
    deptA2 = await createTestDepartment(ctxA.org.id, 'Sales A')

    // 組織Bに部門を作成
    deptB1 = await createTestDepartment(ctxB.org.id, 'Engineering B')
  })

  afterAll(async () => {
    cleanupSession(ctxA.sessionId)
    cleanupSession(ctxB.sessionId)
    await cleanupTestData(ctxA.org.id)
    await cleanupTestData(ctxB.org.id)
  })

  describe('認証', () => {
    it('should return 200 with valid session', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId
      })

      const response = await departmentsHandler(event)

      expect(response.success).toBe(true)
      expect(Array.isArray(response.departments)).toBe(true)
    })
  })

  describe('マルチテナント境界（最重要）', () => {
    it('should return only departments for authenticated organization', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId
      })

      const response = await departmentsHandler(event)

      expect(response.success).toBe(true)

      // 組織Aの部門のみが含まれること
      const deptIds = response.departments.map(d => d.id)
      expect(deptIds).toContain(deptA1.id)
      expect(deptIds).toContain(deptA2.id)

      // 組織Bの部門が含まれないこと
      expect(deptIds).not.toContain(deptB1.id)
    })

    it('should not leak other organization departments', async () => {
      // 組織Aとしてアクセス
      const eventA = createMockEvent({
        sessionId: ctxA.sessionId
      })
      const responseA = await departmentsHandler(eventA)

      // 組織Bとしてアクセス
      const eventB = createMockEvent({
        sessionId: ctxB.sessionId
      })
      const responseB = await departmentsHandler(eventB)

      // 組織Aには2つの部門
      expect(responseA.departments.length).toBe(2)

      // 組織Bには1つの部門
      expect(responseB.departments.length).toBe(1)

      // 部門が混在しないことを確認
      const deptIdsA = responseA.departments.map(d => d.id)
      const deptIdsB = responseB.departments.map(d => d.id)

      expect(deptIdsA).not.toContain(deptB1.id)
      expect(deptIdsB).not.toContain(deptA1.id)
      expect(deptIdsB).not.toContain(deptA2.id)
    })

    it('should isolate department data between organizations completely', async () => {
      // 組織Aの部門名
      const eventA = createMockEvent({
        sessionId: ctxA.sessionId
      })
      const responseA = await departmentsHandler(eventA)
      const namesA = responseA.departments.map(d => d.name)

      // 組織Bの部門名
      const eventB = createMockEvent({
        sessionId: ctxB.sessionId
      })
      const responseB = await departmentsHandler(eventB)
      const namesB = responseB.departments.map(d => d.name)

      // 組織Aの部門名に組織Bのものが含まれない
      expect(namesA).not.toContain('Engineering B')

      // 組織Bの部門名に組織Aのものが含まれない
      expect(namesB).not.toContain('Engineering A')
      expect(namesB).not.toContain('Sales A')
    })
  })

  describe('レスポンス形式', () => {
    it('should return department with correct properties', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId
      })

      const response = await departmentsHandler(event)

      expect(response.departments.length).toBeGreaterThan(0)

      const dept = response.departments[0]
      expect(dept).toHaveProperty('id')
      expect(dept).toHaveProperty('name')
      expect(dept).toHaveProperty('color')
      expect(dept).toHaveProperty('sortOrder')
      expect(dept).toHaveProperty('userCount')
    })

    it('should return departments sorted by sortOrder and name', async () => {
      const event = createMockEvent({
        sessionId: ctxA.sessionId
      })

      const response = await departmentsHandler(event)

      // sortOrderでソートされていることを確認
      for (let i = 1; i < response.departments.length; i++) {
        const prev = response.departments[i - 1]
        const curr = response.departments[i]

        // sortOrderが同じ場合は名前順
        if (prev.sortOrder === curr.sortOrder) {
          expect(prev.name.localeCompare(curr.name)).toBeLessThanOrEqual(0)
        } else {
          expect(prev.sortOrder).toBeLessThanOrEqual(curr.sortOrder)
        }
      }
    })
  })
})

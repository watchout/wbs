/**
 * E2E: API エンドポイントテスト
 *
 * テスト対象:
 * - ヘルスチェック
 * - 認証API
 * - スケジュールAPI（認証なしでの403）
 * - 管理者API（権限チェック）
 */
import { test, expect } from '@playwright/test'

test.describe('API: ヘルスチェック', () => {
  test('GET /api/health が 200 を返す', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)

    const data = await response.json()
    expect(['healthy', 'degraded']).toContain(data.status)
    expect(data).toHaveProperty('timestamp')
    expect(data).toHaveProperty('checks')
  })
})

test.describe('API: 認証', () => {
  test('POST /api/auth/login で不正な認証情報は 401', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        email: 'nonexistent@example.com',
        password: 'wrongpassword',
      },
    })

    // 401 or 400 (not found user)
    expect([400, 401]).toContain(response.status())
  })

  test('POST /api/auth/login でメールなしは 400', async ({ request }) => {
    const response = await request.post('/api/auth/login', {
      data: {
        password: 'somepassword',
      },
    })

    expect(response.status()).toBe(400)
  })

  test('GET /api/auth/me で未認証は認証失敗を返す', async ({ request }) => {
    const response = await request.get('/api/auth/me')

    // 認証なしでもエラーにならず isAuthenticated: false を返す
    const data = await response.json()
    expect(data.isAuthenticated).toBe(false)
  })
})

test.describe('API: スケジュール（未認証）', () => {
  test('GET /api/schedules で未認証はエラーを返す', async ({ request }) => {
    const response = await request.get('/api/schedules')
    // GET /api/schedules のリストエンドポイントが存在しない場合は404、
    // 存在する場合は401が返る
    expect([401, 404, 405]).toContain(response.status())
  })

  test('POST /api/schedules で未認証はエラーを返す', async ({ request }) => {
    const response = await request.post('/api/schedules', {
      data: {
        title: 'テスト予定',
        start: '2025-06-01T09:00:00Z',
        end: '2025-06-01T10:00:00Z',
      },
    })
    // 未認証の場合、401（認証エラー）または403（CSRF）が返る
    expect([401, 403]).toContain(response.status())
  })
})

test.describe('API: 管理者エンドポイント（未認証）', () => {
  test('GET /api/admin/audit-logs で未認証は 401', async ({ request }) => {
    const response = await request.get('/api/admin/audit-logs')
    expect(response.status()).toBe(401)
  })

  test('GET /api/admin/dashboard で未認証は 401', async ({ request }) => {
    const response = await request.get('/api/admin/dashboard')
    expect(response.status()).toBe(401)
  })

  test('GET /api/admin/backups で未認証は 401', async ({ request }) => {
    const response = await request.get('/api/admin/backups')
    expect(response.status()).toBe(401)
  })
})

test.describe('API: エラーページ', () => {
  test('存在しないAPIパスは 404', async ({ request }) => {
    const response = await request.get('/api/nonexistent-endpoint')
    expect([404, 405]).toContain(response.status())
  })
})

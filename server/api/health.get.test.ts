/**
 * Health Check API Tests
 *
 * GET /api/health
 * システムヘルスチェック（認証不要）
 */

import { describe, it, expect, vi } from 'vitest'

// APIハンドラを直接インポート
import healthHandler from './health.get'

// H3イベントのモック作成ヘルパー
function createMockEvent() {
  return {
    node: {
      req: {
        headers: {},
        method: 'GET'
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn()
      }
    },
    context: {}
  } as any
}

describe('GET /api/health', () => {
  it('should return 200 with health status', async () => {
    const event = createMockEvent()

    const response = await healthHandler(event)

    expect(response.status).toBe('healthy')
    expect(response.timestamp).toBeDefined()
    expect(response.checks).toBeDefined()
  })

  it('should include database check', async () => {
    const event = createMockEvent()

    const response = await healthHandler(event)

    expect(typeof response.checks.database).toBe('boolean')
  })

  it('should include api check', async () => {
    const event = createMockEvent()

    const response = await healthHandler(event)

    expect(typeof response.checks.api).toBe('boolean')
  })
})

/**
 * Admin API Integration Tests
 *
 * テスト対象:
 * - GET  /api/admin/audit-logs
 * - GET  /api/admin/dashboard
 * - GET  /api/admin/backups
 * - POST /api/admin/backups
 * - GET  /api/admin/llm-settings
 * - PATCH /api/admin/llm-settings
 *
 * 全エンドポイントで ADMIN 権限必須
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'

// ================================================================
// モック定義（vi.hoisted で変数を事前に定義）
// ================================================================

const {
  mockPrisma,
  mockAuth,
  mockRequireAdmin,
  mockGetAuditLogs,
  mockCreateAuditLog,
  mockListBackups,
  mockCreateBackup,
  mockPruneOldBackups,
  mockGetAvailableProviders,
} = vi.hoisted(() => ({
  mockPrisma: {
    user: {
      count: vi.fn(),
    },
    schedule: {
      count: vi.fn(),
    },
    department: {
      count: vi.fn(),
    },
    auditLog: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
  mockAuth: vi.fn(),
  mockRequireAdmin: vi.fn(),
  mockGetAuditLogs: vi.fn(),
  mockCreateAuditLog: vi.fn(),
  mockListBackups: vi.fn(),
  mockCreateBackup: vi.fn(),
  mockPruneOldBackups: vi.fn(),
  mockGetAvailableProviders: vi.fn(),
}))

// モック登録
vi.mock('~/server/utils/prisma', () => ({ prisma: mockPrisma }))
vi.mock('~/server/utils/authMiddleware', () => ({
  requireAuth: mockAuth,
  requireAdmin: mockRequireAdmin,
}))
vi.mock('~/server/utils/auditLog', () => ({
  getAuditLogs: mockGetAuditLogs,
  createAuditLog: mockCreateAuditLog,
  AUDIT_ACTIONS: {
    USER_LOGIN: 'USER_LOGIN',
    USER_LOGOUT: 'USER_LOGOUT',
    SCHEDULE_CREATE: 'SCHEDULE_CREATE',
    SCHEDULE_UPDATE: 'SCHEDULE_UPDATE',
    SCHEDULE_DELETE: 'SCHEDULE_DELETE',
    ORGANIZATION_UPDATE: 'ORGANIZATION_UPDATE',
    LLM_SETTINGS_UPDATE: 'LLM_SETTINGS_UPDATE',
  },
}))
vi.mock('~/server/utils/backup', () => ({
  listBackups: mockListBackups,
  createBackup: mockCreateBackup,
  pruneOldBackups: mockPruneOldBackups,
}))
vi.mock('~/server/utils/llm/factory', () => ({
  getAvailableProviders: mockGetAvailableProviders,
}))
vi.mock('~/server/utils/llm/provider', () => ({
  DEFAULT_MODELS: {
    openai: 'gpt-4o-mini',
    claude: 'claude-sonnet-4-20250514',
    gemini: 'gemini-2.0-flash',
  },
  PROVIDER_ENV_KEYS: {
    openai: 'OPENAI_API_KEY',
    claude: 'ANTHROPIC_API_KEY',
    gemini: 'GOOGLE_AI_API_KEY',
  },
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
    getQuery: (event: { _query: unknown }) => event._query || {},
  }
})

// ================================================================
// ヘルパー
// ================================================================

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function createMockEvent(overrides: {
  body?: Record<string, unknown>
  query?: Record<string, unknown>
}): any {
  return {
    node: {
      req: {
        headers: {},
        url: '/api/admin/test',
        method: 'GET',
        socket: { remoteAddress: '127.0.0.1' },
      },
      res: {
        setHeader: vi.fn(),
        getHeader: vi.fn(),
      },
    },
    context: {},
    _body: overrides.body,
    _query: overrides.query,
  }
}

const MOCK_ADMIN_AUTH = {
  userId: 'user-test',
  organizationId: 'org-test',
  role: 'ADMIN' as const,
  email: 'admin@test.com',
}

const MOCK_MEMBER_AUTH = {
  userId: 'user-test',
  organizationId: 'org-test',
  role: 'MEMBER' as const,
  email: 'member@test.com',
}

// ================================================================
// テスト
// ================================================================

describe('Admin API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockAuth.mockResolvedValue(MOCK_ADMIN_AUTH)
    mockRequireAdmin.mockImplementation(() => {
      // デフォルト: 何もしない（ADMINとして通過）
    })
  })

  // ----------------------------------------------------------
  // GET /api/admin/audit-logs
  // ----------------------------------------------------------
  describe('GET /api/admin/audit-logs', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: any

    beforeEach(async () => {
      const mod = await import('./audit-logs.get')
      handler = mod.default
    })

    it('認証なしの場合 401 を返す', async () => {
      mockAuth.mockRejectedValue(
        Object.assign(new Error('認証が必要です'), { statusCode: 401 })
      )

      const event = createMockEvent({})
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 401,
      })
    })

    it('ADMIN権限がない場合 403 を返す', async () => {
      mockAuth.mockResolvedValue(MOCK_MEMBER_AUTH)
      mockRequireAdmin.mockImplementation(() => {
        throw Object.assign(new Error('管理者権限が必要です'), {
          statusCode: 403,
        })
      })

      const event = createMockEvent({})
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 403,
      })
    })

    it('正常系: 操作ログ一覧を取得する', async () => {
      const mockResult = {
        logs: [
          {
            id: 'log-1',
            action: 'USER_LOGIN',
            targetId: null,
            meta: null,
            userName: 'テストユーザー',
            createdAt: '2026-01-15T10:00:00.000Z',
          },
        ],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      }
      mockGetAuditLogs.mockResolvedValue(mockResult)

      const event = createMockEvent({})
      const result = await handler(event)

      expect(mockAuth).toHaveBeenCalledWith(event)
      expect(mockRequireAdmin).toHaveBeenCalledWith(MOCK_ADMIN_AUTH)
      expect(mockGetAuditLogs).toHaveBeenCalledWith('org-test', {
        page: 1,
        limit: 50,
        action: undefined,
        userId: undefined,
        from: undefined,
        to: undefined,
      })
      expect(result).toEqual({
        success: true,
        ...mockResult,
      })
    })

    it('フィルタ: action, userId, from, to を渡す', async () => {
      mockGetAuditLogs.mockResolvedValue({
        logs: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      })

      const event = createMockEvent({
        query: {
          action: 'USER_LOGIN',
          userId: 'user-filter',
          from: '2026-01-01T00:00:00Z',
          to: '2026-01-31T23:59:59Z',
          page: '2',
          limit: '10',
        },
      })
      const result = await handler(event)

      expect(mockGetAuditLogs).toHaveBeenCalledWith('org-test', {
        page: 2,
        limit: 10,
        action: 'USER_LOGIN',
        userId: 'user-filter',
        from: expect.any(Date),
        to: expect.any(Date),
      })
      expect(result.success).toBe(true)
    })

    it('from の日時形式が不正な場合 400 を返す', async () => {
      const event = createMockEvent({
        query: { from: 'invalid-date' },
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('to の日時形式が不正な場合 400 を返す', async () => {
      const event = createMockEvent({
        query: { to: 'not-a-date' },
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
      })
    })
  })

  // ----------------------------------------------------------
  // GET /api/admin/dashboard
  // ----------------------------------------------------------
  describe('GET /api/admin/dashboard', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: any

    beforeEach(async () => {
      const mod = await import('./dashboard.get')
      handler = mod.default
    })

    it('認証なしの場合 401 を返す', async () => {
      mockAuth.mockRejectedValue(
        Object.assign(new Error('認証が必要です'), { statusCode: 401 })
      )

      const event = createMockEvent({})
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 401,
      })
    })

    it('ADMIN権限がない場合 403 を返す', async () => {
      mockAuth.mockResolvedValue(MOCK_MEMBER_AUTH)
      mockRequireAdmin.mockImplementation(() => {
        throw Object.assign(new Error('管理者権限が必要です'), {
          statusCode: 403,
        })
      })

      const event = createMockEvent({})
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 403,
      })
    })

    it('正常系: 統計情報を取得する', async () => {
      // Promise.all の順番に合わせてモック設定
      mockPrisma.user.count
        .mockResolvedValueOnce(10)   // totalUsers
        .mockResolvedValueOnce(5)    // activeUsers
      mockPrisma.schedule.count
        .mockResolvedValueOnce(100)  // totalSchedules
        .mockResolvedValueOnce(8)    // todaySchedules
      mockPrisma.department.count.mockResolvedValue(3)  // totalDepartments
      mockPrisma.auditLog.findMany.mockResolvedValue([
        {
          id: 'log-1',
          action: 'USER_LOGIN',
          user: { name: 'テストユーザー' },
          createdAt: new Date('2026-01-15T10:00:00Z'),
        },
      ])

      const event = createMockEvent({})
      const result = await handler(event)

      expect(mockAuth).toHaveBeenCalledWith(event)
      expect(mockRequireAdmin).toHaveBeenCalledWith(MOCK_ADMIN_AUTH)
      expect(result).toEqual({
        success: true,
        data: {
          stats: {
            totalUsers: 10,
            activeUsers: 5,
            totalSchedules: 100,
            todaySchedules: 8,
            totalDepartments: 3,
          },
          recentActivity: [
            {
              id: 'log-1',
              action: 'USER_LOGIN',
              userName: 'テストユーザー',
              createdAt: '2026-01-15T10:00:00.000Z',
            },
          ],
        },
      })

      // organizationId スコープの確認
      expect(mockPrisma.user.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org-test' }),
        })
      )
      expect(mockPrisma.schedule.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ organizationId: 'org-test' }),
        })
      )
      expect(mockPrisma.department.count).toHaveBeenCalledWith({
        where: { organizationId: 'org-test' },
      })
      expect(mockPrisma.auditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { organizationId: 'org-test' },
        })
      )
    })
  })

  // ----------------------------------------------------------
  // GET /api/admin/backups
  // ----------------------------------------------------------
  describe('GET /api/admin/backups', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: any

    beforeEach(async () => {
      const mod = await import('./backups/index.get')
      handler = mod.default
    })

    it('認証なしの場合 401 を返す', async () => {
      mockAuth.mockRejectedValue(
        Object.assign(new Error('認証が必要です'), { statusCode: 401 })
      )

      const event = createMockEvent({})
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 401,
      })
    })

    it('非ADMINの場合 403 を返す', async () => {
      mockAuth.mockResolvedValue(MOCK_MEMBER_AUTH)

      const event = createMockEvent({})
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 403,
      })
    })

    it('正常系: バックアップ一覧を取得する', async () => {
      const mockBackups = [
        {
          filename: 'backup-2026-01-15-manual.sql.gz',
          type: 'manual',
          size: 1024,
          createdAt: '2026-01-15T10:00:00.000Z',
        },
        {
          filename: 'backup-2026-01-14-auto.sql.gz',
          type: 'auto',
          size: 2048,
          createdAt: '2026-01-14T03:00:00.000Z',
        },
      ]
      mockListBackups.mockReturnValue(mockBackups)

      const event = createMockEvent({})
      const result = await handler(event)

      expect(mockAuth).toHaveBeenCalledWith(event)
      expect(mockListBackups).toHaveBeenCalled()
      expect(result).toEqual({
        success: true,
        backups: mockBackups,
        total: 2,
      })
    })
  })

  // ----------------------------------------------------------
  // POST /api/admin/backups
  // ----------------------------------------------------------
  describe('POST /api/admin/backups', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: any

    beforeEach(async () => {
      const mod = await import('./backups/index.post')
      handler = mod.default
    })

    it('認証なしの場合 401 を返す', async () => {
      mockAuth.mockRejectedValue(
        Object.assign(new Error('認証が必要です'), { statusCode: 401 })
      )

      const event = createMockEvent({})
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 401,
      })
    })

    it('非ADMINの場合 403 を返す', async () => {
      mockAuth.mockResolvedValue(MOCK_MEMBER_AUTH)

      const event = createMockEvent({})
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 403,
      })
    })

    it('正常系: バックアップを作成する', async () => {
      const mockBackup = {
        filename: 'backup-2026-01-15-manual.sql.gz',
        type: 'manual',
        size: 1024,
        createdAt: '2026-01-15T10:00:00.000Z',
      }
      mockCreateBackup.mockReturnValue(mockBackup)
      mockPruneOldBackups.mockReturnValue(2)
      mockCreateAuditLog.mockResolvedValue(undefined)

      const event = createMockEvent({})
      const result = await handler(event)

      expect(mockAuth).toHaveBeenCalledWith(event)
      expect(mockCreateBackup).toHaveBeenCalledWith('manual')
      expect(mockPruneOldBackups).toHaveBeenCalled()
      expect(mockCreateAuditLog).toHaveBeenCalledWith({
        organizationId: 'org-test',
        userId: 'user-test',
        action: 'ORGANIZATION_UPDATE',
        meta: {
          type: 'backup_create',
          filename: mockBackup.filename,
          pruned: '2',
        },
      })
      expect(result).toEqual({
        success: true,
        backup: mockBackup,
        pruned: 2,
      })
    })

    it('バックアップ作成に失敗した場合 500 を返す', async () => {
      mockCreateBackup.mockReturnValue(null)

      const event = createMockEvent({})
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 500,
      })
    })
  })

  // ----------------------------------------------------------
  // GET /api/admin/llm-settings
  // ----------------------------------------------------------
  describe('GET /api/admin/llm-settings', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: any

    beforeEach(async () => {
      const mod = await import('./llm-settings.get')
      handler = mod.default
    })

    it('認証なしの場合 401 を返す', async () => {
      mockAuth.mockRejectedValue(
        Object.assign(new Error('認証が必要です'), { statusCode: 401 })
      )

      const event = createMockEvent({})
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 401,
      })
    })

    it('ADMIN権限がない場合 403 を返す', async () => {
      mockAuth.mockResolvedValue(MOCK_MEMBER_AUTH)
      mockRequireAdmin.mockImplementation(() => {
        throw Object.assign(new Error('管理者権限が必要です'), {
          statusCode: 403,
        })
      })

      const event = createMockEvent({})
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 403,
      })
    })

    it('正常系: LLM設定を取得する', async () => {
      mockPrisma.organization.findUnique.mockResolvedValue({
        llmProvider: 'claude',
        llmModel: 'claude-sonnet-4-20250514',
      })
      mockGetAvailableProviders.mockReturnValue(['openai', 'claude'])

      const event = createMockEvent({})
      const result = await handler(event)

      expect(mockAuth).toHaveBeenCalledWith(event)
      expect(mockRequireAdmin).toHaveBeenCalledWith(MOCK_ADMIN_AUTH)
      expect(mockPrisma.organization.findUnique).toHaveBeenCalledWith({
        where: { id: 'org-test' },
        select: { llmProvider: true, llmModel: true },
      })
      expect(result).toEqual({
        success: true,
        data: {
          currentProvider: 'claude',
          currentModel: 'claude-sonnet-4-20250514',
          providers: [
            {
              type: 'openai',
              name: 'OpenAI (GPT-4o mini)',
              defaultModel: 'gpt-4o-mini',
              envKey: 'OPENAI_API_KEY',
              isConfigured: true,
            },
            {
              type: 'claude',
              name: 'Claude (Sonnet)',
              defaultModel: 'claude-sonnet-4-20250514',
              envKey: 'ANTHROPIC_API_KEY',
              isConfigured: true,
            },
            {
              type: 'gemini',
              name: 'Gemini (Flash)',
              defaultModel: 'gemini-2.0-flash',
              envKey: 'GOOGLE_AI_API_KEY',
              isConfigured: false,
            },
          ],
        },
      })
    })
  })

  // ----------------------------------------------------------
  // PATCH /api/admin/llm-settings
  // ----------------------------------------------------------
  describe('PATCH /api/admin/llm-settings', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let handler: any

    beforeEach(async () => {
      const mod = await import('./llm-settings.patch')
      handler = mod.default
    })

    it('認証なしの場合 401 を返す', async () => {
      mockAuth.mockRejectedValue(
        Object.assign(new Error('認証が必要です'), { statusCode: 401 })
      )

      const event = createMockEvent({ body: { llmProvider: 'openai' } })
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 401,
      })
    })

    it('ADMIN権限がない場合 403 を返す', async () => {
      mockAuth.mockResolvedValue(MOCK_MEMBER_AUTH)
      mockRequireAdmin.mockImplementation(() => {
        throw Object.assign(new Error('管理者権限が必要です'), {
          statusCode: 403,
        })
      })

      const event = createMockEvent({ body: { llmProvider: 'openai' } })
      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 403,
      })
    })

    it('不正なプロバイダーの場合 400 を返す', async () => {
      const event = createMockEvent({
        body: { llmProvider: 'invalid-provider' },
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('プロバイダー未指定の場合 400 を返す', async () => {
      const event = createMockEvent({
        body: {},
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('モデル名が100文字を超える場合 400 を返す', async () => {
      const longModelName = 'a'.repeat(101)
      const event = createMockEvent({
        body: { llmProvider: 'openai', llmModel: longModelName },
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('モデル名に不正文字が含まれる場合 400 を返す', async () => {
      const event = createMockEvent({
        body: { llmProvider: 'openai', llmModel: 'model name with spaces!' },
      })

      await expect(handler(event)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('正常系: LLM設定を更新する（プロバイダーのみ）', async () => {
      mockPrisma.organization.update.mockResolvedValue({
        llmProvider: 'openai',
        llmModel: null,
      })

      const event = createMockEvent({
        body: { llmProvider: 'openai' },
      })
      const result = await handler(event)

      expect(mockAuth).toHaveBeenCalledWith(event)
      expect(mockRequireAdmin).toHaveBeenCalledWith(MOCK_ADMIN_AUTH)
      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-test' },
        data: {
          llmProvider: 'openai',
          llmModel: null,
        },
        select: { llmProvider: true, llmModel: true },
      })
      expect(result).toEqual({
        success: true,
        data: {
          currentProvider: 'openai',
          currentModel: null,
        },
      })
    })

    it('正常系: LLM設定を更新する（プロバイダー＋モデル名）', async () => {
      mockPrisma.organization.update.mockResolvedValue({
        llmProvider: 'claude',
        llmModel: 'claude-sonnet-4-20250514',
      })

      const event = createMockEvent({
        body: {
          llmProvider: 'claude',
          llmModel: 'claude-sonnet-4-20250514',
        },
      })
      const result = await handler(event)

      expect(mockPrisma.organization.update).toHaveBeenCalledWith({
        where: { id: 'org-test' },
        data: {
          llmProvider: 'claude',
          llmModel: 'claude-sonnet-4-20250514',
        },
        select: { llmProvider: true, llmModel: true },
      })
      expect(result).toEqual({
        success: true,
        data: {
          currentProvider: 'claude',
          currentModel: 'claude-sonnet-4-20250514',
        },
      })
    })

    it('モデル名にスラッシュ・コロン・ドットを含む名前は許可される', async () => {
      mockPrisma.organization.update.mockResolvedValue({
        llmProvider: 'gemini',
        llmModel: 'gemini-2.0-flash',
      })

      const event = createMockEvent({
        body: {
          llmProvider: 'gemini',
          llmModel: 'gemini-2.0-flash',
        },
      })
      const result = await handler(event)

      expect(result.success).toBe(true)
    })
  })
})

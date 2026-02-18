/**
 * Departments CRUD Integration Tests
 *
 * テスト対象:
 * - POST   /api/departments       (部署作成)
 * - PATCH  /api/departments/:id   (部署更新)
 * - DELETE /api/departments/:id   (部署削除)
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
  mockReadBody,
  mockGetRouterParam,
} = vi.hoisted(() => ({
  mockPrisma: {
    department: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
  mockAuth: vi.fn(),
  mockRequireAdmin: vi.fn(),
  mockReadBody: vi.fn(),
  mockGetRouterParam: vi.fn(),
}))

// モック登録
vi.mock('~/server/utils/prisma', () => ({ prisma: mockPrisma }))
vi.mock('~/server/utils/authMiddleware', () => ({
  requireAuth: mockAuth,
  requireAdmin: mockRequireAdmin,
}))
vi.mock('h3', async () => {
  const actual = await vi.importActual<typeof import('h3')>('h3')
  return { ...actual, readBody: mockReadBody, getRouterParam: mockGetRouterParam }
})

// ================================================================
// ハンドラインポート
// ================================================================

import postHandler from './index.post'
import patchHandler from './[id].patch'
import deleteHandler from './[id].delete'

// ================================================================
// テスト用定数
// ================================================================

const DEFAULT_AUTH = {
  organizationId: 'org-test',
  userId: 'user-test',
  role: 'ADMIN',
  email: 'admin@test.com',
}

const MOCK_EVENT = {} as Parameters<typeof postHandler>[0]

// ================================================================
// Nuxt auto-import のグローバル上書き
// getRouterParam は PATCH / DELETE で auto-import として使用される
// ================================================================

// @ts-ignore
globalThis.getRouterParam = mockGetRouterParam

// ================================================================
// 共通セットアップ
// ================================================================

beforeEach(() => {
  vi.clearAllMocks()
  // デフォルト: 認証成功・ADMIN
  mockAuth.mockResolvedValue(DEFAULT_AUTH)
  mockRequireAdmin.mockImplementation(() => {})
})

// ================================================================
// POST /api/departments
// ================================================================

describe('POST /api/departments', () => {
  it('認証なし → 401', async () => {
    mockAuth.mockRejectedValue(
      new Error('認証が必要です')
    )

    await expect(postHandler(MOCK_EVENT)).rejects.toThrow('認証が必要です')
  })

  it('非ADMIN → 403', async () => {
    mockAuth.mockResolvedValue({ ...DEFAULT_AUTH, role: 'MEMBER' })
    mockRequireAdmin.mockImplementation(() => {
      throw new Error('管理者権限が必要です')
    })

    await expect(postHandler(MOCK_EVENT)).rejects.toThrow('管理者権限が必要です')
  })

  it('名前なし → 400', async () => {
    mockReadBody.mockResolvedValue({})

    await expect(postHandler(MOCK_EVENT)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('名前が空文字 → 400', async () => {
    mockReadBody.mockResolvedValue({ name: '   ' })

    await expect(postHandler(MOCK_EVENT)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('重複名 → 409', async () => {
    mockReadBody.mockResolvedValue({ name: '電気工事部' })
    mockPrisma.department.findFirst.mockResolvedValue({
      id: 'dept-existing',
      name: '電気工事部',
      organizationId: 'org-test',
    })

    await expect(postHandler(MOCK_EVENT)).rejects.toMatchObject({
      statusCode: 409,
    })

    // organizationId スコープでの重複チェックを確認
    expect(mockPrisma.department.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-test',
        name: '電気工事部',
      },
    })
  })

  it('正常系: 部署作成成功', async () => {
    mockReadBody.mockResolvedValue({ name: '設備管理部', color: '#FF0000', sortOrder: 1 })
    mockPrisma.department.findFirst.mockResolvedValue(null) // 重複なし
    mockPrisma.department.create.mockResolvedValue({
      id: 'dept-new',
      name: '設備管理部',
      color: '#FF0000',
      sortOrder: 1,
      organizationId: 'org-test',
    })

    const result = await postHandler(MOCK_EVENT)

    expect(result).toEqual({
      success: true,
      department: {
        id: 'dept-new',
        name: '設備管理部',
        color: '#FF0000',
        sortOrder: 1,
      },
    })

    // organizationId 付きで作成されていることを確認
    expect(mockPrisma.department.create).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-test',
        name: '設備管理部',
        color: '#FF0000',
        sortOrder: 1,
      },
    })
  })
})

// ================================================================
// PATCH /api/departments/:id
// ================================================================

describe('PATCH /api/departments/:id', () => {
  it('認証なし → 401', async () => {
    mockAuth.mockRejectedValue(
      new Error('認証が必要です')
    )

    await expect(patchHandler(MOCK_EVENT)).rejects.toThrow('認証が必要です')
  })

  it('非ADMIN → 403', async () => {
    mockAuth.mockResolvedValue({ ...DEFAULT_AUTH, role: 'MEMBER' })
    mockRequireAdmin.mockImplementation(() => {
      throw new Error('管理者権限が必要です')
    })

    await expect(patchHandler(MOCK_EVENT)).rejects.toThrow('管理者権限が必要です')
  })

  it('IDなし → 400', async () => {
    mockGetRouterParam.mockReturnValue(undefined)

    await expect(patchHandler(MOCK_EVENT)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('存在しない部署 → 404', async () => {
    mockGetRouterParam.mockReturnValue('dept-nonexistent')
    mockPrisma.department.findFirst.mockResolvedValue(null)

    await expect(patchHandler(MOCK_EVENT)).rejects.toMatchObject({
      statusCode: 404,
    })

    // organizationId スコープでの検索を確認
    expect(mockPrisma.department.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'dept-nonexistent',
        organizationId: 'org-test',
      },
    })
  })

  it('重複名（別ID） → 409', async () => {
    mockGetRouterParam.mockReturnValue('dept-1')
    mockPrisma.department.findFirst
      // 1回目: 存在確認 → 見つかる
      .mockResolvedValueOnce({
        id: 'dept-1',
        name: '旧部署名',
        organizationId: 'org-test',
      })
      // 2回目: 重複チェック → 別IDで同名が見つかる
      .mockResolvedValueOnce({
        id: 'dept-other',
        name: '電気工事部',
        organizationId: 'org-test',
      })
    mockReadBody.mockResolvedValue({ name: '電気工事部' })

    await expect(patchHandler(MOCK_EVENT)).rejects.toMatchObject({
      statusCode: 409,
    })

    // 重複チェックの where 句に NOT: { id } が含まれていることを確認
    expect(mockPrisma.department.findFirst).toHaveBeenCalledWith({
      where: {
        organizationId: 'org-test',
        name: '電気工事部',
        NOT: { id: 'dept-1' },
      },
    })
  })

  it('正常系: 部署更新成功', async () => {
    mockGetRouterParam.mockReturnValue('dept-1')
    mockPrisma.department.findFirst.mockResolvedValue({
      id: 'dept-1',
      name: '旧部署名',
      organizationId: 'org-test',
      color: null,
      sortOrder: 0,
    })
    mockReadBody.mockResolvedValue({ name: '新部署名', color: '#00FF00' })
    // 重複チェック → 重複なし
    mockPrisma.department.findFirst
      .mockResolvedValueOnce({
        id: 'dept-1',
        name: '旧部署名',
        organizationId: 'org-test',
      })
      .mockResolvedValueOnce(null)
    mockPrisma.department.update.mockResolvedValue({
      id: 'dept-1',
      name: '新部署名',
      color: '#00FF00',
      sortOrder: 0,
      organizationId: 'org-test',
    })

    const result = await patchHandler(MOCK_EVENT)

    expect(result).toEqual({
      success: true,
      department: {
        id: 'dept-1',
        name: '新部署名',
        color: '#00FF00',
        sortOrder: 0,
      },
    })

    expect(mockPrisma.department.update).toHaveBeenCalledWith({
      where: { id: 'dept-1' },
      data: {
        name: '新部署名',
        color: '#00FF00',
      },
    })
  })
})

// ================================================================
// DELETE /api/departments/:id
// ================================================================

describe('DELETE /api/departments/:id', () => {
  it('認証なし → 401', async () => {
    mockAuth.mockRejectedValue(
      new Error('認証が必要です')
    )

    await expect(deleteHandler(MOCK_EVENT)).rejects.toThrow('認証が必要です')
  })

  it('非ADMIN → 403', async () => {
    mockAuth.mockResolvedValue({ ...DEFAULT_AUTH, role: 'MEMBER' })
    mockRequireAdmin.mockImplementation(() => {
      throw new Error('管理者権限が必要です')
    })

    await expect(deleteHandler(MOCK_EVENT)).rejects.toThrow('管理者権限が必要です')
  })

  it('IDなし → 400', async () => {
    mockGetRouterParam.mockReturnValue(undefined)

    await expect(deleteHandler(MOCK_EVENT)).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('存在しない部署 → 404', async () => {
    mockGetRouterParam.mockReturnValue('dept-nonexistent')
    mockPrisma.department.findFirst.mockResolvedValue(null)

    await expect(deleteHandler(MOCK_EVENT)).rejects.toMatchObject({
      statusCode: 404,
    })

    // deletedAt: null を含む検索でソフトデリート済みを除外していることを確認
    expect(mockPrisma.department.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'dept-nonexistent',
        organizationId: 'org-test',
        deletedAt: null,
      },
      include: {
        _count: {
          select: { users: { where: { deletedAt: null } } },
        },
      },
    })
  })

  it('所属ユーザーあり → 409', async () => {
    mockGetRouterParam.mockReturnValue('dept-1')
    mockPrisma.department.findFirst.mockResolvedValue({
      id: 'dept-1',
      name: '電気工事部',
      organizationId: 'org-test',
      deletedAt: null,
      _count: { users: 3 },
    })

    await expect(deleteHandler(MOCK_EVENT)).rejects.toMatchObject({
      statusCode: 409,
    })
  })

  it('正常系: ソフトデリート成功', async () => {
    mockGetRouterParam.mockReturnValue('dept-1')
    mockPrisma.department.findFirst.mockResolvedValue({
      id: 'dept-1',
      name: '電気工事部',
      organizationId: 'org-test',
      deletedAt: null,
      _count: { users: 0 },
    })
    mockPrisma.department.update.mockResolvedValue({
      id: 'dept-1',
      name: '電気工事部',
      deletedAt: new Date(),
    })

    const result = await deleteHandler(MOCK_EVENT)

    expect(result).toEqual({
      success: true,
      message: '部署を削除しました',
    })

    // ソフトデリート（deletedAt 設定）を確認
    expect(mockPrisma.department.update).toHaveBeenCalledWith({
      where: { id: 'dept-1' },
      data: { deletedAt: expect.any(Date) },
    })
  })
})

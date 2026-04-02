import { describe, it, expect, beforeEach, vi } from 'vitest'

vi.mock('./authMiddleware', () => ({
  requireAuth: vi.fn(),
}))

vi.mock('./prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

describe('requirePlatformAdmin', () => {
  const mockAuthContext = {
    userId: 'user-123',
    organizationId: 'org-123',
    tenantId: 'tenant-123',
    role: 'ADMIN',
  }

  const mockEvent = {} as any

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should export requirePlatformAdmin function', async () => {
    const { requirePlatformAdmin } = await import('./requirePlatformAdmin')
    expect(typeof requirePlatformAdmin).toBe('function')
  })

  it('should export PlatformAdminContext interface', async () => {
    const module = await import('./requirePlatformAdmin')
    // Interface is exported as type, so just verify the module exists
    expect(module).toBeDefined()
  })

  it('should require both auth and platform admin check', async () => {
    const { requireAuth } = await import('./authMiddleware')
    const { prisma } = await import('./prisma')
    const { requirePlatformAdmin } = await import('./requirePlatformAdmin')

    vi.mocked(requireAuth).mockResolvedValue(mockAuthContext)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      isPlatformAdmin: true,
    } as any)

    const result = await requirePlatformAdmin(mockEvent)

    expect(requireAuth).toHaveBeenCalled()
    expect(prisma.user.findUnique).toHaveBeenCalled()
  })

  it('should throw 403 when isPlatformAdmin is false', async () => {
    const { requireAuth } = await import('./authMiddleware')
    const { prisma } = await import('./prisma')
    const { requirePlatformAdmin } = await import('./requirePlatformAdmin')

    vi.mocked(requireAuth).mockResolvedValue(mockAuthContext)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      isPlatformAdmin: false,
    } as any)

    try {
      await requirePlatformAdmin(mockEvent)
      expect.fail('Should throw error')
    } catch (error: any) {
      expect(error.statusCode).toBe(403)
    }
  })

  it('should throw 403 when user not found', async () => {
    const { requireAuth } = await import('./authMiddleware')
    const { prisma } = await import('./prisma')
    const { requirePlatformAdmin } = await import('./requirePlatformAdmin')

    vi.mocked(requireAuth).mockResolvedValue(mockAuthContext)
    vi.mocked(prisma.user.findUnique).mockResolvedValue(null)

    try {
      await requirePlatformAdmin(mockEvent)
      expect.fail('Should throw error')
    } catch (error: any) {
      expect(error.statusCode).toBe(403)
    }
  })

  it('should query user by userId from auth context', async () => {
    const { requireAuth } = await import('./authMiddleware')
    const { prisma } = await import('./prisma')
    const { requirePlatformAdmin } = await import('./requirePlatformAdmin')

    vi.mocked(requireAuth).mockResolvedValue(mockAuthContext)
    vi.mocked(prisma.user.findUnique).mockResolvedValue({
      isPlatformAdmin: true,
    } as any)

    await requirePlatformAdmin(mockEvent)

    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: 'user-123' },
      select: { isPlatformAdmin: true },
    })
  })
})

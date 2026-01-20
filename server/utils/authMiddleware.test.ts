/**
 * Auth Middleware Unit Tests
 *
 * authMiddleware.ts のユニットテスト
 */

import { describe, it, expect } from 'vitest'
import { requireAdmin, requireLeader, type AuthContext } from './authMiddleware'

describe('authMiddleware', () => {
  describe('requireAdmin', () => {
    it('should pass for ADMIN role', () => {
      const authContext: AuthContext = {
        organizationId: 'org-001',
        userId: 'user-001',
        role: 'ADMIN'
      }

      expect(() => requireAdmin(authContext)).not.toThrow()
    })

    it('should pass for SUPER_ADMIN role', () => {
      const authContext: AuthContext = {
        organizationId: 'org-001',
        userId: 'user-001',
        role: 'SUPER_ADMIN'
      }

      expect(() => requireAdmin(authContext)).not.toThrow()
    })

    it('should throw 403 for MEMBER role', () => {
      const authContext: AuthContext = {
        organizationId: 'org-001',
        userId: 'user-001',
        role: 'MEMBER'
      }

      expect(() => requireAdmin(authContext)).toThrow()
    })

    it('should throw 403 for LEADER role', () => {
      const authContext: AuthContext = {
        organizationId: 'org-001',
        userId: 'user-001',
        role: 'LEADER'
      }

      expect(() => requireAdmin(authContext)).toThrow()
    })

    it('should throw 403 for MANAGER role', () => {
      const authContext: AuthContext = {
        organizationId: 'org-001',
        userId: 'user-001',
        role: 'MANAGER'
      }

      expect(() => requireAdmin(authContext)).toThrow()
    })

    it('should throw 403 for undefined role', () => {
      const authContext: AuthContext = {
        organizationId: 'org-001',
        userId: 'user-001'
      }

      expect(() => requireAdmin(authContext)).toThrow()
    })
  })

  describe('requireLeader', () => {
    it('should pass for LEADER role', () => {
      const authContext: AuthContext = {
        organizationId: 'org-001',
        userId: 'user-001',
        role: 'LEADER'
      }

      expect(() => requireLeader(authContext)).not.toThrow()
    })

    it('should pass for MANAGER role', () => {
      const authContext: AuthContext = {
        organizationId: 'org-001',
        userId: 'user-001',
        role: 'MANAGER'
      }

      expect(() => requireLeader(authContext)).not.toThrow()
    })

    it('should pass for ADMIN role', () => {
      const authContext: AuthContext = {
        organizationId: 'org-001',
        userId: 'user-001',
        role: 'ADMIN'
      }

      expect(() => requireLeader(authContext)).not.toThrow()
    })

    it('should pass for SUPER_ADMIN role', () => {
      const authContext: AuthContext = {
        organizationId: 'org-001',
        userId: 'user-001',
        role: 'SUPER_ADMIN'
      }

      expect(() => requireLeader(authContext)).not.toThrow()
    })

    it('should throw 403 for MEMBER role', () => {
      const authContext: AuthContext = {
        organizationId: 'org-001',
        userId: 'user-001',
        role: 'MEMBER'
      }

      expect(() => requireLeader(authContext)).toThrow()
    })

    it('should throw 403 for undefined role', () => {
      const authContext: AuthContext = {
        organizationId: 'org-001',
        userId: 'user-001'
      }

      expect(() => requireLeader(authContext)).toThrow()
    })
  })
})

describe('マルチテナント境界', () => {
  it('AuthContext.organizationId は必須', () => {
    // AuthContext 型で organizationId が必須であることを確認
    const validContext: AuthContext = {
      organizationId: 'org-001' // 必須
    }
    expect(validContext.organizationId).toBeDefined()
  })

  it('organizationId が空文字でも型として有効', () => {
    // TypeScript の型チェックで organizationId: string は必須
    // 空文字でも型としては valid（バリデーションは別途必要）
    const context: AuthContext = {
      organizationId: ''
    }
    expect(context.organizationId).toBe('')
  })

  it('AuthContext には userId と role がオプションで含められる', () => {
    const context: AuthContext = {
      organizationId: 'org-001',
      userId: 'user-001',
      role: 'ADMIN'
    }

    expect(context.organizationId).toBe('org-001')
    expect(context.userId).toBe('user-001')
    expect(context.role).toBe('ADMIN')
  })

  it('AuthContext には isDevice フラグが含められる', () => {
    const context: AuthContext = {
      organizationId: 'org-001',
      userId: 'device-001',
      isDevice: true
    }

    expect(context.isDevice).toBe(true)
  })
})

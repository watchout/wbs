/**
 * Auth Middleware Unit Tests
 *
 * authMiddleware.ts のユニットテスト
 */

import { describe, it, expect } from 'vitest'
import { requireAdmin, requireLeader, canEditSchedule, type AuthContext } from './authMiddleware'

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

describe('canEditSchedule - スケジュール編集権限', () => {
  describe('ADMIN権限', () => {
    it('ADMINは誰のスケジュールでも編集可能', () => {
      const result = canEditSchedule({
        authContext: { organizationId: 'org-001', userId: 'admin-001', role: 'ADMIN' },
        scheduleAuthorId: 'user-999',
        scheduleAuthorDepartmentId: 'dept-999',
        userDepartmentId: 'dept-001'
      })
      expect(result).toBe(true)
    })

    it('SUPER_ADMINは誰のスケジュールでも編集可能', () => {
      const result = canEditSchedule({
        authContext: { organizationId: 'org-001', userId: 'superadmin-001', role: 'SUPER_ADMIN' },
        scheduleAuthorId: 'user-999',
        scheduleAuthorDepartmentId: 'dept-999',
        userDepartmentId: 'dept-001'
      })
      expect(result).toBe(true)
    })
  })

  describe('LEADER権限', () => {
    it('LEADERは自分のスケジュールを編集可能', () => {
      const result = canEditSchedule({
        authContext: { organizationId: 'org-001', userId: 'leader-001', role: 'LEADER' },
        scheduleAuthorId: 'leader-001',
        scheduleAuthorDepartmentId: 'dept-001',
        userDepartmentId: 'dept-001'
      })
      expect(result).toBe(true)
    })

    it('LEADERは同部署メンバーのスケジュールを編集可能', () => {
      const result = canEditSchedule({
        authContext: { organizationId: 'org-001', userId: 'leader-001', role: 'LEADER' },
        scheduleAuthorId: 'member-001',
        scheduleAuthorDepartmentId: 'dept-001',  // 同じ部署
        userDepartmentId: 'dept-001'
      })
      expect(result).toBe(true)
    })

    it('LEADERは他部署メンバーのスケジュールを編集不可', () => {
      const result = canEditSchedule({
        authContext: { organizationId: 'org-001', userId: 'leader-001', role: 'LEADER' },
        scheduleAuthorId: 'member-999',
        scheduleAuthorDepartmentId: 'dept-999',  // 異なる部署
        userDepartmentId: 'dept-001'
      })
      expect(result).toBe(false)
    })

    it('LEADERでも部署未所属の場合は他人のスケジュールを編集不可', () => {
      const result = canEditSchedule({
        authContext: { organizationId: 'org-001', userId: 'leader-001', role: 'LEADER' },
        scheduleAuthorId: 'member-001',
        scheduleAuthorDepartmentId: 'dept-001',
        userDepartmentId: null  // 部署未所属
      })
      expect(result).toBe(false)
    })
  })

  describe('MEMBER権限', () => {
    it('MEMBERは自分のスケジュールを編集可能', () => {
      const result = canEditSchedule({
        authContext: { organizationId: 'org-001', userId: 'member-001', role: 'MEMBER' },
        scheduleAuthorId: 'member-001',
        scheduleAuthorDepartmentId: 'dept-001',
        userDepartmentId: 'dept-001'
      })
      expect(result).toBe(true)
    })

    it('MEMBERは他人のスケジュールを編集不可（同部署でも）', () => {
      const result = canEditSchedule({
        authContext: { organizationId: 'org-001', userId: 'member-001', role: 'MEMBER' },
        scheduleAuthorId: 'member-002',
        scheduleAuthorDepartmentId: 'dept-001',  // 同じ部署
        userDepartmentId: 'dept-001'
      })
      expect(result).toBe(false)
    })

    it('MEMBERは他部署のスケジュールを編集不可', () => {
      const result = canEditSchedule({
        authContext: { organizationId: 'org-001', userId: 'member-001', role: 'MEMBER' },
        scheduleAuthorId: 'member-999',
        scheduleAuthorDepartmentId: 'dept-999',
        userDepartmentId: 'dept-001'
      })
      expect(result).toBe(false)
    })
  })

  describe('authorIdがnullのスケジュール', () => {
    it('ADMINはauthorIdがnullのスケジュールを編集可能', () => {
      const result = canEditSchedule({
        authContext: { organizationId: 'org-001', userId: 'admin-001', role: 'ADMIN' },
        scheduleAuthorId: null,
        scheduleAuthorDepartmentId: null,
        userDepartmentId: 'dept-001'
      })
      expect(result).toBe(true)
    })

    it('MEMBERはauthorIdがnullのスケジュールを編集不可', () => {
      const result = canEditSchedule({
        authContext: { organizationId: 'org-001', userId: 'member-001', role: 'MEMBER' },
        scheduleAuthorId: null,
        scheduleAuthorDepartmentId: null,
        userDepartmentId: 'dept-001'
      })
      expect(result).toBe(false)
    })
  })
})

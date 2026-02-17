/**
 * フロントエンド権限チェック Composable（ROLE-003）
 *
 * バックエンドの authMiddleware.ts と同一ロジックでUI表示制御
 * ロール: ADMIN > LEADER > MEMBER
 */

import { computed } from 'vue'

export type UserRole = 'ADMIN' | 'LEADER' | 'MEMBER' | 'DEVICE'

interface UsePermissionsOptions {
  role: UserRole | string | null
  userId?: string | null
  departmentId?: string | null
}

export function usePermissions(options: UsePermissionsOptions) {
  const role = computed(() => (options.role || 'MEMBER') as UserRole)
  const userId = computed(() => options.userId || null)
  const departmentId = computed(() => options.departmentId || null)

  /** ADMIN権限を持っているか */
  const isAdmin = computed(() => role.value === 'ADMIN')

  /** LEADER以上の権限を持っているか */
  const isLeaderOrAbove = computed(() =>
    role.value === 'ADMIN' || role.value === 'LEADER'
  )

  /** デバイスセッションか */
  const isDevice = computed(() => role.value === 'DEVICE')

  /**
   * ユーザー管理が可能か（ADMIN のみ）
   */
  const canManageUsers = computed(() => isAdmin.value)

  /**
   * 部署管理が可能か（ADMIN のみ）
   */
  const canManageDepartments = computed(() => isAdmin.value)

  /**
   * 組織設定を変更できるか（ADMIN のみ）
   */
  const canManageSettings = computed(() => isAdmin.value)

  /**
   * スケジュール編集が可能か
   * - ADMIN: 全スケジュール
   * - LEADER: 同部署のスケジュール + 自分のスケジュール
   * - MEMBER: 自分のスケジュールのみ
   */
  function canEditSchedule(schedule: {
    authorId?: string | null
    authorDepartmentId?: string | null
  }): boolean {
    if (isAdmin.value) return true

    // 自分のスケジュール
    if (schedule.authorId === userId.value) return true

    // LEADER は同部署のスケジュール
    if (role.value === 'LEADER' && departmentId.value && schedule.authorDepartmentId === departmentId.value) {
      return true
    }

    return false
  }

  /**
   * スケジュール削除が可能か（編集と同じロジック）
   */
  function canDeleteSchedule(schedule: {
    authorId?: string | null
    authorDepartmentId?: string | null
  }): boolean {
    return canEditSchedule(schedule)
  }

  /**
   * 管理者ダッシュボードにアクセスできるか
   */
  const canAccessAdminDashboard = computed(() => isAdmin.value)

  /**
   * 操作ログを閲覧できるか（ADMIN のみ）
   */
  const canViewAuditLog = computed(() => isAdmin.value)

  /**
   * LLM設定を変更できるか（ADMIN のみ）
   */
  const canManageLlmSettings = computed(() => isAdmin.value)

  return {
    role,
    isAdmin,
    isLeaderOrAbove,
    isDevice,
    canManageUsers,
    canManageDepartments,
    canManageSettings,
    canEditSchedule,
    canDeleteSchedule,
    canAccessAdminDashboard,
    canViewAuditLog,
    canManageLlmSettings,
  }
}

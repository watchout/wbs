/**
 * 認証情報 composable
 *
 * GET /api/auth/me からログインユーザーの情報を取得し、
 * role / userId / departmentId をクライアント側で保持する。
 * スケジュール編集権限の判定ロジック（canEditScheduleFor）も提供。
 */

interface AuthUser {
  id: string
  name: string | null
  email: string
  role: string
  isPlatformAdmin?: boolean
  department?: {
    id: string
    name: string
  } | null
}

interface AuthState {
  user: AuthUser | null
  organizationId: string | null
  isAuthenticated: boolean
  isDevice: boolean
  loading: boolean
}

// グローバルにシングルトンとして保持（Nuxt の useState で SSR 対応）
const authState = () => useState<AuthState>('auth', () => ({
  user: null,
  organizationId: null,
  isAuthenticated: false,
  isDevice: false,
  loading: false
}))

export function useAuth() {
  const state = authState()

  /** /api/auth/me を呼んで認証情報を取得・更新 */
  async function fetchMe(): Promise<void> {
    state.value = { ...state.value, loading: true }
    try {
      const res = await $fetch<{
        success: boolean
        user: AuthUser | null
        organization: { id: string; name: string } | null
        isAuthenticated: boolean
        isDevice: boolean
      }>('/api/auth/me')

      state.value = {
        user: res.user,
        organizationId: res.organization?.id ?? null,
        isAuthenticated: res.isAuthenticated,
        isDevice: res.isDevice,
        loading: false
      }
    } catch {
      state.value = {
        user: null,
        organizationId: null,
        isAuthenticated: false,
        isDevice: false,
        loading: false
      }
    }
  }

  /** ログイン後にレスポンスから直接セット（追加APIコール不要） */
  function setFromLogin(loginResponse: {
    user: { id: string; name: string | null; email: string; role: string; isPlatformAdmin: boolean }
    organization: { id: string; name: string; slug: string }
  }): void {
    state.value = {
      user: {
        id: loginResponse.user.id,
        name: loginResponse.user.name,
        email: loginResponse.user.email,
        role: loginResponse.user.role,
        isPlatformAdmin: loginResponse.user.isPlatformAdmin,
        department: null // ログインレスポンスには含まれない。必要時に fetchMe で取得
      },
      organizationId: loginResponse.organization.id,
      isAuthenticated: true,
      isDevice: false,
      loading: false
    }
  }

  /** 認証状態をクリア（ログアウト時） */
  function clear(): void {
    state.value = {
      user: null,
      organizationId: null,
      isAuthenticated: false,
      isDevice: false,
      loading: false
    }
  }

  /**
   * 対象ユーザーのスケジュールを編集できるか判定
   * （サーバー側 canEditSchedule と同一ロジック）
   *
   * @param targetUserId      操作対象のユーザーID
   * @param targetDepartmentId 操作対象の部署ID
   */
  function canEditScheduleFor(targetUserId: string, targetDepartmentId: string | null): boolean {
    const user = state.value.user
    if (!user) return false

    // ADMIN は全員操作可能
    if (user.role === 'ADMIN') return true

    // 自分自身なら操作可能
    if (targetUserId === user.id) return true

    // LEADER は同部署のメンバーを操作可能
    if (user.role === 'LEADER' && user.department?.id) {
      if (targetDepartmentId === user.department.id) return true
    }

    return false
  }

  return {
    /** リアクティブな認証状態 */
    state: computed(() => state.value),
    /** 現在のユーザー */
    user: computed(() => state.value.user),
    /** ロール */
    role: computed(() => state.value.user?.role ?? null),
    /** 認証済みか */
    isAuthenticated: computed(() => state.value.isAuthenticated),
    /** ローディング中か */
    loading: computed(() => state.value.loading),

    fetchMe,
    setFromLogin,
    clear,
    canEditScheduleFor
  }
}

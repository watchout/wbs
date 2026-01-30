/**
 * 認証チェック middleware
 *
 * 認証が必要なページに適用。
 * 未認証・セッション切れ → /login へリダイレクト
 */

export default defineNuxtRouteMiddleware(async (to) => {
  // サーバーサイドではスキップ（クライアントサイドで処理）
  if (import.meta.server) return

  try {
    const response = await $fetch<{ isAuthenticated: boolean }>('/api/auth/me')

    if (!response.isAuthenticated) {
      // リダイレクト先をクエリパラメータに保存
      const redirectPath = to.fullPath
      return navigateTo(`/login?redirect=${encodeURIComponent(redirectPath)}`)
    }
  } catch {
    // API エラー（セッション切れ等）→ ログインへ
    const redirectPath = to.fullPath
    return navigateTo(`/login?redirect=${encodeURIComponent(redirectPath)}`)
  }
})

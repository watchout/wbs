/**
 * プラットフォーム管理者権限チェック middleware
 *
 * pages/platform/ 配下のページに適用。
 * 未認証 → /login へリダイレクト
 * isPlatformAdmin !== true → / へリダイレクト
 */

export default defineNuxtRouteMiddleware(async () => {
  const { data } = await useFetch('/api/auth/me')

  if (!data.value?.isAuthenticated) {
    return navigateTo('/login')
  }

  if (data.value.user?.isPlatformAdmin !== true) {
    return navigateTo('/')
  }
})

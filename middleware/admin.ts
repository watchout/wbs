/**
 * Admin権限チェック middleware
 *
 * pages/admin/ 配下のページに適用。
 * 未認証 → /login へリダイレクト
 * ADMIN以外 → / へリダイレクト
 */

export default defineNuxtRouteMiddleware(async () => {
  const { data } = await useFetch('/api/auth/me')

  if (!data.value?.isAuthenticated) {
    return navigateTo('/login')
  }

  if (data.value.user?.role !== 'ADMIN' && data.value.user?.role !== 'SUPER_ADMIN') {
    return navigateTo('/')
  }
})

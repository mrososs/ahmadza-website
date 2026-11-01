/** Guards every /admin route except the login page. RLS remains the real enforcement; this is UX. */
export default defineNuxtRouteMiddleware(async (to) => {
  if (import.meta.server) return
  const { restore } = useAdminSession()
  const profile = await restore()
  const isLogin = to.path === '/admin/login'
  // Recovery pages must be reachable without an admin session: the reset page creates one from the emailed code.
  const isRecovery = to.path === '/admin/forgot-password' || to.path === '/admin/reset-password'

  if (!profile && !isLogin && !isRecovery) {
    return navigateTo({ path: '/admin/login', query: to.fullPath === '/admin' ? {} : { redirect: to.fullPath } })
  }
  if (profile && isLogin) return navigateTo('/admin')
})

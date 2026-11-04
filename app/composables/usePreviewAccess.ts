/**
 * The bridge between the admin session (Supabase, in this browser) and the preview session the site's own server keeps in an
 * HttpOnly cookie. The server asks the database whether the access token belongs to an active admin; nothing here grants
 * anything by itself, and the cookie cannot be read or forged from the page.
 */
export function usePreviewAccess() {
  const { push } = useAdminNotice()
  const opening = shallowRef(false)

  /** Starts (or renews) the preview session. Resolves false when there is no admin session or the server declined. */
  async function sync(): Promise<boolean> {
    const { backend } = await useAdminBackend()
    const accessToken = await backend?.auth.accessToken()
    if (!accessToken) return false
    try {
      await $fetch('/api/preview/session', { method: 'POST', headers: { authorization: `Bearer ${accessToken}` } })
      return true
    }
    catch (cause) {
      console.warn('[admin] the preview session could not be started', cause)
      return false
    }
  }

  /** Ends the preview session (sign-out). Never throws: the server clears the cookie even when the database is unreachable. */
  async function end(): Promise<void> {
    try {
      await $fetch('/api/preview/session', { method: 'DELETE' })
    }
    catch (cause) {
      console.warn('[admin] the preview session could not be ended', cause)
    }
  }

  /** Opens the real site in a new tab with a fresh preview session. Call it straight from a click handler. */
  async function openSite(): Promise<void> {
    if (opening.value) return
    opening.value = true
    // The tab opens inside the click, so pop-up blockers allow it; it is pointed at the site once the session exists.
    const tab = window.open('about:blank', '_blank')
    try {
      const { mode } = await useAdminBackend()
      const ready = await sync()
      if (mode === 'supabase' && !ready) {
        tab?.close()
        push('error', 'تعذر تفعيل معاينة الموقع. تحقق من الاتصال أو سجّل الدخول من جديد.')
        return
      }
      if (tab) {
        tab.opener = null
        tab.location.href = '/'
      }
      else {
        window.location.assign('/')
      }
    }
    finally {
      opening.value = false
    }
  }

  return { sync, end, openSite, opening }
}

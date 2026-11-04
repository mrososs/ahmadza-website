import type { AdminProfile } from '~/types/admin'
import type { AdminMode } from '~/composables/useAdminBackend'
import { AdminError } from '~/repositories/admin/admin-repository'

export function useAdminSession() {
  const profile = useState<AdminProfile | null>('admin-profile', () => null)
  const checked = useState('admin-session-checked', () => false)
  const mode = useState<AdminMode>('admin-mode', () => 'unconfigured')
  const preview = usePreviewAccess()

  async function restore(): Promise<AdminProfile | null> {
    const resolved = await useAdminBackend()
    mode.value = resolved.mode
    if (!resolved.backend) return null
    if (!checked.value) {
      try {
        profile.value = await resolved.backend.auth.restore()
        // A returning admin gets a fresh preview session without having to sign in again. Best effort: the console works without it.
        if (profile.value && resolved.mode === 'supabase') void preview.sync()
      }
      catch (cause) {
        console.error('[admin] session restore failed', cause)
        profile.value = null
      }
      checked.value = true
    }
    return profile.value
  }

  async function signIn(email: string, password: string): Promise<AdminProfile> {
    const { backend } = await useAdminBackend()
    if (!backend) throw new AdminError('لوحة التحكم غير مهيأة بعد.')
    profile.value = await backend.auth.signIn(email, password)
    checked.value = true
    await preview.sync()
    return profile.value
  }

  async function signOut(): Promise<void> {
    const { backend } = await useAdminBackend()
    // Revoke the preview session first: signing out must also take the unpublished site away from this browser.
    await preview.end()
    await backend?.auth.signOut()
    profile.value = null
  }

  async function requestPasswordReset(email: string): Promise<void> {
    const { backend } = await useAdminBackend()
    if (!backend) throw new AdminError('لوحة التحكم غير مهيأة بعد.')
    await backend.auth.requestPasswordReset(email, `${window.location.origin}/admin/reset-password`)
  }

  async function completeRecovery(code: string | null): Promise<boolean> {
    const { backend } = await useAdminBackend()
    if (!backend) return false
    return backend.auth.completeRecovery(code)
  }

  async function updatePassword(password: string): Promise<AdminProfile> {
    const { backend } = await useAdminBackend()
    if (!backend) throw new AdminError('لوحة التحكم غير مهيأة بعد.')
    profile.value = await backend.auth.updatePassword(password)
    checked.value = true
    await preview.sync()
    return profile.value
  }

  return { profile, mode, preview, restore, signIn, signOut, requestPasswordReset, completeRecovery, updatePassword }
}

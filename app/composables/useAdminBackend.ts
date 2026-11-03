import type { AdminBackend } from '~/repositories/admin/admin-repository'

export type AdminMode = 'supabase' | 'demo' | 'unconfigured'

interface ResolvedBackend {
  mode: AdminMode
  backend: AdminBackend | null
}

let resolved: Promise<ResolvedBackend> | undefined

/**
 * Lazily picks the admin data source. Supabase and the demo sandbox are dynamic imports so
 * none of this code ships with public pages. The demo sandbox exists only in dev builds.
 */
export function useAdminBackend(): Promise<ResolvedBackend> {
  resolved ??= (async (): Promise<ResolvedBackend> => {
    const { supabaseUrl, supabasePublishableKey, videoMaxMb } = useRuntimeConfig().public
    if (supabaseUrl && supabasePublishableKey) {
      const { createSupabaseAdminBackend } = await import('~/repositories/admin/supabase-admin')
      return { mode: 'supabase', backend: createSupabaseAdminBackend(supabaseUrl, supabasePublishableKey, videoMaxMb) }
    }
    if (import.meta.dev) {
      const { createDemoAdminBackend } = await import('~/repositories/admin/demo-admin')
      return { mode: 'demo', backend: createDemoAdminBackend() }
    }
    return { mode: 'unconfigured', backend: null }
  })()
  return resolved
}

/** Repository for pages that run behind the auth middleware, where a backend is guaranteed. */
export async function useAdminRepository() {
  const { backend } = await useAdminBackend()
  if (!backend) throw createError({ statusCode: 503, statusMessage: 'لوحة التحكم غير مهيأة' })
  return backend.repository
}

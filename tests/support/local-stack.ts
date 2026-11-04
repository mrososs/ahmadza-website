import { expect, type APIRequestContext } from '@playwright/test'

// Shared by the suites that need a real (local) Supabase: Auth, PostgREST row-level security and Storage. They accept the
// LOCAL_SUPABASE_* names and, for the branding suite that predates them, BRANDING_SUPABASE_*.
const env = (name: 'URL' | 'KEY' | 'SECRET_KEY') => process.env[`LOCAL_SUPABASE_${name}`] ?? process.env[`BRANDING_SUPABASE_${name}`] ?? ''

export const supabaseUrl = env('URL')
export const publishableKey = env('KEY')
const secretKey = env('SECRET_KEY')

export const configured = Boolean(supabaseUrl && publishableKey && secretKey)

export interface TestAccount { email: string; password: string; displayName: string; role: 'owner' | 'editor' | null }

export const owner: TestAccount = { email: 'brand-owner@example.test', password: 'Owner-pass-123456', displayName: 'مالك الاختبار', role: 'owner' }
export const editor: TestAccount = { email: 'brand-editor@example.test', password: 'Editor-pass-123456', displayName: 'محرر الاختبار', role: 'editor' }
/** A real signed-in user with no admin profile: must never be treated as an admin. */
export const outsider: TestAccount = { email: 'plain-user@example.test', password: 'Plain-pass-123456', displayName: 'مستخدم عادي', role: null }

export function assertLocal() {
  const host = new URL(supabaseUrl).hostname
  // These tests write; they must never be pointed at a hosted project.
  if (host !== '127.0.0.1' && host !== 'localhost') throw new Error(`Refusing to run against ${host}: local Supabase only.`)
}

export const serviceHeaders = () => ({ apikey: secretKey, authorization: `Bearer ${secretKey}`, 'content-type': 'application/json' })
export const anonHeaders = () => ({ apikey: publishableKey, authorization: `Bearer ${publishableKey}` })
export const userHeaders = (token: string) => ({ apikey: publishableKey, authorization: `Bearer ${token}` })

/** Creates (or re-creates) a confirmed user and, for admins, an active profile of the given role. Local stack only. */
export async function seedAdmin(request: APIRequestContext, account: TestAccount): Promise<string> {
  assertLocal()
  const created = await request.post(`${supabaseUrl}/auth/v1/admin/users`, { headers: serviceHeaders(), data: { email: account.email, password: account.password, email_confirm: true } })
  let id: string | undefined
  if (created.ok()) {
    id = ((await created.json()) as { id: string }).id
  }
  else {
    const list = await request.get(`${supabaseUrl}/auth/v1/admin/users?per_page=200`, { headers: serviceHeaders() })
    const existing = ((await list.json()) as { users: Array<{ id: string; email: string }> }).users.find(user => user.email === account.email)
    if (!existing) throw new Error(`Could not create ${account.email}`)
    id = existing.id
    await request.put(`${supabaseUrl}/auth/v1/admin/users/${id}`, { headers: serviceHeaders(), data: { password: account.password } })
  }
  if (account.role) {
    const profile = await request.post(`${supabaseUrl}/rest/v1/admin_profiles?on_conflict=user_id`, {
      headers: { ...serviceHeaders(), prefer: 'resolution=merge-duplicates,return=minimal' },
      data: { user_id: id, role: account.role, display_name: account.displayName, active: true },
    })
    if (!profile.ok()) throw new Error(`Could not create the profile for ${account.email}: ${profile.status()}`)
  }
  return id
}

export async function signInToken(request: APIRequestContext, account: TestAccount): Promise<string> {
  const response = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, { headers: { apikey: publishableKey, 'content-type': 'application/json' }, data: { email: account.email, password: account.password } })
  return ((await response.json()) as { access_token: string }).access_token
}

/** Sets the publication state directly with the service key (what the owner's switch does through RLS). Local stack only. */
export async function setPublicationState(request: APIRequestContext, mode: 'maintenance' | 'published' | null) {
  assertLocal()
  if (mode === null) {
    await request.delete(`${supabaseUrl}/rest/v1/site_settings?key=eq.site.publication`, { headers: serviceHeaders() })
    return
  }
  const response = await request.post(`${supabaseUrl}/rest/v1/site_settings?on_conflict=key`, {
    headers: { ...serviceHeaders(), prefer: 'resolution=merge-duplicates,return=minimal' },
    data: { key: 'site.publication', value: { mode }, public_readable: true },
  })
  if (!response.ok()) throw new Error(`Could not set the publication state: ${response.status()} ${await response.text()}`)
}

/**
 * After publishing with the service key, wait until the running site really serves the public. A launch reaches the server within a
 * few seconds (it caches the state for that long on purpose), so a test that reads the site straight away would see the old state.
 */
export async function waitUntilPublic(request: APIRequestContext) {
  await expect.poll(async () => (await request.get('/api/content?limit=1')).status(), { timeout: 20_000, intervals: [250, 500, 1000] }).toBe(200)
}

export async function readPublicationRow(request: APIRequestContext): Promise<Array<{ value: { mode: string }; updated_by: string | null }>> {
  const response = await request.get(`${supabaseUrl}/rest/v1/site_settings?select=value,updated_by&key=eq.site.publication`, { headers: serviceHeaders() })
  return await response.json()
}

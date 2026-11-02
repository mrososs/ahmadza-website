import type { APIRequestContext } from '@playwright/test'

export const supabaseUrl = process.env.BRANDING_SUPABASE_URL ?? ''
export const publishableKey = process.env.BRANDING_SUPABASE_KEY ?? ''
const secretKey = process.env.BRANDING_SUPABASE_SECRET_KEY ?? ''

export const configured = Boolean(supabaseUrl && publishableKey && secretKey)

export const owner = { email: 'brand-owner@example.test', password: 'Owner-pass-123456', displayName: 'مالك الاختبار', role: 'owner' }
export const editor = { email: 'brand-editor@example.test', password: 'Editor-pass-123456', displayName: 'محرر الاختبار', role: 'editor' }

function assertLocal() {
  const host = new URL(supabaseUrl).hostname
  // These tests write; they must never be pointed at a hosted project.
  if (host !== '127.0.0.1' && host !== 'localhost') throw new Error(`Refusing to run branding tests against ${host}: local Supabase only.`)
}

const secretHeaders = () => ({ apikey: secretKey, authorization: `Bearer ${secretKey}`, 'content-type': 'application/json' })

/** Creates (or re-creates) a confirmed user with an admin profile of the given role. Local stack only. */
export async function seedAdmin(request: APIRequestContext, account: typeof owner) {
  assertLocal()
  const created = await request.post(`${supabaseUrl}/auth/v1/admin/users`, { headers: secretHeaders(), data: { email: account.email, password: account.password, email_confirm: true } })
  let id: string | undefined
  if (created.ok()) {
    id = ((await created.json()) as { id: string }).id
  }
  else {
    const list = await request.get(`${supabaseUrl}/auth/v1/admin/users?per_page=200`, { headers: secretHeaders() })
    const existing = ((await list.json()) as { users: Array<{ id: string; email: string }> }).users.find(user => user.email === account.email)
    if (!existing) throw new Error(`Could not create ${account.email}`)
    id = existing.id
    await request.put(`${supabaseUrl}/auth/v1/admin/users/${id}`, { headers: secretHeaders(), data: { password: account.password } })
  }
  const profile = await request.post(`${supabaseUrl}/rest/v1/admin_profiles?on_conflict=user_id`, {
    headers: { ...secretHeaders(), prefer: 'resolution=merge-duplicates,return=minimal' },
    data: { user_id: id, role: account.role, display_name: account.displayName, active: true },
  })
  if (!profile.ok()) throw new Error(`Could not create the profile for ${account.email}: ${profile.status()}`)
}

/** Removes any branding left by an earlier run so every run starts from the bundled artwork. */
export async function clearBranding(request: APIRequestContext) {
  assertLocal()
  await request.delete(`${supabaseUrl}/rest/v1/site_settings?key=in.(branding.header_logo,branding.hero_image)`, { headers: secretHeaders() })
}

export async function signInToken(request: APIRequestContext, account: typeof owner): Promise<string> {
  const response = await request.post(`${supabaseUrl}/auth/v1/token?grant_type=password`, { headers: { apikey: publishableKey, 'content-type': 'application/json' }, data: { email: account.email, password: account.password } })
  return ((await response.json()) as { access_token: string }).access_token
}

export const anonHeaders = () => ({ apikey: publishableKey, authorization: `Bearer ${publishableKey}` })
export const userHeaders = (token: string) => ({ apikey: publishableKey, authorization: `Bearer ${token}` })

export async function settingRows(request: APIRequestContext) {
  const response = await request.get(`${supabaseUrl}/rest/v1/site_settings?select=key,value,updated_by,updated_at&key=like.branding.*`, { headers: secretHeaders() })
  return (await response.json()) as Array<{ key: string; value: { url: string; storagePath: string }; updated_by: string | null }>
}

/** Seeds a valid branding row with the service key (bypassing RLS) so tests can try to tamper with an existing one. */
export async function insertBrandingRow(request: APIRequestContext, key: 'branding.header_logo' | 'branding.hero_image', storagePath: string) {
  assertLocal()
  const value = { url: `${supabaseUrl}/storage/v1/object/public/site-branding/${storagePath}`, storagePath, alt: 'seed', width: 800, height: 600 }
  const response = await request.post(`${supabaseUrl}/rest/v1/site_settings`, { headers: secretHeaders(), data: { key, value, public_readable: true } })
  if (!response.ok()) throw new Error(`Could not seed ${key}: ${response.status()}`)
}

/** Row-level security either errors or silently matches zero rows; both mean the change did not happen. */
export async function expectNoRowsAffected(response: import('@playwright/test').APIResponse) {
  if (response.status() >= 400) return true
  const body: unknown = await response.json().catch(() => [])
  return Array.isArray(body) && body.length === 0
}

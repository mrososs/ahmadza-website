import type { APIRequestContext } from '@playwright/test'
import { assertLocal, serviceHeaders, supabaseUrl } from '../support/local-stack'

// The shared local-stack helpers (accounts, sign-in, headers) live in tests/support/local-stack.ts.
export { anonHeaders, configured, editor, owner, publishableKey, seedAdmin, serviceHeaders, setPublicationState, signInToken, supabaseUrl, userHeaders, waitUntilPublic } from '../support/local-stack'

/** Removes any branding left by an earlier run so every run starts from the bundled artwork. */
export async function clearBranding(request: APIRequestContext) {
  assertLocal()
  await request.delete(`${supabaseUrl}/rest/v1/site_settings?key=in.(branding.header_logo,branding.hero_image)`, { headers: serviceHeaders() })
}

export async function settingRows(request: APIRequestContext) {
  const response = await request.get(`${supabaseUrl}/rest/v1/site_settings?select=key,value,updated_by,updated_at&key=like.branding.*`, { headers: serviceHeaders() })
  return (await response.json()) as Array<{ key: string; value: { url: string; storagePath: string }; updated_by: string | null }>
}

/** Seeds a valid branding row with the service key (bypassing RLS) so tests can try to tamper with an existing one. */
export async function insertBrandingRow(request: APIRequestContext, key: 'branding.header_logo' | 'branding.hero_image', storagePath: string) {
  assertLocal()
  const value = { url: `${supabaseUrl}/storage/v1/object/public/site-branding/${storagePath}`, storagePath, alt: 'seed', width: 800, height: 600 }
  const response = await request.post(`${supabaseUrl}/rest/v1/site_settings`, { headers: serviceHeaders(), data: { key, value, public_readable: true } })
  if (!response.ok()) throw new Error(`Could not seed ${key}: ${response.status()}`)
}

/** Row-level security either errors or silently matches zero rows; both mean the change did not happen. */
export async function expectNoRowsAffected(response: import('@playwright/test').APIResponse) {
  if (response.status() >= 400) return true
  const body: unknown = await response.json().catch(() => [])
  return Array.isArray(body) && body.length === 0
}

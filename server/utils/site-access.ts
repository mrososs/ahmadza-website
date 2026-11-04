import type { H3Event } from 'h3'
import type { PublicationMode, SiteAccess } from '~/types/publication'

/** Matches `expires_at` in `start_preview_session()`. The database is the authority; this only bounds the cookie. */
export const previewSessionSeconds = 12 * 60 * 60

// A launch or a return to maintenance reaches every server instance within these windows.
const PUBLICATION_TTL_MS = 5_000
const PUBLICATION_ERROR_TTL_MS = 2_000
const PREVIEW_VALID_TTL_MS = 10_000
const PREVIEW_INVALID_TTL_MS = 5_000
const PREVIEW_CACHE_LIMIT = 200

const tokenShape = /^[0-9a-f]{64}$/

let publicationCache: { mode: PublicationMode; expiresAt: number } | undefined
let publicationRequest: Promise<PublicationMode> | undefined
const previewCache = new Map<string, { valid: boolean; expiresAt: number }>()

/**
 * Whether the public may see the site. Fails closed: if the state cannot be read for any reason (database down, row
 * missing, configuration absent) the answer is "maintenance". Concurrent requests share one lookup.
 */
export function readPublicationMode(): Promise<PublicationMode> {
  if (publicationCache && publicationCache.expiresAt > Date.now()) return Promise.resolve(publicationCache.mode)

  publicationRequest ??= (async (): Promise<PublicationMode> => {
    try {
      const mode = await getContentRepository().getPublication()
      publicationCache = { mode, expiresAt: Date.now() + PUBLICATION_TTL_MS }
      return mode
    }
    catch (cause) {
      console.error('[site-access] cannot read the publication state; treating the site as in maintenance', cause)
      publicationCache = { mode: 'maintenance', expiresAt: Date.now() + PUBLICATION_ERROR_TTL_MS }
      return 'maintenance'
    }
    finally {
      publicationRequest = undefined
    }
  })()
  return publicationRequest
}

async function isPreviewTokenValid(token: string): Promise<boolean> {
  // The shape check keeps arbitrary cookie values away from the database and out of the cache.
  if (!tokenShape.test(token)) return false

  const cached = previewCache.get(token)
  if (cached && cached.expiresAt > Date.now()) return cached.valid

  let valid = false
  try {
    valid = await getContentRepository().verifyPreviewToken(token)
  }
  catch (cause) {
    console.error('[site-access] cannot verify the preview session; treating it as invalid', cause)
  }

  if (previewCache.size >= PREVIEW_CACHE_LIMIT) previewCache.clear()
  previewCache.set(token, { valid, expiresAt: Date.now() + (valid ? PREVIEW_VALID_TTL_MS : PREVIEW_INVALID_TTL_MS) })
  return valid
}

export function forgetPreviewToken(token: string): void {
  previewCache.delete(token)
}

const isSecureRequest = (event: H3Event) => getRequestProtocol(event, { xForwardedProto: true }) === 'https'

/** `__Host-` pins the cookie to this exact host over HTTPS (no Domain, so no sibling subdomain can set it). Plain HTTP only happens in local development. */
export const previewCookieName = (event: H3Event) => isSecureRequest(event) ? '__Host-ahmadza-preview' : 'ahmadza-preview'

export function readPreviewToken(event: H3Event): string | undefined {
  return getCookie(event, previewCookieName(event)) || undefined
}

const previewCookieOptions = (event: H3Event) => ({ httpOnly: true, secure: isSecureRequest(event), sameSite: 'lax' as const, path: '/' })

export function setPreviewCookie(event: H3Event, token: string): void {
  setCookie(event, previewCookieName(event), token, { ...previewCookieOptions(event), maxAge: previewSessionSeconds })
}

export function clearPreviewCookie(event: H3Event): void {
  deleteCookie(event, previewCookieName(event), previewCookieOptions(event))
}

/**
 * The one access decision for a request, made once and kept on the event. A preview only counts while the site is in
 * maintenance and the database has just confirmed the token; the verified token is then handed to the content repository.
 */
export async function resolveSiteAccess(event: H3Event): Promise<SiteAccess> {
  if (event.context.siteAccess) return event.context.siteAccess

  const mode = await readPublicationMode()
  let preview = false
  if (mode === 'maintenance') {
    const token = readPreviewToken(event)
    if (token && await isPreviewTokenValid(token)) {
      preview = true
      event.context.previewToken = token
    }
  }

  const access: SiteAccess = { mode, preview }
  event.context.siteAccess = access
  return access
}

import type { H3Event } from 'h3'
import type { SiteRequestKind } from '../utils/site-access-paths'

// Hidden responses must never be stored by a browser, proxy or the CDN, or a launch would not take effect for them.
const privateHeaders = { 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow, noarchive', 'vary': 'Cookie' }
const maintenanceHeaders = { 'cache-control': 'no-store, max-age=0', 'retry-after': '3600', 'x-robots-tag': 'noindex, nofollow, noarchive', 'x-content-type-options': 'nosniff' }

/** Preview deployments (never the production one) are for the team: keep them out of search results whatever the site state. */
function keepPreviewDeploymentsOutOfSearch(event: H3Event) {
  if (process.env.VERCEL_ENV === 'preview') setResponseHeader(event, 'x-robots-tag', 'noindex, nofollow')
}

async function respondMaintenance(event: H3Event, kind: Exclude<SiteRequestKind, 'open'>) {
  setResponseStatus(event, 503, 'Service Unavailable')
  setResponseHeaders(event, maintenanceHeaders)

  if (kind === 'api') {
    setResponseHeader(event, 'content-type', 'application/json; charset=utf-8')
    return { statusCode: 503, statusMessage: 'الموقع قيد التجهيز' }
  }
  if (kind === 'file') {
    setResponseHeader(event, 'content-type', 'text/plain; charset=utf-8')
    return 'Service Unavailable'
  }

  // Every gated page answers identically, so a visitor cannot tell a real article address from a made-up one.
  const logo = await comingSoonLogo()
  setResponseHeaders(event, comingSoonHeaders(logo))
  return renderComingSoonPage(logo)
}

/**
 * The maintenance gate. It runs on the server before any page, API or file is produced, so there is nothing to flash, no
 * client route to bypass and no query parameter to guess: while the site is in maintenance only a request whose preview
 * session the database confirms (see `resolveSiteAccess`) reaches the real site; everyone else gets the coming-soon page.
 */
export default defineEventHandler(async (event) => {
  const kind = classifySiteRequest(event.path, { dev: import.meta.dev })
  if (kind === 'open') {
    keepPreviewDeploymentsOutOfSearch(event)
    return
  }

  const access = await resolveSiteAccess(event)
  if (access.mode === 'published') {
    keepPreviewDeploymentsOutOfSearch(event)
    return
  }
  if (access.preview) {
    setResponseHeaders(event, privateHeaders)
    return
  }
  return respondMaintenance(event, kind)
})

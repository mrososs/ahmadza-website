import type { H3Event } from 'h3'
import { LocalContentRepository } from '~/repositories/local-content-repository'
import { SupabaseContentRepository } from '~/repositories/supabase-content-repository'
import type { ContentRepository } from '~/repositories/content-repository'
import type { PublicationMode } from '~/types/publication'

let repository: ContentRepository | undefined

/**
 * The demo repository only exists outside a real production deployment. Any deployment on Vercel keeps it hidden (it is
 * labelled demo content, but a preview URL must not become a public demo site); a local run is open so development and the
 * demo e2e suite work. `NUXT_SITE_ACCESS_DEMO_MODE=maintenance` forces maintenance for tests; nothing can force "published".
 */
function demoPublication(): PublicationMode {
  if (useRuntimeConfig().siteAccessDemoMode === 'maintenance') return 'maintenance'
  return process.env.VERCEL ? 'maintenance' : 'published'
}

function baseRepository(): ContentRepository {
  if (repository) return repository

  const config = useRuntimeConfig()
  // The publishable key is the same one the admin console uses in the browser, so the public site accepts
  // either the server-only pair or the public pair; deployments only have to configure one of them.
  const url = config.supabaseUrl || config.public.supabaseUrl
  const key = config.supabasePublishableKey || config.public.supabasePublishableKey

  if (url && key) {
    repository = new SupabaseContentRepository(url, key)
    return repository
  }

  // A real production deployment must never silently serve the bundled demo content.
  if (process.env.VERCEL_ENV === 'production') {
    console.error('[content] Supabase is not configured in production; refusing to serve demo content.')
    throw createError({ statusCode: 503, statusMessage: 'Content source is not configured' })
  }

  repository = new LocalContentRepository(demoPublication())
  return repository
}

/**
 * Pass the request's event so an admin's verified preview session reaches the database: the returned repository then sends
 * the token and the read policies decide. Without a preview session the shared anonymous repository is returned.
 */
export function getContentRepository(event?: H3Event): ContentRepository {
  const base = baseRepository()
  const token = event?.context.previewToken
  return token ? base.withPreviewToken(token) : base
}

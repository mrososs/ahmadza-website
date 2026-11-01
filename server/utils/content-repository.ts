import { LocalContentRepository } from '~/repositories/local-content-repository'
import { SupabaseContentRepository } from '~/repositories/supabase-content-repository'
import type { ContentRepository } from '~/repositories/content-repository'

let repository: ContentRepository | undefined

export function getContentRepository(): ContentRepository {
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

  repository = new LocalContentRepository()
  return repository
}

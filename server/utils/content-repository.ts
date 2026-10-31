import { LocalContentRepository } from '~/repositories/local-content-repository'
import { SupabaseContentRepository } from '~/repositories/supabase-content-repository'
import type { ContentRepository } from '~/repositories/content-repository'

let repository: ContentRepository | undefined

export function getContentRepository(): ContentRepository {
  if (repository) return repository

  const config = useRuntimeConfig()
  repository = config.supabaseUrl && config.supabasePublishableKey
    ? new SupabaseContentRepository(config.supabaseUrl, config.supabasePublishableKey)
    : new LocalContentRepository()

  return repository
}

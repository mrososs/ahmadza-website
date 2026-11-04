import type { SiteAccess } from '~/types/publication'

/**
 * What the server decided for this request: whether the site is public and whether the visitor is an admin previewing it.
 * The server writes it once while rendering and it rides the SSR payload, so the client never has to guess (or ask).
 */
export function useSiteAccess() {
  const access = useState<SiteAccess>('site-access', () => ({ mode: 'published', preview: false }))
  if (import.meta.server) {
    const decided = useRequestEvent()?.context.siteAccess
    if (decided) access.value = { mode: decided.mode, preview: decided.preview }
  }
  return access
}

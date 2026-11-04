import type { PublicationMode } from '~/types/publication'

/**
 * Reads the value of the `site.publication` setting. Only the exact string "published" opens the site; a missing row,
 * a malformed value or any other mode keeps it in maintenance, so a bad configuration can never launch the site.
 */
export function parsePublicationMode(value: unknown): PublicationMode {
  if (typeof value === 'object' && value !== null && 'mode' in value && value.mode === 'published') return 'published'
  return 'maintenance'
}

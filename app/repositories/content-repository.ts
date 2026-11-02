import type { SiteBrandingResult } from '~/types/branding'
import type { ContentDetailResult, ContentListResult, ContentQuery, ContentType } from '~/types/content'

export interface ContentRepository {
  list(query?: ContentQuery): Promise<ContentListResult>
  getBySlug(type: ContentType, slug: string): Promise<ContentDetailResult | null>
  /** The owner-managed header logo and hero image, or the bundled artwork where none is set. */
  getBranding(): Promise<SiteBrandingResult>
}

import type { SiteBrandingResult } from '~/types/branding'
import type { ContentDetailResult, ContentListResult, ContentQuery, ContentType, VideoAccessMode, VideoAccessResult } from '~/types/content'

export interface ContentRepository {
  list(query?: ContentQuery): Promise<ContentListResult>
  getBySlug(type: ContentType, slug: string): Promise<ContentDetailResult | null>
  /**
   * A short-lived URL for a published video that was uploaded to private storage. Download links are only issued when the
   * record allows downloads; this is the single place that policy is enforced.
   */
  getVideoAccess(slug: string, mode: VideoAccessMode): Promise<VideoAccessResult>
  /** The owner-managed header logo and hero image, or the bundled artwork where none is set. */
  getBranding(): Promise<SiteBrandingResult>
}

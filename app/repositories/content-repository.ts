import type { SiteBrandingResult } from '~/types/branding'
import type { ContentDetailResult, ContentListResult, ContentQuery, ContentType, VideoAccessMode, VideoAccessResult } from '~/types/content'
import type { PublicationMode } from '~/types/publication'

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
  /**
   * Whether the public may see the site. Rejects when the state cannot be read: callers must treat that as maintenance
   * (fail closed), never as published.
   */
  getPublication(): Promise<PublicationMode>
  /** Whether the database accepts this admin preview token (an unexpired session of a still-active admin). */
  verifyPreviewToken(token: string): Promise<boolean>
  /**
   * A repository whose reads carry an admin's preview token, so a site in maintenance still returns its published content to
   * that admin. Anonymous reads never go through it.
   */
  withPreviewToken(token: string): ContentRepository
  /**
   * Asks the database for a preview session on behalf of the signed-in admin who owns `accessToken`. Resolves null when that
   * user is not an active admin; the database makes that decision, not this application.
   */
  startPreviewSession(accessToken: string): Promise<string | null>
  /** Ends a preview session. Whoever holds the token may end it. */
  endPreviewSession(token: string): Promise<void>
}

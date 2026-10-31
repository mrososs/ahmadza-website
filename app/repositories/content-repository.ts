import type { ContentDetailResult, ContentListResult, ContentQuery, ContentType } from '~/types/content'

export interface ContentRepository {
  list(query?: ContentQuery): Promise<ContentListResult>
  getBySlug(type: ContentType, slug: string): Promise<ContentDetailResult | null>
}

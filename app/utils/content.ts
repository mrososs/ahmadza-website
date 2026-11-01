import type { ContentItem } from '~/types/content'
import { contentTypeRoutes } from '~/types/content'

export function contentPath(item: ContentItem): string {
  return item.type === 'video' ? '/videos' : `${contentTypeRoutes[item.type]}/${item.slug}`
}

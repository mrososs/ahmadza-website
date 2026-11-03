import type { ContentItem } from '~/types/content'
import { contentTypeRoutes } from '~/types/content'

export function contentPath(item: ContentItem): string {
  return `${contentTypeRoutes[item.type]}/${item.slug}`
}

import { demoContent } from '~/data/demo-content'
import type { ContentRepository } from '~/repositories/content-repository'
import type { ContentDetailResult, ContentItem, ContentListResult, ContentQuery, ContentType } from '~/types/content'

const normalize = (value: string) => value.trim().toLocaleLowerCase('ar').replace(/[\u064B-\u065F\u0670]/g, '')

const matchesQuery = (item: ContentItem, query: string) => {
  const needle = normalize(query)
  const haystack = normalize([item.title, item.excerpt, ...item.categories.map(category => category.name)].join(' '))
  return haystack.includes(needle)
}

export class LocalContentRepository implements ContentRepository {
  async list(query: ContentQuery = {}): Promise<ContentListResult> {
    const page = Math.max(1, query.page ?? 1)
    const pageSize = Math.min(50, Math.max(1, query.limit ?? 12))

    const filtered = demoContent
      .filter(item => item.status === 'published')
      .filter(item => !query.type || item.type === query.type)
      .filter(item => !query.category || item.categories.some(category => category.slug === query.category))
      .filter(item => query.featured === undefined || item.featured === query.featured)
      .filter(item => !query.query || matchesQuery(item, query.query))
      .toSorted((left, right) => right.publishedAt.localeCompare(left.publishedAt))

    const start = (page - 1) * pageSize
    return {
      items: filtered.slice(start, start + pageSize),
      total: filtered.length,
      page,
      pageSize,
      source: 'demo',
    }
  }

  async getBySlug(type: ContentType, slug: string): Promise<ContentDetailResult | null> {
    const item = demoContent.find(entry => entry.type === type && entry.slug === slug && entry.status === 'published')
    if (!item) return null

    const related = demoContent
      .filter(entry => entry.id !== item.id && entry.type === type && entry.status === 'published')
      .filter(entry => entry.categories.some(category => item.categories.some(current => current.id === category.id)))
      .slice(0, 3)

    return { item, related, source: 'demo' }
  }
}

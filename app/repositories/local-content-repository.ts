import { demoContent } from '~/data/demo-content'
import type { ContentRepository } from '~/repositories/content-repository'
import type { SiteBrandingResult } from '~/types/branding'
import type { ContentDetailResult, ContentItem, ContentListResult, ContentQuery, ContentType, VideoAccessResult } from '~/types/content'
import type { PublicationMode } from '~/types/publication'
import { defaultSiteBranding } from '~/utils/branding'

const normalize = (value: string) => value.trim().toLocaleLowerCase('ar').replace(/[\u064B-\u065F\u0670]/g, '')

const matchesQuery = (item: ContentItem, query: string) => {
  const needle = normalize(query)
  const haystack = normalize([item.title, item.excerpt, ...item.categories.map(category => category.name)].join(' '))
  return haystack.includes(needle)
}

export class LocalContentRepository implements ContentRepository {
  /** The demo data is labelled demo content and has no admin, so its publication state is fixed by the caller. */
  constructor(private readonly publication: PublicationMode = 'published') {}

  async list(query: ContentQuery = {}): Promise<ContentListResult> {
    const page = Math.max(1, query.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, query.limit ?? 12))

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

  /** The demo data has no uploaded files, so there is never anything to sign. */
  async getVideoAccess(): Promise<VideoAccessResult> {
    return { status: 'not-found' }
  }

  async getBranding(): Promise<SiteBrandingResult> {
    return { branding: defaultSiteBranding(), source: 'demo' }
  }

  async getPublication(): Promise<PublicationMode> {
    return this.publication
  }

  /** There are no admin sessions in the demo repository, so no preview token is ever valid. */
  async verifyPreviewToken(): Promise<boolean> {
    return false
  }

  withPreviewToken(): ContentRepository {
    return this
  }

  async startPreviewSession(): Promise<string | null> {
    return null
  }

  async endPreviewSession(): Promise<void> {}
}

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { ContentRepository } from '~/repositories/content-repository'
import type { SiteBrandingResult } from '~/types/branding'
import type { ContentDetailResult, ContentItem, ContentListResult, ContentQuery, ContentType, VideoAccessMode, VideoAccessResult } from '~/types/content'
import { brandingSettingKeys, brandingStorageBase } from '~/utils/branding'
import { parseBrandingRows } from '~/utils/branding-rows'
import { parseVideoMetadata } from '~/utils/video-metadata'
import { videoBucket } from '~/utils/video-upload'

/** Playback URLs outlive a long video; download URLs only need to survive the redirect. */
const PLAYBACK_SECONDS = 2 * 60 * 60
const DOWNLOAD_SECONDS = 60

interface ContentRow {
  id: string
  type: ContentType
  slug: string
  title: string
  excerpt: string
  status: 'published'
  published_at: string
  updated_at: string
  featured: boolean
  reading_minutes: number | null
  body: ContentItem['sections']
  metadata: Record<string, unknown>
  seo_title: string | null
  seo_description: string | null
  content_categories: Array<{ categories: { id: string; slug: string; name: string } | null }>
}

function mapRow(row: ContentRow): ContentItem {
  const common = {
    id: row.id,
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt,
    status: row.status,
    publishedAt: row.published_at,
    updatedAt: row.updated_at,
    categories: row.content_categories.flatMap(item => item.categories ? [item.categories] : []),
    sections: row.body,
    featured: row.featured,
    ...(typeof row.metadata.coverUrl === 'string' && row.metadata.coverUrl ? { coverUrl: row.metadata.coverUrl } : {}),
    ...(row.reading_minutes === null ? {} : { readingMinutes: row.reading_minutes }),
    ...(row.seo_title === null ? {} : { seoTitle: row.seo_title }),
    ...(row.seo_description === null ? {} : { seoDescription: row.seo_description }),
  }

  switch (row.type) {
    case 'article':
      return { ...common, type: 'article' }
    case 'benefit':
      return { ...common, type: 'benefit' }
    case 'sermon':
      return {
        ...common,
        type: 'sermon',
        ...(typeof row.metadata.linkedAudioSlug === 'string' ? { linkedAudioSlug: row.metadata.linkedAudioSlug } : {}),
      }
    case 'book':
      return {
        ...common,
        type: 'book',
        authorLabel: typeof row.metadata.authorLabel === 'string' ? row.metadata.authorLabel : 'غير محدد',
        ...(typeof row.metadata.publicationYear === 'number' ? { publicationYear: row.metadata.publicationYear } : {}),
        ...(typeof row.metadata.pageCount === 'number' ? { pageCount: row.metadata.pageCount } : {}),
        ...(typeof row.metadata.pdfUrl === 'string' ? { pdfUrl: row.metadata.pdfUrl } : {}),
        downloadAllowed: row.metadata.downloadAllowed === true,
      }
    case 'audio':
      return {
        ...common,
        type: 'audio',
        ...(typeof row.metadata.audioUrl === 'string' ? { audioUrl: row.metadata.audioUrl } : {}),
        ...(typeof row.metadata.durationSeconds === 'number' ? { durationSeconds: row.metadata.durationSeconds } : {}),
      }
    case 'video': {
      const video = parseVideoMetadata(row.metadata)
      return {
        ...common,
        type: 'video',
        ...(video.youtubeId ? { youtubeId: video.youtubeId } : {}),
        ...(video.uploadedVideo ? { uploadedVideo: video.uploadedVideo } : {}),
        downloadAllowed: Boolean(video.uploadedVideo) && video.downloadAllowed,
        ...(video.durationSeconds === undefined ? {} : { durationSeconds: video.durationSeconds }),
      }
    }
  }
}

export class SupabaseContentRepository implements ContentRepository {
  private readonly client: SupabaseClient

  constructor(private readonly url: string, publishableKey: string) {
    this.client = createClient(url, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } })
  }

  async list(query: ContentQuery = {}): Promise<ContentListResult> {
    const page = Math.max(1, query.page ?? 1)
    const pageSize = Math.min(100, Math.max(1, query.limit ?? 12))
    const start = (page - 1) * pageSize

    let request = this.client
      .from('content_items')
      .select('*, content_categories(categories(id, slug, name))', { count: 'exact' })
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .range(start, start + pageSize - 1)

    if (query.type) request = request.eq('type', query.type)
    if (query.featured !== undefined) request = request.eq('featured', query.featured)
    if (query.query) request = request.textSearch('search_document', query.query, { type: 'websearch', config: 'simple' })
    if (query.category) request = request.eq('content_categories.categories.slug', query.category)

    const { data, error, count } = await request
    if (error) throw new Error(`Supabase content list failed: ${error.message}`)

    return { items: (data as unknown as ContentRow[]).map(mapRow), total: count ?? 0, page, pageSize, source: 'supabase' }
  }

  async getBySlug(type: ContentType, slug: string): Promise<ContentDetailResult | null> {
    const { data, error } = await this.client
      .from('content_items')
      .select('*, content_categories(categories(id, slug, name))')
      .eq('status', 'published')
      .eq('type', type)
      .eq('slug', slug)
      .maybeSingle()

    if (error) throw new Error(`Supabase content detail failed: ${error.message}`)
    if (!data) return null

    const item = mapRow(data as unknown as ContentRow)
    const relatedResult = await this.list({ type, limit: 4 })
    return { item, related: relatedResult.items.filter(entry => entry.id !== item.id).slice(0, 3), source: 'supabase' }
  }

  async getVideoAccess(slug: string, mode: VideoAccessMode): Promise<VideoAccessResult> {
    // Anonymous read: RLS only returns a published video. The same policy lets the anonymous role sign that one file.
    const { data, error } = await this.client
      .from('content_items')
      .select('slug, metadata')
      .eq('status', 'published')
      .eq('type', 'video')
      .eq('slug', slug)
      .maybeSingle()
    if (error) throw new Error(`Supabase video lookup failed: ${error.message}`)
    if (!data) return { status: 'not-found' }

    const video = parseVideoMetadata(data.metadata as Record<string, unknown>)
    if (!video.videoPath) return { status: 'not-found' }
    // The download policy lives here, on the server's own endpoint, not only in the hidden button.
    if (mode === 'download' && !video.downloadAllowed) return { status: 'download-disabled' }

    const expiresInSeconds = mode === 'download' ? DOWNLOAD_SECONDS : PLAYBACK_SECONDS
    const extension = video.videoPath.split('.').pop() ?? 'mp4'
    const { data: signed, error: signError } = await this.client.storage
      .from(videoBucket)
      .createSignedUrl(video.videoPath, expiresInSeconds, mode === 'download' ? { download: `${slug}.${extension}` } : undefined)
    if (signError || !signed) throw new Error(`Supabase video signing failed: ${signError?.message ?? 'no URL'}`)
    return { status: 'ok', url: signed.signedUrl, expiresInSeconds }
  }

  async getBranding(): Promise<SiteBrandingResult> {
    // Anonymous read: the "Public settings are readable" policy exposes only rows marked public_readable.
    const { data, error } = await this.client.from('site_settings').select('key, value').in('key', [...brandingSettingKeys])
    if (error) throw new Error(`Supabase branding failed: ${error.message}`)
    return { branding: parseBrandingRows(data, brandingStorageBase(this.url)), source: 'supabase' }
  }
}

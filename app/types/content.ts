export const contentTypes = ['article', 'book', 'sermon', 'audio', 'video', 'benefit'] as const

export type ContentType = (typeof contentTypes)[number]
export type PublishStatus = 'draft' | 'published' | 'scheduled' | 'archived'

export interface Category {
  id: string
  slug: string
  name: string
}

export interface ContentSection {
  id: string
  heading?: string
  paragraphs: string[]
  quote?: string
  /**
   * Formatted body written in the rich editor. Public pages only ever receive it after server-side sanitizing.
   * Sections written before the editor existed have no `html` and keep using heading, paragraphs and quote.
   */
  html?: string
}

interface ContentBase {
  id: string
  type: ContentType
  slug: string
  title: string
  excerpt: string
  status: PublishStatus
  publishedAt: string
  updatedAt: string
  categories: Category[]
  sections: ContentSection[]
  featured: boolean
  readingMinutes?: number
  /** Cover image (article, benefit, …), book cover, or video poster. Items without one show a local fallback. */
  coverUrl?: string
  seoTitle?: string
  seoDescription?: string
}

export interface ArticleContent extends ContentBase {
  type: 'article'
}

export interface SermonContent extends ContentBase {
  type: 'sermon'
  linkedAudioSlug?: string
}

export interface BenefitContent extends ContentBase {
  type: 'benefit'
}

export interface BookContent extends ContentBase {
  type: 'book'
  authorLabel: string
  publicationYear?: number
  pageCount?: number
  pdfUrl?: string
  /** When true the book page also offers the PDF as a download. Off by default: books are read on the site. */
  downloadAllowed: boolean
}

export interface AudioContent extends ContentBase {
  type: 'audio'
  audioUrl?: string
  durationSeconds?: number
}

/** Where a video plays from. A record with neither source is a listing that has no playable file yet. */
export type VideoSource = 'youtube' | 'upload'

export interface UploadedVideoInfo {
  mimeType: string
  bytes?: number
}

export interface VideoContent extends ContentBase {
  type: 'video'
  youtubeId?: string
  /** Present when a file was uploaded to private storage. The storage path itself never leaves the server. */
  uploadedVideo?: UploadedVideoInfo
  /** Uploaded files only: offers a Download action on the video page. YouTube videos are never downloadable here. */
  downloadAllowed: boolean
  durationSeconds?: number
}

export const videoSourceOf = (video: Pick<VideoContent, 'youtubeId' | 'uploadedVideo'>): VideoSource | undefined =>
  video.uploadedVideo ? 'upload' : video.youtubeId ? 'youtube' : undefined

export type ContentItem =
  | ArticleContent
  | BookContent
  | SermonContent
  | AudioContent
  | VideoContent
  | BenefitContent

export interface ContentQuery {
  type?: ContentType
  query?: string
  category?: string
  featured?: boolean
  limit?: number
  page?: number
}

export interface ContentListResult {
  items: ContentItem[]
  total: number
  page: number
  pageSize: number
  source: 'demo' | 'supabase'
}

export interface ContentDetailResult {
  item: ContentItem
  related: ContentItem[]
  source: 'demo' | 'supabase'
}

export const contentTypeLabels: Record<ContentType, string> = {
  article: 'مقال',
  book: 'كتاب',
  sermon: 'خطبة',
  audio: 'صوتية',
  video: 'مرئية',
  benefit: 'فائدة',
}

export const contentTypePluralLabels: Record<ContentType, string> = {
  article: 'المقالات',
  book: 'الكتب',
  sermon: 'الخطب',
  audio: 'الصوتيات',
  video: 'المرئيات',
  benefit: 'الفوائد',
}

export const contentTypeRoutes: Record<ContentType, string> = {
  article: '/articles',
  book: '/books',
  sermon: '/sermons',
  audio: '/audio',
  video: '/videos',
  benefit: '/benefits',
}

export type VideoAccessMode = 'play' | 'download'

export type VideoAccessResult =
  | { status: 'ok'; url: string; expiresInSeconds: number }
  | { status: 'not-found' }
  | { status: 'download-disabled' }

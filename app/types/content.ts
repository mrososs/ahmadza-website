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
  downloadAllowed: boolean
}

export interface AudioContent extends ContentBase {
  type: 'audio'
  audioUrl?: string
  durationSeconds?: number
}

export interface VideoContent extends ContentBase {
  type: 'video'
  youtubeId?: string
  durationSeconds?: number
}

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

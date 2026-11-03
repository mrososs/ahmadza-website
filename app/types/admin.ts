import type { ContentType, PublishStatus, VideoSource } from '~/types/content'

export type AdminRole = 'owner' | 'editor'

export interface AdminProfile {
  userId: string
  email: string
  displayName: string
  role: AdminRole
}

export interface AdminCategory {
  id: string
  slug: string
  name: string
  description: string
  sortOrder: number
  active: boolean
}

export interface AdminContentSummary {
  id: string
  type: ContentType
  slug: string
  title: string
  status: PublishStatus
  featured: boolean
  publishedAt: string | null
  updatedAt: string
}

/** Flat, form-friendly shape. Type-specific metadata stays as strings until `draftToMetadata` validates it. */
export interface ContentDraft {
  type: ContentType
  slug: string
  title: string
  excerpt: string
  /** HTML from the rich editor, sanitized on save. Empty string for no body. */
  bodyHtml: string
  status: PublishStatus
  publishedAt: string
  scheduledAt: string
  featured: boolean
  readingMinutes: string
  seoTitle: string
  seoDescription: string
  categoryIds: string[]
  linkedAudioSlug: string
  authorLabel: string
  publicationYear: string
  pageCount: string
  pdfUrl: string
  coverUrl: string
  /** Book PDF download, or the video file download for uploaded videos. */
  downloadAllowed: boolean
  audioUrl: string
  durationSeconds: string
  /** What the editor typed or pasted (a link or a bare id); `parseYoutubeInput` turns it into the stored id. */
  youtubeId: string
  videoSource: VideoSource
  /** Storage path, type and size of an uploaded video that is waiting for (or already has) a saved record. */
  videoPath: string
  videoMimeType: string
  videoBytes: string
}

export interface AdminContentRecord extends ContentDraft {
  id: string
}

export interface AdminContentFilter {
  type?: ContentType
  status?: PublishStatus
  query?: string
}

export interface AdminStats {
  total: number
  byType: Record<ContentType, number>
  byStatus: Record<PublishStatus, number>
  recent: AdminContentSummary[]
}

export type AdminSource = 'supabase' | 'demo'

export type FieldErrors = Partial<Record<string, string>>

export const publishStatusLabels: Record<PublishStatus, string> = {
  draft: 'مسودة',
  published: 'منشور',
  scheduled: 'مجدول',
  archived: 'مؤرشف',
}

export const publishStatuses = ['draft', 'published', 'scheduled', 'archived'] as const satisfies readonly PublishStatus[]

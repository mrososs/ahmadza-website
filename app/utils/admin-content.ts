import { z } from 'zod'
import { contentTypes, videoSourceOf, type ContentItem, type ContentSection, type ContentType } from '~/types/content'
import type { ContentDraft, FieldErrors } from '~/types/admin'
import { isRichTextEmpty, sectionsToHtml } from '~/utils/rich-text'
import { parseVideoMetadata } from '~/utils/video-metadata'
import { isVideoPath } from '~/utils/video-upload'
import { parseYoutubeInput, youtubeWatchUrl } from '~/utils/youtube'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

const optionalInt = (label: string, max: number) => z.string().trim()
  .refine(value => value === '' || (/^\d+$/.test(value) && Number(value) > 0 && Number(value) <= max), `${label}: أدخل رقمًا صحيحًا موجبًا`)

const optionalUrl = z.string().trim()
  .refine(value => value === '' || /^https?:\/\//i.test(value), 'الرابط يجب أن يبدأ بـ https://')

export const draftSchema = z.object({
  type: z.enum(contentTypes),
  slug: z.string().trim().regex(slugPattern, 'استخدم أحرفًا لاتينية صغيرة وأرقامًا وشرطات فقط، مثل article-2026-01'),
  title: z.string().trim().min(2, 'العنوان قصير جدًا').max(240, 'العنوان لا يتجاوز 240 حرفًا'),
  excerpt: z.string().trim().max(600, 'الملخص لا يتجاوز 600 حرف'),
  bodyHtml: z.string(),
  status: z.enum(['draft', 'published', 'scheduled', 'archived']),
  publishedAt: z.string(),
  scheduledAt: z.string(),
  featured: z.boolean(),
  readingMinutes: optionalInt('مدة القراءة', 600),
  seoTitle: z.string().trim().max(70, 'عنوان البحث لا يتجاوز 70 حرفًا'),
  seoDescription: z.string().trim().max(170, 'وصف البحث لا يتجاوز 170 حرفًا'),
  categoryIds: z.array(z.string()),
  linkedAudioSlug: z.string().trim(),
  authorLabel: z.string().trim().max(120, 'اسم المؤلف طويل'),
  publicationYear: optionalInt('سنة النشر', 2100),
  pageCount: optionalInt('عدد الصفحات', 20000),
  pdfUrl: optionalUrl,
  coverUrl: optionalUrl,
  downloadAllowed: z.boolean(),
  audioUrl: optionalUrl,
  durationSeconds: optionalInt('المدة', 86400),
  youtubeId: z.string().trim(),
  videoSource: z.enum(['youtube', 'upload']),
  videoPath: z.string(),
  videoMimeType: z.string(),
  videoBytes: z.string(),
}).superRefine((draft, ctx) => {
  if (draft.status === 'scheduled' && !draft.scheduledAt) {
    ctx.addIssue({ code: 'custom', path: ['scheduledAt'], message: 'حدّد موعد النشر المجدول' })
  }
  if (draft.type === 'video' && draft.videoSource === 'youtube' && draft.youtubeId) {
    const parsed = parseYoutubeInput(draft.youtubeId)
    if (!parsed.ok) ctx.addIssue({ code: 'custom', path: ['youtubeId'], message: parsed.message })
  }
  if (draft.type === 'video' && draft.videoSource === 'upload' && draft.videoPath && !isVideoPath(draft.videoPath)) {
    ctx.addIssue({ code: 'custom', path: ['videoPath'], message: 'ملف الفيديو غير صالح. ارفعه من جديد.' })
  }
  if (draft.type === 'book' && !draft.authorLabel) {
    ctx.addIssue({ code: 'custom', path: ['authorLabel'], message: 'اسم المؤلف مطلوب للكتب' })
  }
})

export function validateDraft(draft: ContentDraft): FieldErrors {
  const result = draftSchema.safeParse(draft)
  if (result.success) return {}
  const errors: FieldErrors = {}
  for (const issue of result.error.issues) {
    const key = String(issue.path[0] ?? 'form')
    errors[key] ??= issue.message
  }
  return errors
}

const toInt = (value: string): number | undefined => value.trim() === '' ? undefined : Number(value)

/** Only the metadata keys relevant to the content type are persisted; empty values are omitted. */
export function draftToMetadata(draft: ContentDraft): Record<string, unknown> {
  const clean = (entries: Record<string, unknown>) => Object.fromEntries(Object.entries(entries).filter(([, value]) => value !== undefined && value !== ''))
  const cover = { coverUrl: draft.coverUrl.trim() }
  switch (draft.type) {
    case 'article':
    case 'benefit':
      return clean(cover)
    case 'sermon':
      return clean({ ...cover, linkedAudioSlug: draft.linkedAudioSlug.trim() })
    case 'book':
      return clean({
        ...cover,
        authorLabel: draft.authorLabel.trim(),
        publicationYear: toInt(draft.publicationYear),
        pageCount: toInt(draft.pageCount),
        pdfUrl: draft.pdfUrl.trim(),
        downloadAllowed: draft.downloadAllowed,
      })
    case 'audio':
      return clean({ ...cover, audioUrl: draft.audioUrl.trim(), durationSeconds: toInt(draft.durationSeconds) })
    case 'video': {
      // The two sources are mutually exclusive: only the selected one is stored, so a switch never leaves a stale file or link behind.
      const youtube = draft.videoSource === 'youtube' ? parseYoutubeInput(draft.youtubeId) : undefined
      const uploaded = draft.videoSource === 'upload' && isVideoPath(draft.videoPath)
      return clean({
        ...cover,
        videoSource: draft.videoSource,
        youtubeId: youtube?.ok ? youtube.id : undefined,
        videoPath: uploaded ? draft.videoPath : undefined,
        videoMimeType: uploaded ? draft.videoMimeType : undefined,
        videoBytes: uploaded ? toInt(draft.videoBytes) : undefined,
        downloadAllowed: uploaded ? draft.downloadAllowed : undefined,
        durationSeconds: toInt(draft.durationSeconds),
      })
    }
  }
}

type DraftMetadataFields = Pick<ContentDraft, 'linkedAudioSlug' | 'authorLabel' | 'publicationYear' | 'pageCount' | 'pdfUrl' | 'coverUrl' | 'downloadAllowed' | 'audioUrl' | 'durationSeconds' | 'youtubeId' | 'videoSource' | 'videoPath' | 'videoMimeType' | 'videoBytes'>

export function metadataToDraftFields(type: ContentType, metadata: Record<string, unknown>): DraftMetadataFields {
  const text = (key: string) => typeof metadata[key] === 'string' ? metadata[key] : ''
  const num = (key: string) => typeof metadata[key] === 'number' ? String(metadata[key]) : ''
  const video = type === 'video' ? parseVideoMetadata(metadata) : undefined
  return {
    linkedAudioSlug: type === 'sermon' ? text('linkedAudioSlug') : '',
    authorLabel: type === 'book' ? text('authorLabel') : '',
    publicationYear: type === 'book' ? num('publicationYear') : '',
    pageCount: type === 'book' ? num('pageCount') : '',
    pdfUrl: type === 'book' ? text('pdfUrl') : '',
    coverUrl: text('coverUrl'),
    downloadAllowed: type === 'book' ? metadata.downloadAllowed === true : Boolean(video?.videoPath && video.downloadAllowed),
    audioUrl: type === 'audio' ? text('audioUrl') : '',
    durationSeconds: type === 'audio' || type === 'video' ? num('durationSeconds') : '',
    // Rows saved before uploads existed carry only a bare id and no source; the id means YouTube.
    youtubeId: video?.youtubeId ? youtubeWatchUrl(video.youtubeId) : '',
    videoSource: video?.videoPath && !video.youtubeId ? 'upload' : 'youtube',
    videoPath: video?.videoPath ?? '',
    videoMimeType: video?.uploadedVideo?.mimeType ?? '',
    videoBytes: video?.uploadedVideo?.bytes === undefined ? '' : String(video.uploadedVideo.bytes),
  }
}

export function itemToDraftFields(item: ContentItem): DraftMetadataFields {
  const cover = { coverUrl: item.coverUrl }
  switch (item.type) {
    case 'article':
    case 'benefit':
      return metadataToDraftFields(item.type, cover)
    case 'sermon':
      return metadataToDraftFields('sermon', { ...cover, linkedAudioSlug: item.linkedAudioSlug })
    case 'book':
      return metadataToDraftFields('book', { ...cover, authorLabel: item.authorLabel, publicationYear: item.publicationYear, pageCount: item.pageCount, pdfUrl: item.pdfUrl, downloadAllowed: item.downloadAllowed })
    case 'audio':
      return metadataToDraftFields('audio', { ...cover, audioUrl: item.audioUrl, durationSeconds: item.durationSeconds })
    case 'video':
      return {
        ...metadataToDraftFields('video', { ...cover, youtubeId: item.youtubeId, durationSeconds: item.durationSeconds }),
        videoSource: videoSourceOf(item) ?? 'youtube',
      }
  }
}

export function emptyDraft(type: ContentType = 'article'): ContentDraft {
  return {
    type,
    slug: suggestSlug(type),
    title: '',
    excerpt: '',
    bodyHtml: '',
    status: 'draft',
    publishedAt: '',
    scheduledAt: '',
    featured: false,
    readingMinutes: '',
    seoTitle: '',
    seoDescription: '',
    categoryIds: [],
    ...metadataToDraftFields(type, {}),
  }
}

export function suggestSlug(type: ContentType): string {
  return `${type}-${Date.now().toString(36)}`
}

/** `<input type="datetime-local">` works in local time without a zone; the database stores UTC instants. */
export function isoToLocalInput(iso: string | null | undefined): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function localInputToIso(value: string): string | null {
  if (!value) return null
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

/** The stored body: one rich section, or nothing when the editor is empty. `html` must already be sanitized. */
export function draftToBody(html: string): ContentSection[] {
  return isRichTextEmpty(html) ? [] : [{ id: 'body', paragraphs: [], html }]
}

/** Editor HTML for a stored body, converting sections written before the rich editor. */
export const bodyToDraftHtml = (sections: readonly ContentSection[]): string => sectionsToHtml(sections)

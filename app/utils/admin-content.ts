import { z } from 'zod'
import { contentTypes, type ContentItem, type ContentType } from '~/types/content'
import type { ContentDraft, FieldErrors } from '~/types/admin'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const youtubeIdPattern = /^[\w-]{11}$/

const optionalInt = (label: string, max: number) => z.string().trim()
  .refine(value => value === '' || (/^\d+$/.test(value) && Number(value) > 0 && Number(value) <= max), `${label}: أدخل رقمًا صحيحًا موجبًا`)

const optionalUrl = z.string().trim()
  .refine(value => value === '' || /^https?:\/\//i.test(value), 'الرابط يجب أن يبدأ بـ https://')

const sectionSchema = z.object({
  id: z.string(),
  heading: z.string().optional(),
  paragraphs: z.array(z.string()),
  quote: z.string().optional(),
})

export const draftSchema = z.object({
  type: z.enum(contentTypes),
  slug: z.string().trim().regex(slugPattern, 'استخدم أحرفًا لاتينية صغيرة وأرقامًا وشرطات فقط، مثل article-2026-01'),
  title: z.string().trim().min(2, 'العنوان قصير جدًا').max(240, 'العنوان لا يتجاوز 240 حرفًا'),
  excerpt: z.string().trim().max(600, 'الملخص لا يتجاوز 600 حرف'),
  sections: z.array(sectionSchema),
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
  audioUrl: optionalUrl,
  durationSeconds: optionalInt('المدة', 86400),
  youtubeId: z.string().trim().refine(value => value === '' || youtubeIdPattern.test(value), 'معرّف يوتيوب مكوّن من 11 رمزًا'),
}).superRefine((draft, ctx) => {
  if (draft.status === 'scheduled' && !draft.scheduledAt) {
    ctx.addIssue({ code: 'custom', path: ['scheduledAt'], message: 'حدّد موعد النشر المجدول' })
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
  switch (draft.type) {
    case 'article':
    case 'benefit':
      return {}
    case 'sermon':
      return clean({ linkedAudioSlug: draft.linkedAudioSlug.trim() })
    case 'book':
      return clean({
        authorLabel: draft.authorLabel.trim(),
        publicationYear: toInt(draft.publicationYear),
        pageCount: toInt(draft.pageCount),
        pdfUrl: draft.pdfUrl.trim(),
        coverUrl: draft.coverUrl.trim(),
      })
    case 'audio':
      return clean({ audioUrl: draft.audioUrl.trim(), durationSeconds: toInt(draft.durationSeconds) })
    case 'video':
      return clean({ youtubeId: draft.youtubeId.trim(), durationSeconds: toInt(draft.durationSeconds) })
  }
}

export function metadataToDraftFields(type: ContentType, metadata: Record<string, unknown>): Pick<ContentDraft, 'linkedAudioSlug' | 'authorLabel' | 'publicationYear' | 'pageCount' | 'pdfUrl' | 'coverUrl' | 'audioUrl' | 'durationSeconds' | 'youtubeId'> {
  const text = (key: string) => typeof metadata[key] === 'string' ? metadata[key] : ''
  const num = (key: string) => typeof metadata[key] === 'number' ? String(metadata[key]) : ''
  return {
    linkedAudioSlug: type === 'sermon' ? text('linkedAudioSlug') : '',
    authorLabel: type === 'book' ? text('authorLabel') : '',
    publicationYear: type === 'book' ? num('publicationYear') : '',
    pageCount: type === 'book' ? num('pageCount') : '',
    pdfUrl: type === 'book' ? text('pdfUrl') : '',
    coverUrl: type === 'book' ? text('coverUrl') : '',
    audioUrl: type === 'audio' ? text('audioUrl') : '',
    durationSeconds: type === 'audio' || type === 'video' ? num('durationSeconds') : '',
    youtubeId: type === 'video' ? text('youtubeId') : '',
  }
}

export function itemToDraftFields(item: ContentItem): ReturnType<typeof metadataToDraftFields> {
  switch (item.type) {
    case 'article':
    case 'benefit':
      return metadataToDraftFields(item.type, {})
    case 'sermon':
      return metadataToDraftFields('sermon', { linkedAudioSlug: item.linkedAudioSlug })
    case 'book':
      return metadataToDraftFields('book', { authorLabel: item.authorLabel, publicationYear: item.publicationYear, pageCount: item.pageCount, pdfUrl: item.pdfUrl, coverUrl: item.coverUrl })
    case 'audio':
      return metadataToDraftFields('audio', { audioUrl: item.audioUrl, durationSeconds: item.durationSeconds })
    case 'video':
      return metadataToDraftFields('video', { youtubeId: item.youtubeId, durationSeconds: item.durationSeconds })
  }
}

export function emptyDraft(type: ContentType = 'article'): ContentDraft {
  return {
    type,
    slug: suggestSlug(type),
    title: '',
    excerpt: '',
    sections: [{ id: crypto.randomUUID(), heading: '', paragraphs: [''] }],
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

/** Removes blank paragraphs and empty sections so the public reader never renders empty blocks. */
export function cleanSections(sections: ContentDraft['sections']): ContentDraft['sections'] {
  return sections
    .map(section => ({
      id: section.id,
      ...(section.heading?.trim() ? { heading: section.heading.trim() } : {}),
      paragraphs: section.paragraphs.map(paragraph => paragraph.trim()).filter(Boolean),
      ...(section.quote?.trim() ? { quote: section.quote.trim() } : {}),
    }))
    .filter(section => section.paragraphs.length > 0 || section.heading || section.quote)
}

import { contentTypeLabels, type ContentItem, type ContentType } from '~/types/content'
import { contentPath } from '~/utils/content'
import { formatDuration } from '~/utils/format'
import { youtubeThumbnailUrl } from '~/utils/youtube'

export interface ContentCardImage {
  src: string
  alt: string
}

/** One shape for every content type, so a single card component can show any of them. */
export interface ContentCardModel {
  id: string
  type: ContentType
  typeLabel: string
  title: string
  description: string
  /** Absent when the item has no picture; the card then draws the local fallback for its type. */
  image?: ContentCardImage
  publishedAt: string
  href: string
  /** Short type-specific facts such as the author or the duration. */
  meta: string[]
  actionLabel: string
}

const actionLabels: Record<ContentType, string> = {
  article: 'اقرأ المقال',
  book: 'تصفّح الكتاب',
  sermon: 'اقرأ الخطبة',
  audio: 'استمع الآن',
  video: 'شاهد المقطع',
  benefit: 'اقرأ الفائدة',
}

function imageFor(item: ContentItem): ContentCardImage | undefined {
  if (item.coverUrl) {
    return { src: item.coverUrl, alt: item.type === 'book' ? `غلاف كتاب ${item.title}` : `صورة ${item.title}` }
  }
  // A YouTube video already has an official thumbnail, which is the "appropriate" poster when no poster was uploaded.
  if (item.type === 'video' && item.youtubeId) return { src: youtubeThumbnailUrl(item.youtubeId), alt: `لقطة من مقطع ${item.title}` }
  return undefined
}

function metaFor(item: ContentItem): string[] {
  switch (item.type) {
    case 'book':
      return [item.authorLabel, ...(item.publicationYear ? [String(item.publicationYear)] : [])]
    case 'video':
    case 'audio':
      return item.durationSeconds ? [formatDuration(item.durationSeconds)] : []
    case 'article':
    case 'benefit':
    case 'sermon':
      return item.readingMinutes ? [`${item.readingMinutes} دقائق قراءة`] : []
  }
}

export function toContentCard(item: ContentItem): ContentCardModel {
  const image = imageFor(item)
  return {
    id: item.id,
    type: item.type,
    typeLabel: contentTypeLabels[item.type],
    title: item.title,
    description: item.excerpt,
    ...(image ? { image } : {}),
    publishedAt: item.publishedAt,
    href: contentPath(item),
    meta: metaFor(item),
    actionLabel: actionLabels[item.type],
  }
}

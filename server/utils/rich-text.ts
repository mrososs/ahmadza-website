import sanitizeHtml from 'sanitize-html'
import { isSafeDimension, isSafeImage, isSafeLink, richTextClassPattern, richTextTags } from '~/utils/rich-text-policy'
import type { ContentItem, ContentSection } from '~/types/content'

/** Public object URLs the editor may embed. Anything else (other hosts, data:, blob:) is dropped from the page. */
function imagePrefixes(): string[] {
  const config = useRuntimeConfig()
  const base = (config.supabaseUrl || config.public.supabaseUrl).replace(/\/$/, '')
  return base ? [`${base}/storage/v1/object/public/publications/`] : []
}

/** The security boundary for article bodies: stored HTML is rewritten against an allow-list on every public read. */
export function sanitizeRichText(html: string, prefixes: readonly string[] = imagePrefixes(), idPrefix = 'h'): string {
  let headingCount = 0
  const numberHeading = (tagName: string, attribs: Record<string, string>) => ({ tagName, attribs: { ...attribs, id: `${idPrefix}-${++headingCount}` } })

  return sanitizeHtml(html, {
    allowedTags: [...richTextTags],
    allowedAttributes: {
      '*': ['class'],
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt', 'width', 'height', 'loading', 'decoding'],
      h2: ['id'],
      h3: ['id'],
      h4: ['id'],
    },
    allowedClasses: { '*': [richTextClassPattern] },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowProtocolRelative: false,
    disallowedTagsMode: 'discard',
    transformTags: {
      h2: numberHeading,
      h3: numberHeading,
      h4: numberHeading,
      a: (tagName, attribs) => {
        const href = attribs.href ?? ''
        if (!isSafeLink(href)) return { tagName: 'span', attribs: {} }
        const external = /^https?:/i.test(href)
        return { tagName, attribs: { href, ...(external ? { target: '_blank', rel: 'noopener noreferrer nofollow' } : {}) } }
      },
      img: (tagName, attribs) => {
        const src = attribs.src ?? ''
        if (!isSafeImage(src, prefixes)) return { tagName, attribs: {} }
        return {
          tagName,
          attribs: {
            src,
            alt: (attribs.alt ?? '').slice(0, 300),
            loading: 'lazy',
            decoding: 'async',
            ...(isSafeDimension(attribs.width ?? '') ? { width: attribs.width as string } : {}),
            ...(isSafeDimension(attribs.height ?? '') ? { height: attribs.height as string } : {}),
          },
        }
      },
    },
    exclusiveFilter: frame => frame.tag === 'img' && !frame.attribs.src,
  })
}

/** A copy of the item that is safe to send to browsers: rich sections are sanitized, plain-text sections are untouched. */
export function withSafeBody<T extends ContentItem>(item: T): T {
  const sections = item.sections.map((section, index): ContentSection => section.html === undefined ? section : { ...section, html: sanitizeRichText(section.html, imagePrefixes(), `s${index}`) })
  return { ...item, sections }
}

/**
 * For list payloads: rich bodies are left out entirely (lists only show titles and excerpts), so unsanitized HTML never reaches
 * a page through a list and 100 bodies are not sanitized per request.
 */
export function withoutRichBody<T extends ContentItem>(item: T): T {
  if (!item.sections.some(section => section.html !== undefined)) return item
  return { ...item, sections: item.sections.map((section): ContentSection => section.html === undefined ? section : { id: section.id, paragraphs: [] }) }
}

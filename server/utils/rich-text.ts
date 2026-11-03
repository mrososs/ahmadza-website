import { isSafeDimension, isSafeImage, isSafeLink, richTextClassPattern, richTextTags } from '~/utils/rich-text-policy'
import type { ContentItem, ContentSection } from '~/types/content'
import { richTextToPlain } from '~/utils/rich-text'

type SanitizeHtml = typeof import('sanitize-html')

// Loaded on first use, so a problem loading the library can never take down routes that only list content.
let sanitizerLoad: Promise<SanitizeHtml | undefined> | undefined
function loadSanitizer(): Promise<SanitizeHtml | undefined> {
  sanitizerLoad ??= import('sanitize-html').then(module => module.default).catch((cause) => {
    console.error('[content] sanitize-html could not be loaded; rich text is shown as plain text', cause)
    return undefined
  })
  return sanitizerLoad
}

const escapeText = (value: string) => value.replace(/[&<>"']/g, character => `&#${character.charCodeAt(0)};`)

/** Fail-closed fallback: every tag is dropped and the text is shown as escaped paragraphs. */
function plainParagraphs(html: string): string {
  return richTextToPlain(html) ? `<p>${escapeText(richTextToPlain(html))}</p>` : ''
}

/** Public object URLs the editor may embed. Anything else (other hosts, data:, blob:) is dropped from the page. */
function imagePrefixes(): string[] {
  const config = useRuntimeConfig()
  const base = (config.supabaseUrl || config.public.supabaseUrl).replace(/\/$/, '')
  return base ? [`${base}/storage/v1/object/public/publications/`] : []
}

/** The security boundary for article bodies: stored HTML is rewritten against an allow-list on every public read. */
export async function sanitizeRichText(html: string, prefixes: readonly string[] = imagePrefixes(), idPrefix = 'h'): Promise<string> {
  const sanitizeHtml = await loadSanitizer()
  if (!sanitizeHtml) return plainParagraphs(html)
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
export async function withSafeBody<T extends ContentItem>(item: T): Promise<T> {
  const sections = await Promise.all(item.sections.map(async (section, index): Promise<ContentSection> => section.html === undefined ? section : { ...section, html: await sanitizeRichText(section.html, imagePrefixes(), `s${index}`) }))
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

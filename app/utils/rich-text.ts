import type { ContentSection } from '~/types/content'

const entities: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', '\'': '&#39;' }
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, character => entities[character] ?? character)

/** A section written before the rich editor: heading, plain paragraphs and an optional pull quote. */
const isLegacySection = (section: ContentSection) => section.html === undefined

/**
 * HTML for the editor. Rich sections pass through; older plain-text sections are converted so the editor opens them
 * with every word intact. Nothing is written back until the editor saves.
 */
export function sectionsToHtml(sections: readonly ContentSection[]): string {
  return sections.map((section) => {
    if (!isLegacySection(section)) return section.html ?? ''
    return [
      section.heading?.trim() ? `<h2>${escapeHtml(section.heading.trim())}</h2>` : '',
      ...section.paragraphs.map(paragraph => paragraph.trim()).filter(Boolean).map(paragraph => `<p>${escapeHtml(paragraph).replace(/\n/g, '<br>')}</p>`),
      section.quote?.trim() ? `<blockquote>${escapeHtml(section.quote.trim())}</blockquote>` : '',
    ].join('')
  }).join('')
}

/** Quill reports an untouched editor as `<p><br></p>`. */
export function isRichTextEmpty(html: string): boolean {
  if (/<img\b/i.test(html)) return false
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;|\s/g, '') === ''
}

export function richTextToPlain(html: string): string {
  return html
    .replace(/<\/(p|h[2-4]|li|blockquote)>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, '\'')
    .replace(/\s+/g, ' ')
    .trim()
}

export interface RichHeading { id: string; text: string; level: 2 | 3 | 4 }

/** Public pages receive HTML whose headings already carry generated ids (see the server sanitizer); this reads them back for the contents list. */
export function extractHeadings(html: string): RichHeading[] {
  const headings: RichHeading[] = []
  for (const match of html.matchAll(/<h([234])\b[^>]*\bid="([\w-]+)"[^>]*>([\s\S]*?)<\/h\1>/gi)) {
    const text = richTextToPlain(match[3] ?? '')
    if (text) headings.push({ id: match[2] ?? '', text, level: Number(match[1]) as 2 | 3 | 4 })
  }
  return headings
}

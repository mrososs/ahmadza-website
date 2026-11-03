/**
 * What an article body may contain. The editor (Quill 2) can only produce these, but the stored HTML is never trusted:
 * the server sanitizes with this same policy on every public read, and the admin preview applies it in the browser.
 */
export const richTextTags = ['p', 'br', 'h2', 'h3', 'h4', 'strong', 'em', 'u', 'ol', 'ul', 'li', 'blockquote', 'a', 'img'] as const

/** Quill writes alignment, direction and indent as classes; nothing else may keep a class. */
export const richTextClassPattern = /^ql-(align-(center|right|justify)|direction-(rtl|ltr)|indent-[1-8])$/

export const richTextImageHint = 'يجب أن تكون الصور مرفوعة عبر المحرر.'

const maxImageEdge = 10_000
const numeric = /^\d{1,5}$/

export const isSafeDimension = (value: string) => numeric.test(value) && Number(value) > 0 && Number(value) <= maxImageEdge

const schemeless = /^(?![a-z][a-z\d+.-]*:|\/\/)/i

/** Links may be web, mail or phone links; relative paths stay inside the site. */
export function isSafeLink(href: string): boolean {
  const value = href.trim()
  if (/^(https?:|mailto:|tel:)/i.test(value)) return true
  return value.startsWith('#') || (value.startsWith('/') && schemeless.test(value))
}

/** Images must come from the site's own storage (or the site itself); no data:, blob: or third-party trackers. */
export function isSafeImage(src: string, allowedPrefixes: readonly string[]): boolean {
  const value = src.trim()
  if (value.startsWith('/') && !value.startsWith('//')) return true
  return allowedPrefixes.some(prefix => prefix !== '' && value.startsWith(prefix))
}

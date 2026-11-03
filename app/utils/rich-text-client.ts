import DOMPurify from 'dompurify'
import { isSafeDimension, isSafeImage, isSafeLink, richTextClassPattern, richTextTags } from '~/utils/rich-text-policy'

let purify: ReturnType<typeof DOMPurify> | undefined

/**
 * Browser-side twin of the server sanitizer, used when an editor saves and in the admin preview. It applies the same
 * allow-list from `rich-text-policy`, so what an editor previews is what visitors get. The server still re-sanitizes on every read.
 */
export function sanitizeRichTextInBrowser(html: string, imagePrefixes: readonly string[]): string {
  if (!purify) {
    purify = DOMPurify(window)
  }
  const instance = purify
  instance.removeAllHooks()
  instance.addHook('afterSanitizeAttributes', (node) => {
    if (!(node instanceof Element)) return
    for (const name of [...node.classList]) {
      if (!richTextClassPattern.test(name)) node.classList.remove(name)
    }
    if (node.getAttribute('class') === '') node.removeAttribute('class')

    if (node.tagName === 'A') {
      const href = node.getAttribute('href') ?? ''
      if (!isSafeLink(href)) node.removeAttribute('href')
      if (/^https?:/i.test(href)) {
        node.setAttribute('target', '_blank')
        node.setAttribute('rel', 'noopener noreferrer nofollow')
      }
      else {
        node.removeAttribute('target')
        node.removeAttribute('rel')
      }
    }
    if (node.tagName === 'IMG') {
      if (!isSafeImage(node.getAttribute('src') ?? '', imagePrefixes)) {
        node.remove()
        return
      }
      for (const dimension of ['width', 'height']) {
        if (!isSafeDimension(node.getAttribute(dimension) ?? '')) node.removeAttribute(dimension)
      }
    }
  })

  return instance.sanitize(html, {
    ALLOWED_TAGS: [...richTextTags],
    ALLOWED_ATTR: ['class', 'href', 'target', 'rel', 'src', 'alt', 'width', 'height'],
    ALLOW_DATA_ATTR: false,
    ALLOW_ARIA_ATTR: false,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|\/(?!\/)|#)/i,
  })
}

import { expect, test } from '@playwright/test'
import { mkdtempSync } from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { buildSync } from 'esbuild'
import { parseYoutubeInput } from '../app/utils/youtube'
import { parseVideoMetadata } from '../app/utils/video-metadata'
import { isRichTextEmpty, sectionsToHtml } from '../app/utils/rich-text'
import { validateVideoFile } from '../app/utils/video-upload'

const storage = ['https://proj.supabase.co/storage/v1/object/public/publications/']
// The sanitizer lives in Nitro's server utils (Nuxt aliases, Node-only dependency), so it is bundled once and loaded as plain CommonJS.
let clean: (html: string) => string
test.beforeAll(() => {
  const outfile = join(mkdtempSync(join(tmpdir(), 'sanitizer-')), 'rich-text.cjs')
  buildSync({ entryPoints: [resolve(process.cwd(), 'server/utils/rich-text.ts')], bundle: true, platform: 'node', format: 'cjs', outfile, alias: { '~': resolve(process.cwd(), 'app') }, logLevel: 'silent' })
  const { sanitizeRichText } = createRequire(outfile)(outfile) as { sanitizeRichText: (html: string, prefixes: readonly string[]) => string }
  clean = html => sanitizeRichText(html, storage)
})

test.describe('sanitizer (server boundary for article bodies)', () => {
  test('keeps the formatting the editor produces', () => {
    const html = '<h2>عنوان</h2><p class="ql-align-center ql-direction-rtl">نص <strong>عريض</strong> <em>مائل</em> <u>مسطر</u></p><ul><li>أ</li></ul><ol><li>ب</li></ol><blockquote>اقتباس</blockquote>'
    const out = clean(html)
    expect(out).toContain('<h2 id="h-1">عنوان</h2>')
    expect(out).toContain('class="ql-align-center ql-direction-rtl"')
    for (const fragment of ['<strong>', '<em>', '<u>', '<ul>', '<ol>', '<blockquote>']) expect(out).toContain(fragment)
  })

  test('removes scripts, event handlers, iframes and styles', () => {
    const out = clean('<p onclick="x()" style="color:red">a</p><script>alert(1)</script><iframe src="https://evil.test"></iframe><img src="x" onerror="alert(1)"><svg onload="alert(1)"></svg><form><input></form>')
    expect(out).not.toMatch(/script|onclick|onerror|onload|iframe|style=|<svg|<form|<input/i)
    expect(out).toContain('<p>a</p>')
  })

  test('neutralises malicious links and adds safe rel/target to external ones', () => {
    expect(clean('<a href="javascript:alert(1)">x</a>')).not.toContain('javascript')
    expect(clean('<a href="JaVaScRiPt:alert(1)">x</a>')).not.toContain('href')
    expect(clean('<a href="data:text/html,<script>alert(1)</script>">x</a>')).not.toContain('data:')
    expect(clean('<a href="//evil.test">x</a>')).not.toContain('evil')
    const external = clean('<a href="https://example.com/a">x</a>')
    expect(external).toContain('rel="noopener noreferrer nofollow"')
    expect(external).toContain('target="_blank"')
    expect(clean('<a href="mailto:a@b.co">x</a>')).toContain('mailto:a@b.co')
  })

  test('only images from the site storage survive; data, blob and third-party images are dropped', () => {
    expect(clean('<img src="data:image/png;base64,AAAA">')).toBe('')
    expect(clean('<img src="blob:https://x/1">')).toBe('')
    expect(clean('<img src="https://tracker.test/p.png">')).toBe('')
    expect(clean('<img src="javascript:alert(1)">')).toBe('')
    const ok = clean(`<img src="${storage[0]}covers/a.png" alt="وصف" width="100" height="50" onerror="x()">`)
    expect(ok).toContain(`src="${storage[0]}covers/a.png"`)
    expect(ok).toContain('alt="وصف"')
    expect(ok).not.toContain('onerror')
  })

  test('drops unknown classes and the heading ids an editor tries to set', () => {
    const out = clean('<p class="evil ql-indent-2 ql-align-right">a</p><h3 id="x" class="boom">b</h3>')
    expect(out).toContain('class="ql-indent-2 ql-align-right"')
    expect(out).not.toContain('evil')
    expect(out).toContain('<h3 id="h-1">b</h3>')
  })

  test('maps unsupported tags to text instead of keeping them', () => {
    expect(clean('<h1>a</h1><table><tr><td>b</td></tr></table>')).not.toMatch(/<h1|<table|<td/)
  })
})

test.describe('YouTube link parser', () => {
  const id = 'dQw4w9WgXcQ'
  for (const url of [
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&t=42s&list=PL1`,
    `https://youtu.be/${id}`,
    `https://youtu.be/${id}?si=abc`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/live/${id}?feature=share`,
    `https://m.youtube.com/watch?v=${id}`,
    `youtube.com/watch?v=${id}`,
    ` ${id} `,
  ]) {
    test(`accepts ${url.trim()}`, () => expect(parseYoutubeInput(url)).toEqual({ ok: true, id }))
  }

  for (const url of ['', 'not a url', 'https://vimeo.com/123456789', 'https://evil.test/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=short', 'https://www.youtube.com/playlist?list=PL1', 'javascript:alert(1)', 'https://youtube.com.evil.test/watch?v=dQw4w9WgXcQ']) {
    test(`rejects ${JSON.stringify(url)}`, () => expect(parseYoutubeInput(url).ok).toBe(false))
  }
})

test('rich text helpers: legacy sections convert without losing words, empties are detected', () => {
  const html = sectionsToHtml([{ id: 'a', heading: 'عنوان <b>', paragraphs: ['فقرة 1', 'فقرة 2'], quote: 'اقتباس' }])
  expect(html).toBe('<h2>عنوان &lt;b&gt;</h2><p>فقرة 1</p><p>فقرة 2</p><blockquote>اقتباس</blockquote>')
  expect(isRichTextEmpty('<p><br></p>')).toBe(true)
  expect(isRichTextEmpty('<p></p>')).toBe(true)
  expect(isRichTextEmpty('<p>نص</p>')).toBe(false)
})

test('video metadata: old rows keep working, bad paths are ignored', () => {
  expect(parseVideoMetadata({ youtubeId: 'dQw4w9WgXcQ' })).toEqual({ youtubeId: 'dQw4w9WgXcQ', downloadAllowed: false })
  const path = 'uploads/123e4567-e89b-12d3-a456-426614174000.mp4'
  expect(parseVideoMetadata({ videoPath: path, videoMimeType: 'video/mp4', downloadAllowed: true }).uploadedVideo?.mimeType).toBe('video/mp4')
  expect(parseVideoMetadata({ videoPath: '../../secret.mp4' }).videoPath).toBeUndefined()
  expect(parseVideoMetadata({ youtubeId: 'bad' }).youtubeId).toBeUndefined()
})

test('video upload validation', () => {
  expect(validateVideoFile({ type: 'video/mp4', size: 10 })).toBeNull()
  expect(validateVideoFile({ type: 'video/x-msvideo', size: 10 })).toContain('غير مدعومة')
  expect(validateVideoFile({ type: 'video/mp4', size: 0 })).toContain('فارغ')
  expect(validateVideoFile({ type: 'video/mp4', size: 201 * 1024 * 1024 })).toContain('أكبر')
})

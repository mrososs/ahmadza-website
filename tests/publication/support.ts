import { request as httpRequest } from 'node:http'
import { expect, type APIRequestContext, type Page } from '@playwright/test'
import { makePng } from '../support/png'
import { assertLocal, serviceHeaders, supabaseUrl, type TestAccount } from '../support/local-stack'

export { anonHeaders, configured, editor, outsider, owner, publishableKey, readPublicationRow, seedAdmin, serviceHeaders, setPublicationState, signInToken, supabaseUrl, userHeaders } from '../support/local-stack'

export const articleSlug = 'pub-article'
export const articleTitle = 'مقال اختبار النشر'
export const draftSlug = 'pub-draft'
export const videoSlug = 'pub-video'
export const comingSoonHeading = 'قريبًا بإذن الله'
export const previewCookie = 'ahmadza-preview'

const { 'content-type': _json, ...uploadHeaders } = serviceHeaders()

function isoAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000).toISOString()
}

export interface SeededFiles { imagePath: string; videoPath: string }

/** One published article, one draft, one published video with a private file, and one public file. Idempotent. */
export async function seedPublicationContent(request: APIRequestContext): Promise<SeededFiles> {
  assertLocal()
  const stamp = crypto.randomUUID()
  const imagePath = `publication-test/${stamp}.png`
  const videoPath = `uploads/${stamp}.mp4`

  const image = await request.post(`${supabaseUrl}/storage/v1/object/publications/${imagePath}`, { headers: { ...uploadHeaders, 'x-upsert': 'true' }, multipart: { file: { name: 'pixel.png', mimeType: 'image/png', buffer: makePng(8, 8, 'opaque') } } })
  expect(image.ok(), 'the public test file uploads').toBe(true)
  const video = await request.post(`${supabaseUrl}/storage/v1/object/videos/${videoPath}`, { headers: { ...uploadHeaders, 'x-upsert': 'true' }, multipart: { file: { name: 'clip.mp4', mimeType: 'video/mp4', buffer: Buffer.from('not-a-real-video-but-private-bytes') } } })
  expect(video.ok(), `the private test video uploads (${video.status()})`).toBe(true)

  // The local stack is throwaway: start from exactly this content so counts and lists in the tests are exact.
  await request.delete(`${supabaseUrl}/rest/v1/content_items?id=not.is.null`, { headers: serviceHeaders() })
  const rows = [
    { type: 'article', slug: articleSlug, title: articleTitle, excerpt: 'ملخص مقال الاختبار', status: 'published', published_at: isoAgo(60), body: [{ id: 'a', heading: 'عنوان فرعي', paragraphs: ['نص المقال المنشور'] }], metadata: {} },
    { type: 'article', slug: draftSlug, title: 'مسودة لا يجب أن تظهر', excerpt: 'مسودة', status: 'draft', published_at: null, body: [], metadata: {} },
    { type: 'video', slug: videoSlug, title: 'مقطع اختبار النشر', excerpt: 'مقطع', status: 'published', published_at: isoAgo(30), body: [], metadata: { videoPath, downloadAllowed: false } },
  ]
  const created = await request.post(`${supabaseUrl}/rest/v1/content_items`, { headers: { ...serviceHeaders(), prefer: 'return=minimal' }, data: rows })
  expect(created.ok(), `the test content is created (${created.status()} ${await created.text()})`).toBe(true)
  return { imagePath, videoPath }
}

export async function signIn(page: Page, account: TestAccount, target = '/admin') {
  await page.goto(target)
  await page.getByRole('heading', { level: 1, name: 'تسجيل دخول المدير' }).waitFor()
  await page.getByLabel('البريد الإلكتروني').fill(account.email)
  await page.getByLabel('كلمة المرور').fill(account.password)
  await page.getByRole('button', { name: 'دخول' }).click()
}

export const hydrated = (page: Page) => page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' })

/**
 * A GET that sends the path exactly as written. Playwright (like any URL parser) resolves `..` and `%2e%2e` before sending, which
 * would hide exactly the requests a hostile client can still make with a raw socket.
 */
export function rawGet(origin: string, path: string, headers: Record<string, string> = {}): Promise<{ status: number; body: string }> {
  const { hostname, port } = new URL(origin)
  return new Promise((resolve, reject) => {
    const req = httpRequest({ hostname, port, path, method: 'GET', headers }, (response) => {
      const chunks: Buffer[] = []
      response.on('data', chunk => chunks.push(chunk as Buffer))
      response.on('end', () => resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }))
    })
    req.on('error', reject)
    req.end()
  })
}

/** Status of a page or API as an anonymous visitor would see it (no cookies, no redirects followed). */
export async function anonymousStatus(request: APIRequestContext, path: string, headers: Record<string, string> = {}) {
  return (await request.get(path, { headers, maxRedirects: 0 })).status()
}

/** The state flips within a few seconds on a running server (a short, deliberate cache), so tests wait for it instead of sleeping. */
export async function expectAnonymousStatus(request: APIRequestContext, path: string, status: number) {
  await expect.poll(() => anonymousStatus(request, path), { timeout: 20_000, intervals: [500, 1000, 1500] }).toBe(status)
}

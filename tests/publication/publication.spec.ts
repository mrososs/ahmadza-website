import { expect, test, type APIRequestContext } from '@playwright/test'
import {
  anonHeaders, anonymousStatus, articleSlug, articleTitle, comingSoonHeading, configured, draftSlug, editor, expectAnonymousStatus, hydrated, outsider, owner,
  previewCookie, publishableKey, rawGet, readPublicationRow, seedAdmin, seedPublicationContent, serviceHeaders, setPublicationState, signIn, signInToken, supabaseUrl, userHeaders, videoSlug,
  type SeededFiles,
} from './support'

// Runs against a real local Supabase stack: real Auth, PostgREST row-level security and Storage. See playwright.publication.config.ts.
test.skip(!configured, 'set LOCAL_SUPABASE_URL, LOCAL_SUPABASE_KEY and LOCAL_SUPABASE_SECRET_KEY for a local stack')
test.describe.configure({ mode: 'serial' })

let files: SeededFiles
let ownerId = ''
let editorId = ''

const rest = (path: string) => `${supabaseUrl}/rest/v1/${path}`

async function previewCookieValue(request: APIRequestContext) {
  return (await request.storageState()).cookies.find(cookie => cookie.name === previewCookie)?.value
}

test.beforeAll(async ({ request }) => {
  ownerId = await seedAdmin(request, owner)
  editorId = await seedAdmin(request, editor)
  await seedAdmin(request, outsider)
  // Reactivate in case an earlier run stopped halfway through the deactivation test.
  await request.patch(rest(`admin_profiles?user_id=eq.${editorId}`), { headers: serviceHeaders(), data: { active: true } })
  await request.delete(rest('preview_sessions?expires_at=gt.1970-01-01'), { headers: serviceHeaders() })
  await setPublicationState(request, null)
  files = await seedPublicationContent(request)
  // A running server remembers the previous state for a few seconds (a suite that ran before this one may have published the site).
  await expectAnonymousStatus(request, '/', 503)
})

// ---------------------------------------------------------------------------------------------------------------------
// Anonymous visitors while the site is in maintenance
// ---------------------------------------------------------------------------------------------------------------------

test('a site that has never been published is in maintenance: visitors get the coming-soon page on every route', async ({ request }) => {
  const paths = ['/', '/articles', `/articles/${articleSlug}`, `/articles/${draftSlug}`, '/books', '/audio', '/sermons', '/benefits', `/videos/${videoSlug}`, '/search?q=%D8%A7%D8%AE%D8%AA%D8%A8%D8%A7%D8%B1', '/no-such-page']
  for (const path of paths) {
    const response = await request.get(path)
    const body = await response.text()
    expect(response.status(), path).toBe(503)
    expect(response.headers()['content-type'], path).toContain('text/html')
    expect(response.headers()['x-robots-tag'], path).toContain('noindex')
    expect(response.headers()['cache-control'], path).toContain('no-store')
    expect(response.headers()['retry-after'], path).toBeTruthy()
    expect(body, path).toContain(comingSoonHeading)
    expect(body, path).toContain('<meta name="robots" content="noindex, nofollow, noarchive">')
    // Nothing of the real site, and no way to find the database from the page.
    expect(body, path).not.toContain(articleTitle)
    expect(body, path).not.toContain('مسودة لا يجب')
    expect(body, path).not.toContain(supabaseUrl)
    expect(body, path).not.toContain(publishableKey)
    expect(body, path).not.toContain('__NUXT__')
    expect(body, path).not.toMatch(/<script/i)
  }
})

test('every gated page answers identically, so a real article address cannot be told from a made-up one', async ({ request }) => {
  const real = await (await request.get(`/articles/${articleSlug}`)).text()
  const missing = await (await request.get('/articles/definitely-not-an-article')).text()
  const draft = await (await request.get(`/articles/${draftSlug}`)).text()
  expect(real).toBe(missing)
  expect(real).toBe(draft)
})

test('the content APIs, the sitemap and uploaded-video endpoints are closed too; robots.txt advertises no sitemap', async ({ request }) => {
  for (const path of ['/api/content', '/api/content?type=article', `/api/content/article/${articleSlug}`, `/api/videos/${videoSlug}/playback`, `/api/videos/${videoSlug}/download`, '/api/__sitemap__/urls']) {
    const response = await request.get(path)
    expect(response.status(), path).toBe(503)
    expect(response.headers()['content-type'], path).toContain('application/json')
    const text = await response.text()
    expect(text, path).not.toContain(articleTitle)
    expect(text, path).not.toContain('"items"')
  }
  expect(await anonymousStatus(request, '/sitemap.xml')).toBe(503)

  const robots = await request.get('/robots.txt')
  expect(robots.status()).toBe(200)
  expect(robots.headers()['cache-control']).toContain('no-store')
  const text = await robots.text()
  expect(text).toContain('Disallow: /admin')
  expect(text).not.toContain('Sitemap:')
})

test('the coming-soon page has the required Arabic copy, the logo, and a quiet owner entrance', async ({ page }) => {
  const response = await page.goto('/')
  expect(response?.status()).toBe(503)
  await expect(page.locator('html')).toHaveAttribute('lang', 'ar')
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.getByRole('heading', { level: 1, name: comingSoonHeading })).toBeVisible()
  await expect(page.getByText('نعمل حاليًا على تجهيز الموقع وتطوير محتواه، ونسعد بزيارتكم عند إطلاقه قريبًا بإذن الله.')).toBeVisible()
  await expect(page.getByRole('img', { name: 'موقع أحمد الزهراني' })).toBeVisible()
  await expect(page).toHaveTitle(/قريبًا بإذن الله \| موقع أحمد الزهراني/)

  const entrance = page.getByRole('link', { name: 'دخول المدير' })
  await expect(entrance).toHaveAttribute('href', '/admin/login')
  const box = await entrance.boundingBox()
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44)
  await entrance.click()
  await expect(page.getByRole('heading', { level: 1, name: 'تسجيل دخول المدير' })).toBeVisible()
})

test('nothing a visitor controls can switch the gate off', async ({ request, browser }) => {
  const ownerToken = await signInToken(request, owner)
  const forgedToken = 'a'.repeat(64)
  const attempts: Array<{ label: string; path: string; headers?: Record<string, string> }> = [
    { label: 'preview query parameters', path: `/articles/${articleSlug}?preview=1&admin=true&token=${forgedToken}&draft=1` },
    { label: 'a made-up preview cookie', path: '/', headers: { cookie: `${previewCookie}=${forgedToken}` } },
    { label: 'a made-up secure preview cookie', path: '/', headers: { cookie: `__Host-ahmadza-preview=${forgedToken}` } },
    { label: 'a malformed preview cookie', path: '/', headers: { cookie: `${previewCookie}=not-a-token` } },
    { label: 'the preview header the database reads', path: '/', headers: { 'x-preview-token': forgedToken } },
    { label: 'an admin access token as a bearer header', path: '/', headers: { authorization: `Bearer ${ownerToken}` } },
    { label: 'an admin access token on the API', path: '/api/content', headers: { authorization: `Bearer ${ownerToken}` } },
    { label: 'another production host name', path: '/', headers: { host: 'ahmadza-website.vercel.app' } },
    { label: 'a forwarded www host name', path: '/', headers: { 'x-forwarded-host': 'www.prof-ahmadza.com', 'x-forwarded-proto': 'https' } },
  ]
  for (const attempt of attempts) {
    const response = await request.get(attempt.path, { ...(attempt.headers ? { headers: attempt.headers } : {}), maxRedirects: 0 })
    const body = await response.text()
    expect(response.status(), attempt.label).toBeGreaterThanOrEqual(400)
    expect(body, attempt.label).not.toContain(articleTitle)
  }

  // Paths a URL parser would tidy up before sending, sent exactly as written (see rawGet).
  const origin = test.info().project.use.baseURL ?? ''
  for (const path of [`/_nuxt/%2e%2e/articles/${articleSlug}`, `/_nuxt/../articles/${articleSlug}`, `/admin/..%2farticles/${articleSlug}`, `/admin/%2e%2e/articles/${articleSlug}`, `/admin/%252e%252e/articles/${articleSlug}`, `//articles/${articleSlug}`, `/branding/%2e%2e/api/content`]) {
    const { status, body } = await rawGet(origin, path)
    expect(status, path).toBeGreaterThanOrEqual(400)
    expect(body, path).not.toContain(articleTitle)
  }

  // A page cannot talk itself in either: flags in the browser change nothing.
  const context = await browser.newContext()
  const page = await context.newPage()
  await page.addInitScript(() => {
    localStorage.setItem('admin', 'true')
    localStorage.setItem('preview', '1')
    sessionStorage.setItem('admin', 'true')
  })
  const response = await page.goto(`/articles/${articleSlug}?preview=1`)
  expect(response?.status()).toBe(503)
  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: comingSoonHeading })).toBeVisible()
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: comingSoonHeading })).toBeVisible()
  await context.close()
})

test('HEAD requests and refreshes are gated the same way; the admin sign-in page stays reachable', async ({ request }) => {
  expect((await request.head(`/articles/${articleSlug}`)).status()).toBe(503)
  const login = await request.get('/admin/login')
  expect(login.status()).toBe(200)
  expect(login.headers()['x-robots-tag']).toContain('noindex')
  // Static assets carry no content and stay open, or the admin console could not load.
  expect(await anonymousStatus(request, '/favicon.svg')).toBe(200)
  expect(await anonymousStatus(request, '/branding/header-logo-ahmad-alzahrani.webp')).toBe(200)
})

// ---------------------------------------------------------------------------------------------------------------------
// The database says the same thing as the site
// ---------------------------------------------------------------------------------------------------------------------

test('the Supabase API refuses to hand out content while the site is in maintenance, even with the public key', async ({ request }) => {
  for (const table of ['content_items', 'categories', 'content_categories', 'content_media', 'media_assets']) {
    const response = await request.get(rest(`${table}?select=*`), { headers: anonHeaders() })
    expect(response.status(), table).toBe(200)
    expect(await response.json(), `${table} rows visible to anon`).toEqual([])
  }
  // A signed-in user without an admin profile is a visitor like any other.
  const plain = await signInToken(request, outsider)
  expect(await (await request.get(rest('content_items?select=slug'), { headers: userHeaders(plain) })).json()).toEqual([])
  // The only public row is the switch itself: it carries no content.
  const settings = await (await request.get(rest('site_settings?select=key'), { headers: anonHeaders() })).json() as Array<{ key: string }>
  expect(settings.map(row => row.key).filter(key => key !== 'site.publication')).toEqual([])
})

test('nobody can read or write preview sessions, start one without being an admin, or list the public bucket', async ({ request }) => {
  const read = await request.get(rest('preview_sessions?select=*'), { headers: anonHeaders() })
  expect([401, 403]).toContain(read.status())
  const write = await request.post(rest('preview_sessions'), { headers: anonHeaders(), data: { token_hash: '\\xdeadbeef', user_id: ownerId, expires_at: '2999-01-01T00:00:00Z' } })
  expect(write.status()).toBeGreaterThanOrEqual(400)

  const anonStart = await request.post(rest('rpc/start_preview_session'), { headers: anonHeaders(), data: {} })
  expect(anonStart.status()).toBeGreaterThanOrEqual(400)
  const outsiderStart = await request.post(rest('rpc/start_preview_session'), { headers: userHeaders(await signInToken(request, outsider)), data: {} })
  expect(outsiderStart.status()).toBeGreaterThanOrEqual(400)
  expect(await outsiderStart.text()).toContain('42501')

  // The bucket used to be listable by anyone, drafts and unreferenced files included.
  const listing = await request.post(`${supabaseUrl}/storage/v1/object/list/publications`, { headers: { ...anonHeaders(), 'content-type': 'application/json' }, data: { prefix: 'publication-test', limit: 100 } })
  expect(listing.ok()).toBe(true)
  expect(await listing.json()).toEqual([])
})

test('only an owner can change the publication state: anonymous, plain users and editors are all refused', async ({ request }) => {
  const body = { key: 'site.publication', value: { mode: 'published' }, public_readable: true }
  const attempts = [
    { who: 'anonymous', headers: anonHeaders() },
    { who: 'a signed-in non-admin', headers: userHeaders(await signInToken(request, outsider)) },
    { who: 'an editor', headers: userHeaders(await signInToken(request, editor)) },
  ]
  for (const attempt of attempts) {
    const insert = await request.post(rest('site_settings?on_conflict=key'), { headers: { ...attempt.headers, 'content-type': 'application/json', prefer: 'resolution=merge-duplicates,return=minimal' }, data: body })
    expect(insert.status(), `${attempt.who} insert`).toBeGreaterThanOrEqual(400)
  }
  expect(await readPublicationRow(request)).toEqual([])
  // Even the owner cannot store a mode the site would not understand.
  const ownerHeaders = { ...userHeaders(await signInToken(request, owner)), 'content-type': 'application/json' }
  const bad = await request.post(rest('site_settings?on_conflict=key'), { headers: { ...ownerHeaders, prefer: 'resolution=merge-duplicates,return=minimal' }, data: { key: 'site.publication', value: { mode: 'open-to-everyone' }, public_readable: true } })
  expect(bad.status()).toBeGreaterThanOrEqual(400)
  const hidden = await request.post(rest('site_settings?on_conflict=key'), { headers: { ...ownerHeaders, prefer: 'resolution=merge-duplicates,return=minimal' }, data: { key: 'site.publication', value: { mode: 'published' }, public_readable: false } })
  expect(hidden.status()).toBeGreaterThanOrEqual(400)
  expect(await readPublicationRow(request)).toEqual([])
})

// ---------------------------------------------------------------------------------------------------------------------
// Admin preview
// ---------------------------------------------------------------------------------------------------------------------

test('a signed-in user who is not an admin gets no preview session', async ({ request }) => {
  // Other verbs on the session path are refused outright instead of falling through to the page renderer.
  for (const method of ['GET', 'PUT', 'PATCH'] as const) {
    const refused = await request.fetch('/api/preview/session', { method })
    expect(refused.status(), method).toBe(405)
    expect(refused.headers()['allow']).toContain('POST')
  }
  const token = await signInToken(request, outsider)
  const response = await request.post('/api/preview/session', { headers: { authorization: `Bearer ${token}` } })
  expect(response.status()).toBe(403)
  expect(await previewCookieValue(request)).toBeUndefined()
  expect((await request.post('/api/preview/session')).status()).toBe(401)
  expect((await request.post('/api/preview/session', { headers: { authorization: 'Bearer not.a.jwt' } })).status()).toBeGreaterThanOrEqual(401)
  expect(await anonymousStatus(request, '/')).toBe(503)
})

test('behind HTTPS the preview cookie is pinned to this host: __Host- prefix, Secure, HttpOnly, no Domain', async ({ request }) => {
  const token = await signInToken(request, owner)
  const https = { 'x-forwarded-proto': 'https' }
  const started = await request.post('/api/preview/session', { headers: { ...https, authorization: `Bearer ${token}` } })
  expect(started.status()).toBe(200)
  expect(started.headers()['cache-control']).toContain('no-store')
  const setCookie = started.headersArray().filter(header => header.name.toLowerCase() === 'set-cookie').map(header => header.value).join('\n')
  expect(setCookie).toMatch(/^__Host-ahmadza-preview=[0-9a-f]{64}; Max-Age=43200; Path=\/; HttpOnly; Secure; SameSite=Lax/m)
  expect(setCookie).not.toMatch(/Domain=/i)
  const value = /__Host-ahmadza-preview=([0-9a-f]{64})/.exec(setCookie)?.[1] ?? ''

  // Over HTTPS only the prefixed cookie counts (a plain-named one could be planted by a sibling subdomain).
  const prefixed = await request.get('/', { headers: { ...https, cookie: `__Host-ahmadza-preview=${value}` } })
  expect(prefixed.status()).toBe(200)
  const plain = await request.get('/', { headers: { ...https, cookie: `${previewCookie}=${value}` } })
  expect(plain.status()).toBe(503)

  // Clean up the session this test created.
  await request.delete('/api/preview/session', { headers: { ...https, cookie: `__Host-ahmadza-preview=${value}` } })
  expect((await request.get('/', { headers: { ...https, cookie: `__Host-ahmadza-preview=${value}` } })).status()).toBe(503)
})

test('the owner signs in and previews the real site, exactly as visitors will see it after launch', async ({ page, context }) => {
  await signIn(page, owner)
  await expect(page.getByRole('heading', { level: 1, name: 'لوحة التحكم' })).toBeVisible()

  const summary = page.getByRole('region', { name: 'معاينة الموقع' })
  await expect(summary).toBeVisible()
  await expect(summary.getByText('الموقع قيد التجهيز')).toBeVisible()

  const [popup] = await Promise.all([page.waitForEvent('popup'), summary.getByRole('button', { name: 'معاينة الموقع' }).click()])
  await popup.waitForURL(url => new URL(url).pathname === '/')
  await hydrated(popup)

  // The real homepage: the site's own header, content and footer, plus the bar that says this is a preview.
  await expect(popup.getByRole('navigation', { name: 'التنقل الرئيسي' })).toBeVisible()
  await expect(popup.getByText(articleTitle).first()).toBeVisible()
  await expect(popup.getByRole('complementary', { name: 'معاينة المدير' })).toBeVisible()
  await expect(popup.getByRole('complementary', { name: 'معاينة المدير' }).getByRole('link', { name: 'العودة إلى لوحة التحكم' })).toHaveAttribute('href', '/admin')

  // Safe caching and no indexing for everything an admin sees before launch.
  const home = await context.request.get('/')
  expect(home.status()).toBe(200)
  expect(home.headers()['cache-control']).toContain('no-store')
  expect(home.headers()['cache-control']).toContain('private')
  expect(home.headers()['x-robots-tag']).toContain('noindex')
  expect(await home.text()).toMatch(/<meta[^>]+name="robots"[^>]+noindex/)
  const api = await context.request.get('/api/content?type=article')
  expect(api.status()).toBe(200)
  expect(api.headers()['cache-control']).toContain('no-store')
  expect(((await api.json()) as { items: Array<{ slug: string }> }).items.map(item => item.slug)).toEqual([articleSlug])

  // The cookie is HttpOnly: nothing running in the page can read or copy it.
  const cookie = (await context.cookies()).find(entry => entry.name === previewCookie)
  expect(cookie?.httpOnly).toBe(true)
  expect(cookie?.sameSite).toBe('Lax')
  expect(await popup.evaluate(() => document.cookie)).not.toContain('preview')

  // Navigate the real site: a listing, an article, search, and a draft that must stay hidden.
  await popup.getByRole('navigation', { name: 'التنقل الرئيسي' }).getByRole('link', { name: 'المقالات' }).click()
  await expect(popup).toHaveURL(/\/articles$/)
  // Inside the page body: the same title also runs through the (moving) ticker in the masthead.
  await popup.locator('#main-content').getByRole('link', { name: new RegExp(articleTitle) }).first().click()
  await expect(popup.getByRole('heading', { level: 1, name: articleTitle })).toBeVisible()
  await expect(popup.getByText('نص المقال المنشور')).toBeVisible()
  await expect(popup.getByRole('complementary', { name: 'معاينة المدير' })).toBeVisible()

  const search = await popup.goto(`/search?q=${encodeURIComponent('اختبار')}`)
  expect(search?.status()).toBe(200)
  await expect(popup.getByTestId('search-results').getByText(articleTitle)).toBeVisible()

  const draft = await popup.goto(`/articles/${draftSlug}`)
  expect(draft?.status()).toBe(404)
  await expect(popup.getByText('مسودة لا يجب أن تظهر')).toHaveCount(0)

  // Uploaded videos play in the preview too: the server signs the private file on the admin's behalf.
  const playback = await context.request.get(`/api/videos/${videoSlug}/playback`)
  expect(playback.status()).toBe(200)
  expect(((await playback.json()) as { url: string }).url).toContain('/storage/v1/object/sign/videos/')

  // And back to the console.
  await popup.goto('/')
  await popup.getByRole('complementary', { name: 'معاينة المدير' }).getByRole('link', { name: 'العودة إلى لوحة التحكم' }).click()
  await expect(popup.getByRole('heading', { level: 1, name: 'لوحة التحكم' })).toBeVisible()
  await popup.close()
})

test('signing out ends the preview at once, and the old cookie is dead even if someone kept a copy', async ({ page, context, request }) => {
  await signIn(page, owner)
  await expect(page.getByRole('heading', { level: 1, name: 'لوحة التحكم' })).toBeVisible()
  await expect.poll(async () => (await context.cookies()).some(entry => entry.name === previewCookie)).toBe(true)
  const saved = (await context.cookies()).find(entry => entry.name === previewCookie)?.value ?? ''
  expect(saved).toMatch(/^[0-9a-f]{64}$/)
  expect((await context.request.get('/')).status()).toBe(200)

  await page.getByRole('navigation', { name: 'إدارة الموقع' }).getByRole('button', { name: 'تسجيل الخروج' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'تسجيل دخول المدير' })).toBeVisible()

  expect((await context.cookies()).some(entry => entry.name === previewCookie)).toBe(false)
  const afterLogout = await context.request.get('/')
  expect(afterLogout.status()).toBe(503)
  expect(await afterLogout.text()).toContain(comingSoonHeading)

  // A copy of the cookie taken before sign-out no longer opens anything: the database revoked the session.
  const replay = await request.get('/', { headers: { cookie: `${previewCookie}=${saved}` } })
  expect(replay.status()).toBe(503)
  // ...nor does it unlock the database's own API.
  const direct = await request.get(rest('content_items?select=slug'), { headers: { ...anonHeaders(), 'x-preview-token': saved } })
  expect(await direct.json()).toEqual([])
})

test('an editor can preview the site but cannot publish it', async ({ page }) => {
  await signIn(page, editor, '/admin/branding')
  const panel = page.getByRole('region', { name: 'حالة نشر الموقع' })
  await expect(panel.getByText('الموقع قيد التجهيز')).toBeVisible()
  await expect(panel.getByRole('switch', { name: 'نشر الموقع للجمهور' })).toBeDisabled()
  await expect(panel.getByText('تغيير حالة النشر متاح لمالك الموقع فقط')).toBeVisible()
  const [popup] = await Promise.all([page.waitForEvent('popup'), panel.getByRole('button', { name: 'معاينة الموقع' }).click()])
  await popup.waitForURL(url => new URL(url).pathname === '/')
  await expect(popup.getByText(articleTitle).first()).toBeVisible()
  await popup.close()
  await page.getByRole('navigation', { name: 'إدارة الموقع' }).getByRole('button', { name: 'تسجيل الخروج' }).click()
})

test('deactivating an admin ends their preview immediately in the database, and within seconds on the site', async ({ request }) => {
  const token = await signInToken(request, editor)
  expect((await request.post('/api/preview/session', { headers: { authorization: `Bearer ${token}` } })).status()).toBe(200)
  const value = await previewCookieValue(request)
  expect(value).toMatch(/^[0-9a-f]{64}$/)
  expect(await anonymousStatus(request, '/')).toBe(200)
  const viaHeader = () => request.get(rest('content_items?select=slug'), { headers: { ...anonHeaders(), 'x-preview-token': value ?? '' } })
  expect((await (await viaHeader()).json() as unknown[]).length).toBeGreaterThan(0)

  await request.patch(rest(`admin_profiles?user_id=eq.${editorId}`), { headers: serviceHeaders(), data: { active: false } })
  try {
    // The database stops honouring the token on the very next request...
    expect(await (await viaHeader()).json()).toEqual([])
    // ...and the site, which remembers a verification for a few seconds, follows.
    await expect.poll(() => anonymousStatus(request, '/'), { timeout: 20_000, intervals: [500, 1000, 2000] }).toBe(503)
  }
  finally {
    await request.patch(rest(`admin_profiles?user_id=eq.${editorId}`), { headers: serviceHeaders(), data: { active: true } })
  }
})

// ---------------------------------------------------------------------------------------------------------------------
// Files
// ---------------------------------------------------------------------------------------------------------------------

test('storage: a public-bucket file is still reachable by its exact URL, but nothing lists it; private videos are not signable while hidden', async ({ request }) => {
  // Honest about what a public bucket is: the object URL works for anyone who has it. What changed is that it cannot be discovered.
  const publicUrl = `${supabaseUrl}/storage/v1/object/public/publications/${files.imagePath}`
  expect((await request.get(publicUrl)).status()).toBe(200)

  const ownerToken = await signInToken(request, owner)
  const asOwner = await request.post(`${supabaseUrl}/storage/v1/object/list/publications`, { headers: { ...userHeaders(ownerToken), 'content-type': 'application/json' }, data: { prefix: 'publication-test', limit: 100 } })
  expect(((await asOwner.json()) as Array<{ name: string }>).length).toBeGreaterThan(0)

  const sign = (headers: Record<string, string>) => request.post(`${supabaseUrl}/storage/v1/object/sign/videos/${files.videoPath}`, { headers: { ...headers, 'content-type': 'application/json' }, data: { expiresIn: 60 } })
  expect((await sign(anonHeaders())).ok()).toBe(false)
  // The private bucket has no public URL at all.
  expect((await request.get(`${supabaseUrl}/storage/v1/object/public/videos/${files.videoPath}`)).ok()).toBe(false)
})

// ---------------------------------------------------------------------------------------------------------------------
// Launch and return to maintenance, through the admin UI
// ---------------------------------------------------------------------------------------------------------------------

test('the owner publishes the site: a confirmation first, then everyone sees it, search engines included', async ({ page, request }) => {
  await signIn(page, owner, '/admin/branding')
  const panel = page.getByRole('region', { name: 'حالة نشر الموقع' })
  await expect(panel.getByText('الموقع قيد التجهيز')).toBeVisible()
  await expect(panel.getByText('الموقع غير متاح للزوار حاليًا، ويمكنك الاستمرار في إدارة المحتوى ومعاينة الموقع قبل إطلاقه.')).toBeVisible()
  await expect(panel.getByText('لم يُنشر الموقع بعد.')).toBeVisible()
  const switchControl = panel.getByRole('switch', { name: 'نشر الموقع للجمهور' })
  await expect(switchControl).toBeEnabled()
  await expect(switchControl).toHaveAttribute('aria-checked', 'false')

  // Cancelling changes nothing.
  await switchControl.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'نشر الموقع للجمهور؟' })).toBeVisible()
  await dialog.getByRole('button', { name: 'إلغاء' }).click()
  await expect(dialog).toBeHidden()
  await expect(switchControl).toHaveAttribute('aria-checked', 'false')
  expect(await readPublicationRow(request)).toEqual([])
  expect(await anonymousStatus(request, '/')).toBe(503)

  // Confirming saves, once.
  await switchControl.click()
  await dialog.getByRole('button', { name: 'نعم، انشر الموقع' }).click()
  await expect(page.getByText('تم نشر الموقع، وهو متاح الآن لجميع الزوار.')).toBeVisible()
  await expect(switchControl).toHaveAttribute('aria-checked', 'true')
  await expect(panel.getByText('الموقع منشور للجمهور')).toBeVisible()
  await expect(panel.getByText('الموقع متاح الآن لجميع الزوار ويمكنهم تصفح المقالات والمحتوى المنشور.')).toBeVisible()
  await expect(panel.getByText(/آخر تغيير: .* بواسطة مالك الاختبار/)).toBeVisible()
  const [row] = await readPublicationRow(request)
  expect(row?.value.mode).toBe('published')
  // The database, not the browser, says who did it.
  expect(row?.updated_by).toBe(ownerId)

  // Anonymous visitors now get the real site.
  await expectAnonymousStatus(request, '/', 200)
  const home = await request.get('/')
  expect(await home.text()).toContain(articleTitle)
  expect(home.headers()['x-robots-tag']).toBeUndefined()
  expect(home.headers()['cache-control'] ?? '').not.toContain('private')

  const article = await request.get(`/articles/${articleSlug}`)
  expect(article.status()).toBe(200)
  const html = await article.text()
  expect(html).toMatch(new RegExp(`<link[^>]+rel="canonical"[^>]+href="https://prof-ahmadza\\.com/articles/${articleSlug}"`))
  expect(html).toContain('application/ld+json')
  expect(html).not.toMatch(/name="robots"[^>]*noindex/)
  expect(html).not.toContain('معاينة المدير')
  expect((await request.get(`/articles/${draftSlug}`)).status()).toBe(404)

  const list = await (await request.get('/api/content?type=article')).json() as { items: Array<{ slug: string }> }
  expect(list.items.map(item => item.slug)).toEqual([articleSlug])

  // Search engines get a real robots.txt and sitemap again.
  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).toContain('Allow: /')
  expect(robots).toContain('Sitemap: https://prof-ahmadza.com/sitemap.xml')
  await expect.poll(async () => (await request.get('/sitemap.xml')).status(), { timeout: 20_000 }).toBe(200)
  expect(await (await request.get('/sitemap.xml')).text()).toContain(`/articles/${articleSlug}`)

  // The API behind the site opens with it.
  const direct = await (await request.get(rest('content_items?select=slug'), { headers: anonHeaders() })).json() as Array<{ slug: string }>
  expect(direct.map(item => item.slug).sort()).toEqual([articleSlug, videoSlug].sort())
  const sign = await request.post(`${supabaseUrl}/storage/v1/object/sign/videos/${files.videoPath}`, { headers: { ...anonHeaders(), 'content-type': 'application/json' }, data: { expiresIn: 60 } })
  expect(sign.ok()).toBe(true)
  expect((await request.get(`/api/videos/${videoSlug}/playback`)).status()).toBe(200)

  // Drafts never became public.
  const drafts = await (await request.get(rest(`content_items?select=slug&slug=eq.${draftSlug}`), { headers: anonHeaders() })).json() as unknown[]
  expect(drafts).toEqual([])
})

test('the owner returns the site to maintenance: a confirmation first, and the public loses it again', async ({ page, request }) => {
  await signIn(page, owner, '/admin/branding')
  const panel = page.getByRole('region', { name: 'حالة نشر الموقع' })
  const switchControl = panel.getByRole('switch', { name: 'نشر الموقع للجمهور' })
  await expect(switchControl).toHaveAttribute('aria-checked', 'true')

  await switchControl.click()
  const dialog = page.getByRole('dialog')
  await expect(dialog.getByRole('heading', { name: 'إعادة الموقع إلى وضع التجهيز؟' })).toBeVisible()
  await dialog.getByRole('button', { name: 'نعم، أعد الموقع إلى التجهيز' }).click()
  await expect(page.getByText('أُعيد الموقع إلى وضع التجهيز ولم يعد متاحًا للزوار.')).toBeVisible()
  await expect(switchControl).toHaveAttribute('aria-checked', 'false')
  await expect(panel.getByText('الموقع قيد التجهيز')).toBeVisible()
  expect((await readPublicationRow(request))[0]?.value.mode).toBe('maintenance')

  // The database follows at once; the site within its few-seconds cache.
  expect(await (await request.get(rest('content_items?select=slug'), { headers: anonHeaders() })).json()).toEqual([])
  await expectAnonymousStatus(request, '/', 503)
  await expectAnonymousStatus(request, `/articles/${articleSlug}`, 503)
  await expectAnonymousStatus(request, '/api/content', 503)
  await expectAnonymousStatus(request, '/sitemap.xml', 503)
  expect(await (await request.get('/robots.txt')).text()).not.toContain('Sitemap:')

  // The owner still has the dashboard and the preview.
  await page.goto('/admin')
  await expect(page.getByRole('region', { name: 'معاينة الموقع' }).getByText('الموقع قيد التجهيز')).toBeVisible()
  const [popup] = await Promise.all([page.waitForEvent('popup'), page.getByRole('navigation', { name: 'إدارة الموقع' }).getByRole('button', { name: 'معاينة الموقع' }).click()])
  await popup.waitForURL(url => new URL(url).pathname === '/')
  await expect(popup.getByText(articleTitle).first()).toBeVisible()
  await popup.close()
})

test('a broken or unreadable configuration never launches the site', async ({ request }) => {
  // A row that is not exactly {"mode":"published"} is maintenance: the database refuses malformed values, but if one existed it must still close the site.
  await setPublicationState(request, 'maintenance')
  await expectAnonymousStatus(request, '/', 503)
  const direct = await request.post(rest('rpc/site_is_published'), { headers: { ...anonHeaders(), 'content-type': 'application/json' }, data: {} })
  expect(await direct.json()).toBe(false)
  await setPublicationState(request, null)
  const absent = await request.post(rest('rpc/site_is_published'), { headers: { ...anonHeaders(), 'content-type': 'application/json' }, data: {} })
  expect(await absent.json()).toBe(false)
  await expectAnonymousStatus(request, '/', 503)
})

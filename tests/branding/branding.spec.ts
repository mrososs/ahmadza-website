import { expect, test, type Page } from '@playwright/test'
import { makePng } from '../support/png'
import { anonHeaders, clearBranding, configured, editor, expectNoRowsAffected, insertBrandingRow, owner, seedAdmin, settingRows, signInToken, supabaseUrl, userHeaders } from './support'

// Runs against a real local Supabase stack: real Auth, PostgREST row-level security and Storage limits.
test.skip(!configured, 'set BRANDING_SUPABASE_URL, BRANDING_SUPABASE_KEY and BRANDING_SUPABASE_SECRET_KEY for a local stack')
test.describe.configure({ mode: 'serial' })

const shots = 'artifacts/branding'
const viewports = [{ name: '1440', width: 1440, height: 1000 }, { name: '768', width: 768, height: 1000 }, { name: '390', width: 390, height: 844 }]
const bundledLogo = '/branding/header-logo-ahmad-alzahrani.webp'
const bundledHero = '/branding/hero-ahmad-alzahrani.webp'
const logoFolder = '/storage/v1/object/public/site-branding/header-logo/'
const heroFolder = '/storage/v1/object/public/site-branding/hero-image/'

let firstLogoPath = ''

async function signIn(page: Page, account: typeof owner, target = '/admin/branding') {
  await page.goto(target)
  await page.getByRole('heading', { level: 1, name: 'تسجيل دخول المدير' }).waitFor()
  await page.getByLabel('البريد الإلكتروني').fill(account.email)
  await page.getByLabel('كلمة المرور').fill(account.password)
  await page.getByRole('button', { name: 'دخول' }).click()
}

const slot = (page: Page, area: 'headerLogo' | 'heroImage') => page.getByTestId(`branding-${area}`)
const headerLogo = (page: Page) => page.locator('.site-header .brand-mark__artwork')
const heroArtwork = (page: Page) => page.locator('.library-masthead__name img')
const hydrated = (page: Page) => page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' })

async function publicHome(page: Page, width = 1440, height = 1000) {
  await page.setViewportSize({ width, height })
  await page.goto('/')
  await hydrated(page)
  await expect(heroArtwork(page)).toBeVisible()
  await page.waitForFunction(() => [...document.images].every(image => image.complete))
}

test.beforeAll(async ({ request }) => {
  await seedAdmin(request, owner)
  await seedAdmin(request, editor)
  await clearBranding(request)
})

test('before: the public site serves the bundled artwork', async ({ page, request }) => {
  await publicHome(page)
  await expect(headerLogo(page).first()).toHaveAttribute('src', bundledLogo)
  await expect(heroArtwork(page)).toHaveAttribute('src', bundledHero)
  expect((await (await request.get('/api/branding')).json() as { branding: Record<string, { custom: boolean }> }).branding.headerLogo.custom).toBe(false)
  for (const viewport of viewports) {
    await publicHome(page, viewport.width, viewport.height)
    await page.screenshot({ path: `${shots}/before-public-${viewport.name}.png` })
  }
})

test('owner sees the current images and the guidance on /admin/branding', async ({ page }) => {
  await signIn(page, owner)
  await expect(page.getByRole('heading', { level: 1, name: 'هوية الموقع' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'إدارة الموقع' }).getByRole('link', { name: 'هوية الموقع' })).toHaveAttribute('aria-current', 'page')

  const logo = slot(page, 'headerLogo')
  await expect(logo.getByRole('heading', { level: 2, name: 'شعار الموقع' })).toBeVisible()
  await expect(logo.getByTestId('branding-helper')).toHaveText('المقاس الموصى به: 1200 × 500 بكسل (نسبة 12:5، عريضة قليلًا). الصيغ المدعومة: PNG أو WebP. يُفضّل استخدام خلفية شفافة. الحد الأقصى: 5 ميجابايت.')
  await expect(logo.getByTestId('branding-current').getByRole('img')).toHaveAttribute('src', bundledLogo)
  const hero = slot(page, 'heroImage')
  await expect(hero.getByRole('heading', { level: 2, name: 'صورة الواجهة الرئيسية' })).toBeVisible()
  await expect(hero.getByTestId('branding-helper')).toHaveText('المقاس الموصى به: 1600 × 900 بكسل (نسبة 16:9). الصيغ المدعومة: PNG أو WebP. يُفضّل استخدام خلفية شفافة. الحد الأقصى: 5 ميجابايت.')
  await expect(hero.getByTestId('branding-current').getByRole('img')).toHaveAttribute('src', bundledHero)
  await page.screenshot({ path: `${shots}/before-admin-1440.png`, fullPage: true })
})

test('unsupported, oversized and unreadable files are rejected in the form', async ({ page }) => {
  await signIn(page, owner)
  const logo = slot(page, 'headerLogo')
  const input = logo.locator('input[type="file"]')
  await input.setInputFiles({ name: 'logo.jpg', mimeType: 'image/jpeg', buffer: makePng(800, 600) })
  await expect(logo.getByRole('alert')).toContainText('PNG أو WebP')
  await input.setInputFiles({ name: 'logo.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>') })
  await expect(logo.getByRole('alert')).toContainText('PNG أو WebP')
  await input.setInputFiles({ name: 'huge.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) })
  await expect(logo.getByRole('alert')).toContainText('أكبر من 5 ميجابايت')
  await input.setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not an image') })
  await expect(logo.getByRole('alert')).toContainText('تعذر قراءة الصورة')
  await expect(logo.getByRole('button', { name: 'حفظ التغييرات' })).toBeDisabled()
})

test('owner saves a header logo and it is still there after a reload', async ({ page, request }) => {
  await signIn(page, owner)
  const logo = slot(page, 'headerLogo')
  await logo.locator('input[type="file"]').setInputFiles({ name: 'شعار.png', mimeType: 'image/png', buffer: makePng(800, 600) })
  await expect(logo.getByTestId('branding-new')).toContainText('800 × 600')
  await expect(logo.getByTestId('branding-new').getByRole('img')).toBeVisible()
  await page.screenshot({ path: `${shots}/admin-logo-preview-1440.png`, fullPage: true })

  await logo.getByRole('button', { name: 'حفظ التغييرات' }).click()
  await expect(logo.getByRole('status').filter({ hasText: 'تم حفظ شعار الموقع' })).toBeVisible()
  await expect(logo.getByTestId('branding-current').getByRole('img')).toHaveAttribute('src', new RegExp(logoFolder))
  // The admin bar follows the saved logo too.
  await expect(page.locator('.admin-brand img')).toHaveAttribute('src', new RegExp(logoFolder))
  // The hero form is untouched.
  await expect(slot(page, 'heroImage').getByTestId('branding-current').getByRole('img')).toHaveAttribute('src', bundledHero)

  await page.reload()
  await expect(page.getByRole('heading', { level: 1, name: 'هوية الموقع' })).toBeVisible()
  const current = logo.getByTestId('branding-current')
  await expect(current).toContainText('مرفوعة')
  await expect(current.getByRole('img')).toHaveAttribute('src', new RegExp(logoFolder))
  await expect(current).toContainText('800 × 600')

  const rows = await settingRows(request)
  expect(rows.map(row => row.key)).toEqual(['branding.header_logo'])
  expect(rows[0]?.updated_by).not.toBeNull()
  firstLogoPath = rows[0]?.value.storagePath ?? ''
  expect(firstLogoPath).toMatch(/^header-logo\/[0-9a-f-]{36}\.png$/)
})

test('the saved logo is served to anonymous visitors, server-rendered, without extra requests', async ({ request, browser }) => {
  // Anonymous readers can see the settings row and fetch the image.
  const rows = await request.get(`${supabaseUrl}/rest/v1/site_settings?select=key&key=like.branding.*`, { headers: anonHeaders() })
  expect(((await rows.json()) as unknown[]).length).toBe(1)
  const image = await request.get(`${supabaseUrl}/storage/v1/object/public/site-branding/${firstLogoPath}`)
  expect(image.status()).toBe(200)
  expect(image.headers()['content-type']).toBe('image/png')

  // The first HTML a visitor receives already carries the uploaded logo (no flash of the old one).
  const html = await (await request.get('/')).text()
  expect(html).toContain(`${logoFolder}${firstLogoPath.split('/')[1]}`)
  const api = await request.get('/api/branding')
  expect(api.headers()['cache-control']).toBe('no-store')

  // A visitor's browser: no console errors or hydration warnings, and no second branding request after SSR.
  const visitor = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'ar-EG' })
  const visitorPage = await visitor.newPage()
  const problems: string[] = []
  const brandingRequests: string[] = []
  visitorPage.on('console', message => { if (['error', 'warning'].includes(message.type())) problems.push(message.text()) })
  visitorPage.on('pageerror', error => problems.push(error.message))
  visitorPage.on('request', req => { if (req.url().includes('/api/branding')) brandingRequests.push(req.url()) })
  await publicHome(visitorPage)
  const logo = headerLogo(visitorPage).first()
  await expect(logo).toHaveAttribute('src', new RegExp(logoFolder))
  expect(await logo.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(800)
  await expect(heroArtwork(visitorPage)).toHaveAttribute('src', bundledHero)
  expect(brandingRequests).toEqual([])
  expect(problems.filter(text => !/favicon|devtools|vite|HMR/i.test(text))).toEqual([])
  await visitor.close()
})

test('owner saves a hero image; both public images update and stay whole at 1440, 768 and 390', async ({ page }) => {
  await signIn(page, owner)
  const hero = slot(page, 'heroImage')
  await hero.locator('input[type="file"]').setInputFiles({ name: 'hero.png', mimeType: 'image/png', buffer: makePng(1600, 1200) })
  await expect(hero.getByTestId('branding-new')).toContainText('1600 × 1200')
  await hero.getByRole('button', { name: 'حفظ التغييرات' }).click()
  await expect(hero.getByRole('status').filter({ hasText: 'تم حفظ صورة الواجهة الرئيسية' })).toBeVisible()
  await page.screenshot({ path: `${shots}/after-admin-1440.png`, fullPage: true })

  for (const viewport of viewports) {
    await publicHome(page, viewport.width, viewport.height)
    await expect(headerLogo(page).first()).toHaveAttribute('src', new RegExp(logoFolder))
    await expect(heroArtwork(page)).toHaveAttribute('src', new RegExp(heroFolder))
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth), `overflow at ${viewport.name}`).toBeLessThanOrEqual(0)

    const fit = await page.evaluate(() => {
      const box = (element: Element) => element.getBoundingClientRect()
      const hero = document.querySelector<HTMLImageElement>('.library-masthead__name img')
      const logo = document.querySelector<HTMLImageElement>('.site-header .brand-mark__artwork')
      const stage = document.querySelector('.library-masthead__name')
      if (!hero || !logo || !stage) return null
      return { heroFit: getComputedStyle(hero).objectFit, logoFit: getComputedStyle(logo).objectFit, heroNatural: [hero.naturalWidth, hero.naturalHeight], logoNatural: [logo.naturalWidth, logo.naturalHeight], hero: box(hero).toJSON(), stage: box(stage).toJSON(), width: window.innerWidth }
    })
    expect(fit, viewport.name).not.toBeNull()
    expect(fit?.heroFit).toBe('contain')
    expect(fit?.logoFit).toBe('contain')
    expect(fit?.heroNatural).toEqual([1600, 1200])
    expect(fit?.logoNatural).toEqual([800, 600])
    // Nothing clipped: the artwork sits inside the stage and inside the viewport, at its own 4:3 shape.
    expect(fit!.hero.left).toBeGreaterThanOrEqual(-0.5)
    expect(fit!.hero.right).toBeLessThanOrEqual(fit!.width + 0.5)
    expect(fit!.hero.width / fit!.hero.height).toBeCloseTo(4 / 3, 1)
    await page.screenshot({ path: `${shots}/after-public-${viewport.name}.png` })
  }
})

test('a wide hero is letterboxed, never cropped or stretched, and the sticky header keeps the logo', async ({ page }) => {
  await signIn(page, owner)
  const hero = slot(page, 'heroImage')
  await hero.locator('input[type="file"]').setInputFiles({ name: 'wide.png', mimeType: 'image/png', buffer: makePng(1800, 700) })
  await expect(hero.getByRole('list', { name: 'تنبيهات على الصورة الجديدة' })).toContainText('نسبة الصورة تختلف عن 16:9')
  await hero.getByRole('button', { name: 'حفظ التغييرات' }).click()
  await expect(hero.getByRole('status').filter({ hasText: 'تم حفظ' })).toBeVisible()

  for (const viewport of viewports) {
    await publicHome(page, viewport.width, viewport.height)
    const rect = await page.evaluate(() => {
      const image = document.querySelector<HTMLImageElement>('.library-masthead__name img')
      const stage = document.querySelector('.library-masthead__name')
      if (!image || !stage) return null
      return { image: image.getBoundingClientRect().toJSON(), stage: stage.getBoundingClientRect().toJSON(), fit: getComputedStyle(image).objectFit, width: window.innerWidth }
    })
    expect(rect?.fit).toBe('contain')
    expect(rect!.image.left).toBeGreaterThanOrEqual(-0.5)
    expect(rect!.image.right).toBeLessThanOrEqual(rect!.width + 0.5)
    expect(rect!.image.bottom).toBeLessThanOrEqual(rect!.stage.bottom + 0.5)
  }

  await publicHome(page, 1440, 1000)
  await page.evaluate(() => window.scrollTo(0, 600))
  await expect(page.locator('.site-header--stuck')).toBeVisible()
  await expect(headerLogo(page).first()).toBeVisible()
  expect(await headerLogo(page).first().evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(800)
})

test('restoring the logo asks first, then brings back the bundled image without touching the hero', async ({ page, request }) => {
  await signIn(page, owner)
  const logo = slot(page, 'headerLogo')
  await logo.getByRole('button', { name: 'استعادة الصورة الافتراضية' }).click()
  const dialog = logo.getByRole('dialog', { name: 'استعادة الصورة الافتراضية؟' })
  await dialog.getByRole('button', { name: 'إلغاء' }).click()
  await expect(logo.getByTestId('branding-current').getByRole('img')).toHaveAttribute('src', new RegExp(logoFolder))

  await logo.getByRole('button', { name: 'استعادة الصورة الافتراضية' }).click()
  await dialog.getByRole('button', { name: 'نعم، استعد الصورة الافتراضية' }).click()
  await expect(logo.getByRole('status').filter({ hasText: 'عاد شعار الموقع إلى الصورة الافتراضية' })).toBeVisible()
  await expect(logo.getByTestId('branding-current').getByRole('img')).toHaveAttribute('src', bundledLogo)
  await expect(page.locator('.admin-brand img')).toHaveAttribute('src', bundledLogo)
  expect((await settingRows(request)).map(row => row.key)).toEqual(['branding.hero_image'])

  await publicHome(page)
  await expect(headerLogo(page).first()).toHaveAttribute('src', bundledLogo)
  await expect(heroArtwork(page)).toHaveAttribute('src', new RegExp(heroFolder))
})

test('restoring the hero brings back the bundled artwork', async ({ page, request }) => {
  await signIn(page, owner)
  const hero = slot(page, 'heroImage')
  await hero.getByRole('button', { name: 'استعادة الصورة الافتراضية' }).click()
  await hero.getByRole('dialog').getByRole('button', { name: 'نعم، استعد الصورة الافتراضية' }).click()
  await expect(hero.getByRole('status').filter({ hasText: 'عادت صورة الواجهة الرئيسية' })).toBeVisible()
  expect(await settingRows(request)).toEqual([])

  for (const viewport of viewports) {
    await publicHome(page, viewport.width, viewport.height)
    await expect(heroArtwork(page)).toHaveAttribute('src', bundledHero)
    await expect(headerLogo(page).first()).toHaveAttribute('src', bundledLogo)
    await page.screenshot({ path: `${shots}/restored-public-${viewport.name}.png` })
  }
})

test('a saved image that can no longer be loaded falls back to the bundled artwork', async ({ page }) => {
  await signIn(page, owner)
  const logo = slot(page, 'headerLogo')
  await logo.locator('input[type="file"]').setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: makePng(800, 600) })
  await logo.getByRole('button', { name: 'حفظ التغييرات' }).click()
  await expect(logo.getByRole('status').filter({ hasText: 'تم حفظ شعار الموقع' })).toBeVisible()

  await page.route('**/storage/v1/object/public/site-branding/**', route => route.abort())
  await publicHome(page)
  await expect(headerLogo(page).first()).toHaveAttribute('src', bundledLogo)
  expect(await headerLogo(page).first().evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0)
  await page.unroute('**/storage/v1/object/public/site-branding/**')

  // Leave the stack clean for the next run. The session is still active, so there is no login form this time.
  await page.goto('/admin/branding')
  await expect(page.getByRole('heading', { level: 1, name: 'هوية الموقع' })).toBeVisible()
  await logo.getByRole('button', { name: 'استعادة الصورة الافتراضية' }).click()
  await logo.getByRole('dialog').getByRole('button', { name: 'نعم، استعد الصورة الافتراضية' }).click()
  await expect(logo.getByRole('status').filter({ hasText: 'عاد شعار الموقع' })).toBeVisible()
})

test('anonymous visitors cannot write settings or upload branding files', async ({ request }) => {
  const value = { url: `${supabaseUrl}/storage/v1/object/public/site-branding/${firstLogoPath}`, storagePath: firstLogoPath, alt: 'x', width: 800, height: 600 }
  const insert = await request.post(`${supabaseUrl}/rest/v1/site_settings`, { headers: { ...anonHeaders(), 'content-type': 'application/json' }, data: { key: 'branding.header_logo', value, public_readable: true } })
  expect(insert.status()).toBeGreaterThanOrEqual(400)
  const upload = await request.post(`${supabaseUrl}/storage/v1/object/site-branding/header-logo/00000000-0000-4000-8000-000000000000.png`, { headers: anonHeaders(), multipart: { file: { name: 'a.png', mimeType: 'image/png', buffer: makePng(800, 600) } } })
  expect(upload.status()).toBeGreaterThanOrEqual(400)
  expect(await settingRows(request)).toEqual([])

  // An existing row cannot be edited or deleted anonymously either.
  await insertBrandingRow(request, 'branding.header_logo', firstLogoPath)
  const tampered = { ...value, alt: 'tampered' }
  const json = { ...anonHeaders(), 'content-type': 'application/json', prefer: 'return=representation' }
  expect(await expectNoRowsAffected(await request.patch(`${supabaseUrl}/rest/v1/site_settings?key=eq.branding.header_logo`, { headers: json, data: { value: tampered } }))).toBe(true)
  expect(await expectNoRowsAffected(await request.delete(`${supabaseUrl}/rest/v1/site_settings?key=eq.branding.header_logo`, { headers: json }))).toBe(true)
  const removal = await request.delete(`${supabaseUrl}/storage/v1/object/site-branding/${firstLogoPath}`, { headers: anonHeaders() })
  expect(removal.status()).toBeGreaterThanOrEqual(400)
  const rows = await settingRows(request)
  expect(rows.map(row => row.key)).toEqual(['branding.header_logo'])
  expect((rows[0]?.value as { alt?: string }).alt).toBe('seed')
  await clearBranding(request)
})

test('a non-owner admin cannot change branding in the UI or through the API', async ({ page, request }) => {
  await signIn(page, editor, '/admin')
  await expect(page.getByRole('heading', { level: 1, name: 'لوحة التحكم' })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'إدارة الموقع' }).getByRole('link', { name: 'هوية الموقع' })).toHaveCount(0)
  await page.goto('/admin/branding')
  await expect(page.getByText('تغيير هوية الموقع متاح لمالك الموقع فقط')).toBeVisible()
  for (const area of ['headerLogo', 'heroImage'] as const) {
    await expect(slot(page, area).getByRole('button', { name: 'اختيار صورة' })).toBeDisabled()
  }

  const token = await signInToken(request, editor)
  const value = { url: `${supabaseUrl}/storage/v1/object/public/site-branding/header-logo/00000000-0000-4000-8000-000000000000.png`, storagePath: 'header-logo/00000000-0000-4000-8000-000000000000.png', alt: 'x', width: 800, height: 600 }
  const write = await request.post(`${supabaseUrl}/rest/v1/site_settings`, { headers: { ...userHeaders(token), 'content-type': 'application/json' }, data: { key: 'branding.header_logo', value, public_readable: true } })
  expect(write.status()).toBeGreaterThanOrEqual(400)
  const upload = await request.post(`${supabaseUrl}/storage/v1/object/site-branding/header-logo/00000000-0000-4000-8000-000000000001.png`, { headers: userHeaders(token), multipart: { file: { name: 'a.png', mimeType: 'image/png', buffer: makePng(800, 600) } } })
  expect(upload.status()).toBeGreaterThanOrEqual(400)
  expect(await settingRows(request)).toEqual([])

  // ...nor can an editor edit or delete what the owner saved, or remove its file.
  await insertBrandingRow(request, 'branding.hero_image', firstLogoPath.replace('header-logo', 'hero-image'))
  const json = { ...userHeaders(token), 'content-type': 'application/json', prefer: 'return=representation' }
  expect(await expectNoRowsAffected(await request.patch(`${supabaseUrl}/rest/v1/site_settings?key=eq.branding.hero_image`, { headers: json, data: { value: { ...value, alt: 'tampered' } } }))).toBe(true)
  expect(await expectNoRowsAffected(await request.delete(`${supabaseUrl}/rest/v1/site_settings?key=eq.branding.hero_image`, { headers: json }))).toBe(true)
  const removal = await request.delete(`${supabaseUrl}/storage/v1/object/site-branding/${firstLogoPath}`, { headers: userHeaders(token) })
  const stillThere = await request.get(`${supabaseUrl}/storage/v1/object/public/site-branding/${firstLogoPath}`)
  expect(removal.status() >= 400 || stillThere.status() === 200).toBe(true)
  expect(stillThere.status()).toBe(200)
  expect((await settingRows(request)).map(row => row.key)).toEqual(['branding.hero_image'])
  await clearBranding(request)
})

test('the database and storage reject bad values even for the owner', async ({ request }) => {
  const token = await signInToken(request, owner)
  const json = { ...userHeaders(token), 'content-type': 'application/json' }
  const goodPath = 'header-logo/11111111-1111-4111-8111-111111111111.png'
  const publicUrl = (path: string) => `${supabaseUrl}/storage/v1/object/public/site-branding/${path}`
  const row = (key: string, value: object, publicReadable = true) => request.post(`${supabaseUrl}/rest/v1/site_settings`, { headers: json, data: { key, value, public_readable: publicReadable } })

  // Settings: a foreign URL, a path from the wrong folder, a bad extension, a hidden row and an unrelated key are all refused.
  expect((await row('branding.header_logo', { url: 'https://evil.example/logo.png', storagePath: goodPath, alt: 'x', width: 800, height: 600 })).status()).toBeGreaterThanOrEqual(400)
  expect((await row('branding.header_logo', { url: publicUrl('hero-image/11111111-1111-4111-8111-111111111111.png'), storagePath: 'hero-image/11111111-1111-4111-8111-111111111111.png', alt: 'x', width: 800, height: 600 })).status()).toBeGreaterThanOrEqual(400)
  expect((await row('branding.header_logo', { url: publicUrl('header-logo/11111111-1111-4111-8111-111111111111.svg'), storagePath: 'header-logo/11111111-1111-4111-8111-111111111111.svg', alt: 'x', width: 800, height: 600 })).status()).toBeGreaterThanOrEqual(400)
  expect((await row('branding.header_logo', { url: publicUrl(goodPath), storagePath: goodPath, alt: 'x', width: 800, height: 600 }, false)).status()).toBeGreaterThanOrEqual(400)
  expect((await row('site.title', { url: publicUrl(goodPath), storagePath: goodPath, alt: 'x', width: 800, height: 600 })).status()).toBeGreaterThanOrEqual(400)
  expect(await settingRows(request)).toEqual([])

  // Storage: wrong type, oversized, arbitrary path, and overwriting an existing object are all refused.
  const upload = (path: string, name: string, mimeType: string, buffer: Buffer, extra: Record<string, string> = {}) =>
    request.post(`${supabaseUrl}/storage/v1/object/site-branding/${path}`, { headers: { ...userHeaders(token), ...extra }, multipart: { file: { name, mimeType, buffer } } })
  expect((await upload('header-logo/22222222-2222-4222-8222-222222222222.png', 'a.jpg', 'image/jpeg', makePng(800, 600))).status()).toBeGreaterThanOrEqual(400)
  expect((await upload('header-logo/33333333-3333-4333-8333-333333333333.png', 'a.svg', 'image/svg+xml', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>'))).status()).toBeGreaterThanOrEqual(400)
  expect((await upload('header-logo/44444444-4444-4444-8444-444444444444.png', 'big.png', 'image/png', Buffer.alloc(5 * 1024 * 1024 + 1024))).status()).toBeGreaterThanOrEqual(400)
  expect((await upload('evil/x.png', 'x.png', 'image/png', makePng(800, 600))).status()).toBeGreaterThanOrEqual(400)
  expect((await upload('header-logo/not-a-uuid.png', 'x.png', 'image/png', makePng(800, 600))).status()).toBeGreaterThanOrEqual(400)

  const ok = await upload(goodPath.replace('1111', '5555'), 'ok.png', 'image/png', makePng(800, 600))
  expect(ok.status()).toBe(200)
  const overwrite = await upload(goodPath.replace('1111', '5555'), 'ok.png', 'image/png', makePng(800, 600), { 'x-upsert': 'true' })
  expect(overwrite.status()).toBeGreaterThanOrEqual(400)
  // Clean up the one file this test created (the owner may delete branding files).
  const removed = await request.delete(`${supabaseUrl}/storage/v1/object/site-branding/${goodPath.replace('1111', '5555')}`, { headers: userHeaders(token) })
  expect(removed.status()).toBe(200)
})

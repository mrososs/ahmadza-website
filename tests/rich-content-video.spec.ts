import { expect, test, type Page } from '@playwright/test'
import { makePng } from './support/png'

// Runs on the labelled demo data, like the rest of the suite. Behaviour that needs real Supabase Storage (uploads, signed URLs,
// storage policies) cannot run here; see docs/RICH_CONTENT_AND_VIDEO.md for how it was verified.
const usesRealBackend = Boolean(process.env.NUXT_PUBLIC_SUPABASE_URL)

async function waitForHydration(page: Page) {
  await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' })
}

async function signInDemo(page: Page, target: string) {
  await page.goto(target)
  await page.getByRole('heading', { level: 1, name: 'تسجيل دخول المدير' }).waitFor()
  await page.getByLabel('البريد الإلكتروني').fill('editor@example.com')
  await page.getByLabel('كلمة المرور').fill('demo-password')
  await page.getByRole('button', { name: 'دخول' }).click()
}

const overflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)

test.describe('content cards', () => {
  test('article listing shows cards, loads every picture and has no horizontal overflow', async ({ page }) => {
    await page.goto('/articles')
    await waitForHydration(page)
    const cards = page.locator('.content-card')
    expect(await cards.count()).toBeGreaterThan(3)
    // The sample article has a cover; the others use the local fallback. Neither may show a broken image.
    await expect(page.locator('.content-card img').first()).toBeVisible()
    await expect(page.locator('.content-cover__fallback').first()).toBeAttached()
    const broken = await page.locator('.content-card img').evaluateAll(images => images.filter(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth === 0).length)
    expect(broken).toBe(0)
    expect(await overflow(page)).toBeLessThanOrEqual(0)
  })

  test('grid is multi-column on wide screens and single-column on phones', async ({ page }, testInfo) => {
    await page.goto('/articles')
    await waitForHydration(page)
    const lefts = await page.locator('.content-card').evaluateAll(nodes => new Set(nodes.slice(0, 4).map(node => Math.round(node.getBoundingClientRect().left))).size)
    if (testInfo.project.name.includes('mobile')) expect(lefts).toBe(1)
    else expect(lefts).toBeGreaterThanOrEqual(3)
  })

  test('a card opens the right detail page with one tab stop', async ({ page }) => {
    await page.goto('/articles')
    await waitForHydration(page)
    const card = page.locator('.content-card', { hasText: 'القراءة بمنهج' }).first()
    expect(await card.getByRole('link').count()).toBe(1)
    await card.getByRole('link').click()
    await expect(page).toHaveURL(/\/articles\/reading-with-a-method$/)
    await expect(page.getByRole('heading', { level: 1 })).toContainText('القراءة بمنهج')
  })

  test('video listing cards open video detail pages that show a labelled empty state and no download', async ({ page }) => {
    await page.goto('/videos')
    await waitForHydration(page)
    await page.locator('.content-card', { hasText: 'كيف تنظّم مشروعًا بحثيًا صغيرًا؟' }).getByRole('link').click()
    await expect(page).toHaveURL(/\/videos\/organising-a-small-research-project$/)
    await expect(page.getByText('لا يوجد رابط فيديو')).toBeVisible()
    await expect(page.getByRole('link', { name: 'تنزيل الفيديو' })).toHaveCount(0)
  })

  test('homepage latest publications use the same card and keep their links', async ({ page }) => {
    await page.goto('/')
    await waitForHydration(page)
    const cards = page.locator('.latest-publications .content-card')
    expect(await cards.count()).toBe(6)
    await expect(cards.first().getByRole('link')).toHaveAttribute('href', /\/(articles|books|videos|sermons|audio|benefits)\//)
    await expect(page.locator('#main-content h2')).toHaveText(['أحدث المنشورات'])
  })
})

test.describe('article detail', () => {
  test('renders rich text with typography, a contents list, safe links, structured data and SEO tags', async ({ page }) => {
    await page.goto('/articles/formatted-article-sample')
    await waitForHydration(page)
    const body = page.locator('.article-prose')
    await expect(body.locator('h2')).toHaveText('العنوان الرئيس للفقرة')
    await expect(body.locator('h3')).toHaveText('عنوان فرعي')
    await expect(body.locator('h4')).toHaveText('عنوان ثالث المستوى')
    await expect(body.locator('ul li')).toHaveCount(2)
    await expect(body.locator('ol li')).toHaveCount(2)
    await expect(body.locator('blockquote')).toBeVisible()
    await expect(body.locator('a')).toHaveAttribute('rel', /noopener/)
    await expect(page.locator('h1')).toHaveCount(1)
    // Rich content is in the server-rendered HTML, so it is indexable.
    const html = await (await page.request.get('/articles/formatted-article-sample')).text()
    expect(html).toContain('العنوان الرئيس للفقرة')
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', /\/articles\/formatted-article-sample$/)
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', /ahmad-zayed-banner\.png$/)
    const schemas = await page.locator('script[type="application/ld+json"]').allTextContents()
    const types = schemas.map(text => (JSON.parse(text) as { '@type': string })['@type'])
    expect(types).toEqual(expect.arrayContaining(['Article', 'BreadcrumbList']))
    // The contents list jumps to a real heading.
    await page.getByRole('navigation', { name: 'في هذه الصفحة' }).getByRole('link', { name: 'العنوان الرئيس للفقرة' }).click()
    await expect(page).toHaveURL(/#s0-1$/)
    expect(await overflow(page)).toBeLessThanOrEqual(0)
  })

  test('legacy plain-text articles still render as before', async ({ page }) => {
    await page.goto('/articles/reading-with-a-method')
    await expect(page.getByRole('heading', { level: 2, name: 'السؤال قبل الاقتباس' })).toBeVisible()
    await expect(page.locator('.reading-body blockquote')).toContainText('الملاحظة الجيدة')
  })
})

test.describe('home strip', () => {
  test('latest strip is navy with white text and no orange fills, and can be paused', async ({ page }, testInfo) => {
    await page.goto('/')
    await waitForHydration(page)
    const strip = page.locator('.latest-ticker')
    await expect(strip).toHaveCSS('background-color', 'rgb(23, 48, 59)')
    const link = strip.locator('.latest-ticker__set a').first()
    await expect(link).toHaveCSS('color', 'rgb(255, 255, 255)')
    await expect(link).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)')
    const track = strip.locator('.latest-ticker__track')
    if (testInfo.project.name.includes('mobile')) return
    await expect(track).toHaveCSS('animation-play-state', 'running')
    await strip.getByRole('button', { name: /إيقاف/ }).click()
    await expect(track).toHaveCSS('animation-play-state', 'paused')
    await expect(strip.getByRole('button', { name: /تشغيل/ })).toHaveAttribute('aria-pressed', 'true')
  })

  test('respects reduced motion', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce', locale: 'ar-EG' })
    const page = await context.newPage()
    await page.goto('/')
    await waitForHydration(page)
    await expect(page.locator('.latest-ticker__track')).toHaveCSS('animation-name', 'none')
    await context.close()
  })
})

test.describe('video endpoints', () => {
  test('playback and download refuse bad slugs and unknown or non-uploaded videos', async ({ request }) => {
    expect((await request.get('/api/videos/BAD SLUG!/playback')).status()).toBe(400)
    expect((await request.get('/api/videos/no-such-video/playback')).status()).toBe(404)
    // A demo video has no uploaded file, so there is nothing to download, whatever the flag says.
    const download = await request.get('/api/videos/organising-a-small-research-project/download', { maxRedirects: 0 })
    expect(download.status()).toBe(404)
  })

  test('responses are never cached because signed URLs expire', async ({ request }) => {
    const response = await request.get('/api/videos/no-such-video/playback')
    // Success responses send no-store (see resolveVideoAccess); an error response must in any case never be publicly cacheable.
    expect(response.headers()['cache-control']).toMatch(/no-store|no-cache/)
  })
})

test.describe('admin: rich text editor', () => {
  test.skip(usesRealBackend, 'demo-only flow')

  test('creates a formatted article, previews it, saves and reopens it without losing formatting', async ({ page }) => {
    await signInDemo(page, '/admin/content/new')
    const editor = page.getByTestId('rich-text-editor')
    await editor.waitFor({ timeout: 60_000 })
    const surface = page.locator('.ql-editor')
    await surface.click()
    await expect(surface).toHaveAttribute('dir', 'rtl')

    await page.getByLabel('نمط الفقرة').selectOption('2')
    await page.keyboard.type('عنوان رئيسي')
    await page.keyboard.press('Enter')
    await page.getByLabel('نمط الفقرة').selectOption('0')
    await page.getByRole('button', { name: 'عريض' }).click()
    await page.keyboard.type('نص عريض')
    await page.getByRole('button', { name: 'عريض' }).click()
    await page.keyboard.press('Enter')
    await page.getByRole('button', { name: 'قائمة مرقمة' }).click()
    await page.keyboard.type('الأول')
    await page.keyboard.press('Enter')
    await page.keyboard.type('الثاني')
    await page.keyboard.press('Enter')
    await page.keyboard.press('Enter')
    await page.keyboard.type('<script>alert(1)</script> رابط')
    await page.keyboard.press('Shift+Home')
    await page.getByRole('button', { name: 'رابط', exact: true }).click()
    await page.locator('#rte-link-input').fill('javascript:alert(1)')
    await page.getByRole('button', { name: 'تطبيق' }).click()
    await expect(page.getByText('الرابط غير صالح')).toBeVisible()
    await page.locator('#rte-link-input').fill('example.com')
    await page.getByRole('button', { name: 'تطبيق' }).click()

    await page.getByTestId('rte-preview').click()
    const preview = page.getByTestId('rte-preview-pane')
    await expect(preview.locator('h2')).toHaveText('عنوان رئيسي')
    await expect(preview.locator('strong')).toHaveText('نص عريض')
    await expect(preview.locator('ol li')).toHaveCount(2)
    await expect(preview.locator('a')).toHaveAttribute('href', 'https://example.com')
    // Typed markup is text, never an element.
    await expect(preview.locator('script')).toHaveCount(0)

    await page.getByLabel('العنوان', { exact: true }).fill('مقال منسق من المحرر')
    await page.getByRole('button', { name: 'حفظ المادة' }).click()
    await expect(page.getByText('تمت إضافة المادة.')).toBeVisible()
    await page.getByTestId('rich-text-editor').waitFor()
    const reopened = page.locator('.ql-editor')
    await expect(reopened.locator('h2')).toHaveText('عنوان رئيسي')
    await expect(reopened.locator('strong')).toHaveText('نص عريض')
    await expect(reopened.locator('li')).toHaveCount(2)

    // Editing again keeps the content.
    await reopened.locator('p').last().click()
    await page.keyboard.press('End')
    await page.keyboard.type(' وتعديل')
    await page.getByRole('button', { name: 'حفظ المادة' }).click()
    await expect(page.getByText('تم حفظ التعديلات.')).toBeVisible()
  })

  test('opens an older plain-text article in the editor with all of its text', async ({ page }) => {
    await signInDemo(page, '/admin/content')
    await page.getByRole('link', { name: /القراءة بمنهج/ }).first().click()
    const surface = page.locator('.ql-editor')
    await expect(surface).toContainText('السؤال قبل الاقتباس', { timeout: 60_000 })
    await expect(surface).toContainText('الملاحظة الجيدة لا تجمع الكلمات')
    await expect(surface.locator('h2')).toHaveCount(2)
    await expect(surface.locator('blockquote')).toHaveCount(1)
  })

  test('toolbar is reachable by keyboard and exposes pressed state', async ({ page }) => {
    await signInDemo(page, '/admin/content/new')
    await page.getByTestId('rich-text-editor').waitFor({ timeout: 60_000 })
    await page.locator('.ql-editor').click()
    const bold = page.getByRole('button', { name: 'عريض' })
    await expect(bold).toHaveAttribute('aria-pressed', 'false')
    await bold.focus()
    await page.keyboard.press('Enter')
    await expect(bold).toHaveAttribute('aria-pressed', 'true')
  })

  test('cover image: wrong type and tiny pictures are rejected before upload', async ({ page }) => {
    await signInDemo(page, '/admin/content/new')
    const cover = page.getByTestId('upload-image')
    await cover.waitFor({ timeout: 60_000 })
    await cover.locator('input[type="file"]').setInputFiles({ name: 'tiny.png', mimeType: 'image/png', buffer: makePng(40, 40, 'opaque') })
    await expect(cover.getByText('الصورة صغيرة جدًا')).toBeVisible()
    await cover.locator('input[type="file"]').setInputFiles({ name: 'x.gif', mimeType: 'image/gif', buffer: Buffer.from('GIF89a') })
    await expect(cover.getByRole('alert')).toContainText('PNG أو WEBP')
  })
})

test.describe('admin: video source', () => {
  test.skip(usesRealBackend, 'demo-only flow')

  async function openVideoForm(page: Page) {
    await signInDemo(page, '/admin/content/new')
    await page.getByLabel('نوع المادة').selectOption('video')
    await page.getByTestId('video-source').waitFor({ timeout: 60_000 })
  }

  test('shows only the selected source and the download option only for uploads', async ({ page }) => {
    await openVideoForm(page)
    const source = page.getByTestId('video-source')
    await expect(source.getByLabel('رابط فيديو يوتيوب')).toBeVisible()
    await expect(source.getByTestId('video-file')).toHaveCount(0)
    await expect(page.getByLabel('السماح للزائر بتحميل الفيديو')).toHaveCount(0)
    await source.getByLabel('رفع فيديو من الجهاز').check()
    await expect(source.getByLabel('رابط فيديو يوتيوب')).toHaveCount(0)
    await expect(source.getByTestId('video-file')).toBeVisible()
    // Off by default for new records.
    await expect(page.getByLabel('السماح للزائر بتحميل الفيديو')).not.toBeChecked()
  })

  test('accepts the common YouTube link shapes, previews them, and stores the normalised link', async ({ page }) => {
    await openVideoForm(page)
    const input = page.getByLabel('رابط فيديو يوتيوب')
    for (const url of ['https://youtu.be/dQw4w9WgXcQ?si=x', 'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube.com/live/dQw4w9WgXcQ', 'https://www.youtube.com/embed/dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=9s']) {
      await input.fill(url)
      await expect(page.getByTestId('youtube-preview').locator('iframe')).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ\?/)
    }
    await page.getByLabel('العنوان', { exact: true }).fill('فيديو يوتيوب للاختبار')
    await page.getByRole('button', { name: 'حفظ المادة' }).click()
    await expect(page.getByText('تمت إضافة المادة.')).toBeVisible()
    await expect(page.getByLabel('رابط فيديو يوتيوب')).toHaveValue('https://www.youtube.com/watch?v=dQw4w9WgXcQ')
  })

  test('rejects invalid links with a useful message and refuses to save them', async ({ page }) => {
    await openVideoForm(page)
    const input = page.getByLabel('رابط فيديو يوتيوب')
    await input.fill('https://vimeo.com/12345')
    await expect(page.getByText('الرابط ليس من يوتيوب')).toBeVisible()
    await expect(page.getByTestId('youtube-preview')).toHaveCount(0)
    await page.getByLabel('العنوان', { exact: true }).fill('رابط خاطئ')
    await page.getByRole('button', { name: 'حفظ المادة' }).click()
    await expect(page.getByText('تعذر الحفظ')).toBeVisible()
  })

  test('video upload validates the file and offers a retry when the upload fails', async ({ page }) => {
    await openVideoForm(page)
    const source = page.getByTestId('video-source')
    await source.getByLabel('رفع فيديو من الجهاز').check()
    const file = source.getByTestId('video-file')
    await file.setInputFiles({ name: 'clip.avi', mimeType: 'video/x-msvideo', buffer: Buffer.from('x') })
    await expect(source.getByText('صيغة الفيديو غير مدعومة')).toBeVisible()
    // The demo sandbox has no storage, so a valid file fails; that is the failure path under test.
    await file.setInputFiles({ name: 'clip.mp4', mimeType: 'video/mp4', buffer: Buffer.from('not really a video') })
    await expect(source.getByText('غير متاح في النسخة التجريبية')).toBeVisible()
    await expect(source.getByTestId('video-retry')).toBeVisible()
  })
})

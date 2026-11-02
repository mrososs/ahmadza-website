import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Locator, type Page } from '@playwright/test'
import { makePng } from './support/png'

// The admin console runs on the labelled in-memory demo here, so these cover the screen's behaviour (previews, hints,
// validation, warnings, confirmation). Persistence, public pages, storage and authorization are covered against a real
// local Supabase stack in tests/branding/.
const usesRealBackend = Boolean(process.env.NUXT_PUBLIC_SUPABASE_URL)
test.skip(usesRealBackend, 'demo-only flow')

async function openBranding(page: Page) {
  await page.goto('/admin/branding')
  await page.getByRole('heading', { level: 1, name: 'تسجيل دخول المدير' }).waitFor()
  await page.getByLabel('البريد الإلكتروني').fill('owner@example.com')
  await page.getByLabel('كلمة المرور').fill('demo-password')
  await page.getByRole('button', { name: 'دخول' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'هوية الموقع' })).toBeVisible()
}

const slot = (page: Page, area: 'headerLogo' | 'heroImage') => page.getByTestId(`branding-${area}`)
const pick = (section: Locator, name: string, mimeType: string, buffer: Buffer) => section.locator('input[type="file"]').setInputFiles({ name, mimeType, buffer })

test('shows the current images, the recommended sizes and the exact Arabic guidance', async ({ page }) => {
  await openBranding(page)

  const logo = slot(page, 'headerLogo')
  await expect(logo.getByRole('heading', { level: 2, name: 'شعار الموقع' })).toBeVisible()
  await expect(logo.getByText('الشعار الذي يظهر في رأس الموقع.')).toBeVisible()
  await expect(logo.getByTestId('branding-helper')).toHaveText('المقاس الموصى به: 1200 × 500 بكسل (نسبة 12:5، عريضة قليلًا). الصيغ المدعومة: PNG أو WebP. يُفضّل استخدام خلفية شفافة. الحد الأقصى: 5 ميجابايت.')
  await expect(logo.getByTestId('branding-current').getByText('الصورة الحالية')).toBeVisible()
  await expect(logo.getByTestId('branding-current').getByRole('img')).toHaveAttribute('src', '/branding/header-logo-ahmad-alzahrani.webp')

  const hero = slot(page, 'heroImage')
  await expect(hero.getByRole('heading', { level: 2, name: 'صورة الواجهة الرئيسية' })).toBeVisible()
  await expect(hero.getByText('الصورة الرئيسية التي تظهر أعلى الموقع.')).toBeVisible()
  await expect(hero.getByTestId('branding-helper')).toHaveText('المقاس الموصى به: 1600 × 900 بكسل (نسبة 16:9). الصيغ المدعومة: PNG أو WebP. يُفضّل استخدام خلفية شفافة. الحد الأقصى: 5 ميجابايت.')
  await expect(hero.getByText('يُفضّل أن تتضمن الصورة كلمة «موقع»، واسم «أحمد الزهراني» بالخط العربي، وعبارة Website Ahmed Alzahrani.')).toBeVisible()
  await expect(hero.getByTestId('branding-current').getByRole('img')).toHaveAttribute('src', '/branding/hero-ahmad-alzahrani.webp')

  // Nothing to save or restore until the owner picks something.
  for (const section of [logo, hero]) {
    await expect(section.getByRole('button', { name: 'حفظ التغييرات' })).toBeDisabled()
    await expect(section.getByRole('button', { name: 'استعادة الصورة الافتراضية' })).toBeDisabled()
    await expect(section.getByRole('button', { name: 'اختيار صورة' })).toBeEnabled()
  }
})

test('rejects unsupported, oversized, unreadable and too-small files without touching the saved image', async ({ page }) => {
  await openBranding(page)
  const logo = slot(page, 'headerLogo')
  const alert = logo.getByRole('alert')

  await pick(logo, 'logo.jpg', 'image/jpeg', makePng(800, 600))
  await expect(alert).toContainText('PNG أو WebP')
  await pick(logo, 'logo.svg', 'image/svg+xml', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>'))
  await expect(alert).toContainText('PNG أو WebP')

  await pick(logo, 'huge.png', 'image/png', Buffer.alloc(5 * 1024 * 1024 + 1))
  await expect(alert).toContainText('أكبر من 5 ميجابايت')

  await pick(logo, 'broken.png', 'image/png', Buffer.from('this is not an image'))
  await expect(alert).toContainText('تعذر قراءة الصورة')

  await pick(logo, 'tiny.png', 'image/png', makePng(200, 150))
  await expect(alert).toContainText('صغيرة جدًا')

  await expect(logo.getByTestId('branding-new')).toHaveCount(0)
  await expect(logo.getByRole('button', { name: 'حفظ التغييرات' })).toBeDisabled()
  await expect(logo.getByTestId('branding-current').getByRole('img')).toHaveAttribute('src', '/branding/header-logo-ahmad-alzahrani.webp')
})

test('warns about ratio, resolution, transparency and clipping, then saves, previews and restores the default', async ({ page }) => {
  await openBranding(page)
  const hero = slot(page, 'heroImage')

  // Squarer than 16:9, below the recommended size and with no transparency: three warnings, still allowed.
  await pick(hero, 'hero.png', 'image/png', makePng(1100, 800, 'opaque'))
  const preview = hero.getByTestId('branding-new')
  await expect(preview.getByText('الصورة الجديدة')).toBeVisible()
  await expect(preview).toContainText('1100 × 800')
  const warnings = hero.getByRole('list', { name: 'تنبيهات على الصورة الجديدة' })
  await expect(warnings).toContainText('نسبة الصورة تختلف عن 16:9')
  await expect(warnings).toContainText('أقل من المقاس الموصى به')
  await expect(warnings).toContainText('بلا خلفية شفافة')

  // The current image is still shown next to it for comparison.
  await expect(hero.getByTestId('branding-current').getByRole('img')).toBeVisible()

  await pick(hero, 'edge.png', 'image/png', makePng(1600, 1200, 'edge'))
  await expect(hero.getByRole('list', { name: 'تنبيهات على الصورة الجديدة' })).toContainText('تلامس الكتابة حافة الصورة')

  // Cancelling drops the candidate.
  await hero.getByRole('button', { name: 'إلغاء' }).click()
  await expect(hero.getByTestId('branding-new')).toHaveCount(0)

  await pick(hero, 'good.png', 'image/png', makePng(1600, 900))
  await expect(hero.getByRole('list', { name: 'تنبيهات على الصورة الجديدة' })).toHaveCount(0)
  await hero.getByRole('button', { name: 'حفظ التغييرات' }).click()
  await expect(hero.getByRole('status').filter({ hasText: 'تم حفظ صورة الواجهة الرئيسية' })).toBeVisible()
  await expect(hero.getByTestId('branding-new')).toHaveCount(0)
  await expect(hero.getByTestId('branding-current').getByRole('img')).toHaveAttribute('src', /^blob:/)
  await expect(hero.getByTestId('branding-current')).toContainText('1600 × 900')

  // The other image is untouched: the forms are independent.
  await expect(slot(page, 'headerLogo').getByTestId('branding-current').getByRole('img')).toHaveAttribute('src', '/branding/header-logo-ahmad-alzahrani.webp')

  // Restoring asks first; cancelling keeps the uploaded image.
  await hero.getByRole('button', { name: 'استعادة الصورة الافتراضية' }).click()
  const dialog = hero.getByRole('dialog', { name: 'استعادة الصورة الافتراضية؟' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('button', { name: 'إلغاء' }).click()
  await expect(hero.getByTestId('branding-current').getByRole('img')).toHaveAttribute('src', /^blob:/)

  await hero.getByRole('button', { name: 'استعادة الصورة الافتراضية' }).click()
  await dialog.getByRole('button', { name: 'نعم، استعد الصورة الافتراضية' }).click()
  await expect(hero.getByRole('status').filter({ hasText: 'عادت صورة الواجهة الرئيسية إلى الصورة الافتراضية' })).toBeVisible()
  await expect(hero.getByTestId('branding-current').getByRole('img')).toHaveAttribute('src', '/branding/hero-ahmad-alzahrani.webp')
  await expect(hero.getByRole('button', { name: 'استعادة الصورة الافتراضية' })).toBeDisabled()
})

test('the branding page has no accessibility violations or horizontal overflow', async ({ page }) => {
  await openBranding(page)
  await pick(slot(page, 'headerLogo'), 'logo.png', 'image/png', makePng(800, 600, 'opaque'))
  await expect(slot(page, 'headerLogo').getByTestId('branding-new')).toBeVisible()

  const results = await new AxeBuilder({ page }).exclude('nuxt-devtools-frame').exclude('.nuxt-devtools-panel').analyze()
  expect(results.violations).toEqual([])
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0)
})

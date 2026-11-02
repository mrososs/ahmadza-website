import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

// These run against the dev server, where an unconfigured Supabase falls back to the labelled in-memory demo.
// With NUXT_PUBLIC_SUPABASE_* set the login would be real, so the sign-in flow is skipped.
const usesRealBackend = Boolean(process.env.NUXT_PUBLIC_SUPABASE_URL)

async function signInDemo(page: Page, target = '/admin') {
  await page.goto(target)
  await page.getByRole('heading', { level: 1, name: 'تسجيل دخول المدير' }).waitFor()
  await page.getByLabel('البريد الإلكتروني').fill('editor@example.com')
  await page.getByLabel('كلمة المرور').fill('demo-password')
  await page.getByRole('button', { name: 'دخول' }).click()
}

test('admin routes redirect anonymous visitors to the login page', async ({ page }) => {
  await page.goto('/admin/content')
  // The guard runs after hydration, which is slow on the first request to a cold dev server.
  await expect(page).toHaveURL(/\/admin\/login\?redirect=(%2F|\/)admin(%2F|\/)content/, { timeout: 45_000 })
  await expect(page.getByRole('heading', { level: 1, name: 'تسجيل دخول المدير' })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
})

test('login page has no accessibility violations and no horizontal overflow', async ({ page }) => {
  await page.goto('/admin/login')
  await page.getByRole('heading', { level: 1 }).waitFor()
  const results = await new AxeBuilder({ page }).exclude('nuxt-devtools-frame').exclude('.nuxt-devtools-panel').analyze()
  expect(results.violations).toEqual([])
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('login does not honour external redirect targets', async ({ page }) => {
  test.skip(usesRealBackend, 'demo-only flow')
  await signInDemo(page, '/admin/login?redirect=//evil.example')
  await expect(page).toHaveURL(/\/admin$/)
})

test('editor can create content and sees validation errors', async ({ page }) => {
  test.skip(usesRealBackend, 'demo-only flow')
  await signInDemo(page, '/admin/content/new')
  await expect(page.getByRole('heading', { level: 1, name: 'مادة جديدة' })).toBeVisible()

  await page.getByRole('button', { name: 'حفظ المادة' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'العنوان قصير جدًا' })).toBeVisible()

  await page.getByLabel('العنوان', { exact: true }).fill('مقال اختبار لوحة التحكم')
  await page.getByRole('button', { name: 'حفظ المادة' }).click()
  await expect(page.getByText('تمت إضافة المادة.')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'تعديل مادة' })).toBeVisible()
})

test('the book form has a download checkbox that is off by default and keeps its value', async ({ page }) => {
  test.skip(usesRealBackend, 'demo-only flow')
  await signInDemo(page, '/admin/content/new')
  await expect(page.getByRole('heading', { level: 1, name: 'مادة جديدة' })).toBeVisible()
  // Only books have the option.
  await expect(page.getByLabel('السماح بتنزيل الكتاب')).toHaveCount(0)
  await page.getByLabel('نوع المادة').selectOption('book')
  const download = page.getByLabel('السماح بتنزيل الكتاب')
  await expect(download).not.toBeChecked()

  await page.getByLabel('العنوان', { exact: true }).fill('كتاب اختبار التنزيل')
  await page.getByLabel('المؤلف', { exact: true }).fill('مؤلف الاختبار')
  await download.check()
  await page.getByRole('button', { name: 'حفظ المادة' }).click()
  await expect(page.getByText('تمت إضافة المادة.')).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'تعديل مادة' })).toBeVisible()
  await expect(page.getByLabel('السماح بتنزيل الكتاب')).toBeChecked()
})

test('content list filters by type and the mobile menu navigates', async ({ page }, testInfo) => {
  test.skip(usesRealBackend, 'demo-only flow')
  await signInDemo(page, '/admin/content')
  await expect(page.getByRole('heading', { level: 1, name: 'المحتوى' })).toBeVisible()
  await page.getByLabel('النوع').selectOption('book')
  await expect(page).toHaveURL(/type=book/)
  await expect(page.getByRole('table').getByRole('row').nth(1)).toContainText('كتاب')

  if (testInfo.project.name.includes('mobile')) {
    await page.getByRole('button', { name: 'فتح القائمة' }).click()
  }
  await page.getByRole('navigation', { name: 'إدارة الموقع' }).getByRole('link', { name: 'هوية الموقع' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'هوية الموقع' })).toBeVisible()
})

test('password recovery pages are reachable without a session and fail safely', async ({ page }) => {
  await page.goto('/admin/forgot-password')
  await expect(page).toHaveURL(/\/admin\/forgot-password$/)
  await expect(page.getByRole('heading', { level: 1, name: 'استعادة كلمة المرور' })).toBeVisible()
  await page.getByLabel('البريد الإلكتروني').fill('not-an-email')
  await page.getByRole('button', { name: 'إرسال رابط الاستعادة' }).click()
  await expect(page.getByRole('alert')).toContainText('بريدًا إلكترونيًا صحيحًا')

  // A reset link with no usable code must never show the password form.
  await page.goto('/admin/reset-password')
  await expect(page.getByRole('heading', { level: 1, name: 'كلمة مرور جديدة' })).toBeVisible()
  await expect(page.getByRole('alert')).toContainText('اطلب رابطًا جديدًا')
  await expect(page.getByLabel('كلمة المرور الجديدة')).toHaveCount(0)
})

test('recovery pages have no accessibility violations', async ({ page }) => {
  for (const path of ['/admin/forgot-password', '/admin/reset-password']) {
    await page.goto(path)
    await page.getByRole('heading', { level: 1 }).waitFor()
    const results = await new AxeBuilder({ page }).exclude('nuxt-devtools-frame').exclude('.nuxt-devtools-panel').analyze()
    expect(results.violations, path).toEqual([])
  }
})

import AxeBuilder from '@axe-core/playwright'
import { expect, test, type Page } from '@playwright/test'

async function waitForHydration(page: Page) {
  await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' })
}

test('homepage exposes the library and primary journeys', async ({ page }, testInfo) => {
  await page.goto('/')
  await waitForHydration(page)
  await expect(page.getByRole('heading', { level: 1, name: /معرفةٌ تُقرأ/ })).toBeVisible()
  if (testInfo.project.name.includes('mobile')) {
    await expect(page.getByRole('button', { name: 'فتح القائمة' })).toBeVisible()
  }
  else {
    await expect(page.getByRole('navigation', { name: 'التنقل الرئيسي' })).toBeVisible()
  }
  await page.getByRole('link', { name: 'المقالات' }).first().click()
  await expect(page).toHaveURL(/\/articles$/)
  await expect(page.getByRole('heading', { level: 1, name: 'المقالات' })).toBeVisible()
})

test('unified search is URL based and returns typed results', async ({ page }) => {
  await page.goto('/search')
  await waitForHydration(page)
  const input = page.getByRole('searchbox', { name: 'ابحث في المحتوى' })
  await input.fill('القراءة')
  await page.getByRole('button', { name: 'ابحث' }).click()
  await expect(page).toHaveURL(/q=/)
  await expect(page.getByTestId('search-results')).toBeVisible()
  await expect(page.getByText('القراءة بمنهج: من جمع الصفحات إلى بناء المعرفة')).toBeVisible()
})

test('article detail supports sharing and has an Arabic reading surface', async ({ page }) => {
  await page.goto('/articles/reading-with-a-method')
  await waitForHydration(page)
  await expect(page.getByRole('heading', { level: 1, name: /القراءة بمنهج/ })).toBeVisible()
  await expect(page.locator('html')).toHaveAttribute('dir', 'rtl')
  await page.getByRole('button', { name: 'نسخ الرابط' }).click()
  await expect(page.getByText('تم نسخ رابط الصفحة')).toBeAttached()
})

test('mobile navigation opens and the page never overflows horizontally', async ({ page }, testInfo) => {
  test.skip(!testInfo.project.name.includes('mobile'))
  await page.goto('/')
  await waitForHydration(page)
  await page.getByRole('button', { name: 'فتح القائمة' }).click()
  await expect(page.getByRole('navigation', { name: 'التنقل على الهاتف' })).toBeVisible()
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test('homepage and reading page have no automatic WCAG A/AA violations', async ({ page }) => {
  for (const path of ['/', '/articles/reading-with-a-method']) {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await waitForHydration(page)
    await expect(page.locator('#main-content')).toBeVisible()
    const results = await new AxeBuilder({ page })
      .exclude('nuxt-devtools-frame')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze()
    expect(results.violations).toEqual([])
  }
})

import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

// Demo data, site forced into maintenance (see playwright.maintenance.config.ts).
const widths = [360, 390, 768, 1024, 1440]

test('the coming-soon page has no accessibility violations', async ({ page }) => {
  await page.goto('/')
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze()
  expect(results.violations.map(violation => `${violation.id}: ${violation.nodes.length}`)).toEqual([])
})

for (const width of widths) {
  test(`at ${width}px the page fits, shows everything, and keeps a 44px entrance`, async ({ page }) => {
    await page.setViewportSize({ width, height: width < 768 ? 800 : 900 })
    const response = await page.goto('/')
    expect(response?.status()).toBe(503)
    await page.evaluate(() => document.fonts.ready)

    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth), 'horizontal overflow').toBe(0)
    for (const locator of [page.getByRole('img', { name: 'موقع أحمد الزهراني' }), page.getByRole('heading', { level: 1, name: 'قريبًا بإذن الله' }), page.getByText('نعمل حاليًا على تجهيز الموقع'), page.getByRole('link', { name: 'دخول المدير' })]) {
      await expect(locator).toBeInViewport()
    }
    const entrance = await page.getByRole('link', { name: 'دخول المدير' }).boundingBox()
    expect(entrance?.height ?? 0).toBeGreaterThanOrEqual(44)
    expect(entrance?.width ?? 0).toBeGreaterThanOrEqual(44)

    // The brand's display face is really in use, not a silent fallback.
    expect(await page.evaluate(() => document.fonts.check('1em AlMohanad'))).toBe(true)
    // The paragraph keeps a comfortable reading measure.
    const characters = await page.locator('.soon p').evaluate(element => (element.textContent ?? '').length)
    expect(characters).toBeLessThanOrEqual(90)
  })
}

test('the owner entrance is keyboard reachable with a visible focus ring and leads to the sign-in page', async ({ page }) => {
  await page.goto('/')
  await page.keyboard.press('Tab')
  const entrance = page.getByRole('link', { name: 'دخول المدير' })
  await expect(entrance).toBeFocused()
  expect(await entrance.evaluate(element => getComputedStyle(element).outlineStyle)).not.toBe('none')
  await page.keyboard.press('Enter')
  await expect(page.getByRole('heading', { level: 1, name: 'تسجيل دخول المدير' })).toBeVisible()
})

test('the page is complete without JavaScript, ships none, and carries no runtime configuration', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false })
  const page = await context.newPage()
  const response = await page.goto('/')
  expect(response?.status()).toBe(503)
  await expect(page.getByRole('heading', { level: 1, name: 'قريبًا بإذن الله' })).toBeVisible()
  const html = (await response?.text()) ?? ''
  expect(html).not.toMatch(/<script/i)
  expect(html).not.toContain('supabase')
  expect(html).not.toContain('__NUXT__')
  expect(response?.headers()['content-security-policy']).toContain("default-src 'none'")
  await context.close()
})

test('reduced motion and forced colors do not break the page', async ({ browser }) => {
  const context = await browser.newContext({ reducedMotion: 'reduce', forcedColors: 'active' })
  const page = await context.newPage()
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'قريبًا بإذن الله' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'دخول المدير' })).toBeVisible()
  await context.close()
})

test('everything but the sign-in console is closed to visitors, with the same noindex and no-store rules', async ({ request }) => {
  for (const path of ['/', '/articles', '/articles/anything', '/books', '/search?q=x', '/api/content', '/api/content/article/anything', '/api/__sitemap__/urls', '/sitemap.xml']) {
    const response = await request.get(path)
    expect(response.status(), path).toBe(503)
    expect(response.headers()['x-robots-tag'], path).toContain('noindex')
    expect(response.headers()['cache-control'], path).toContain('no-store')
  }
  expect((await request.get('/admin/login')).status()).toBe(200)
  const robots = await (await request.get('/robots.txt')).text()
  expect(robots).not.toContain('Sitemap')
})

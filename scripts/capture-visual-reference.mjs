import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'

const browser = await chromium.launch({ headless: true })
await mkdir('docs/visual-reference/regions', { recursive: true })

const targets = [
  { name: 'reference', url: 'https://haddady.com/', regions: [
    ['header', 'nav.navbar'], ['hero-carousel', '.header-carousel'], ['marquee', 'marquee'],
    ['category-sermons', '.service-item'], ['latest-heading', 'h1:has-text("أحدث المنشورات")'],
    ['featured-heading', 'h1:has-text("اخترنا لكم")'], ['footer', 'footer'],
  ] },
  { name: 'implementation', url: 'http://127.0.0.1:3000/', regions: [
    ['header', '.site-header'], ['hero-carousel', '.library-masthead'], ['marquee', '.latest-ticker'],
    ['category-sermons', '.library-intro__index a'], ['latest-heading', '.compact-publications'],
    ['featured-heading', '.library-selections'], ['books-audio', '.library-registers'],
    ['videos', '.video-register'], ['footer', '.site-footer'],
  ] },
]

for (const target of targets) {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'ar-EG' })
  await page.goto(target.url, { waitUntil: 'domcontentloaded', timeout: 45_000 })
  for (const [name, selector] of target.regions) {
    const element = page.locator(selector).first()
    if (!(await element.count())) continue
    await element.scrollIntoViewIfNeeded()
    await page.waitForTimeout(400)
    await element.screenshot({ path: `docs/visual-reference/regions/${target.name}-${name}.png`, timeout: 15_000 })
  }
  await page.close()
}

await browser.close()

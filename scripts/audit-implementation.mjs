import { chromium } from '@playwright/test'
import { mkdir } from 'node:fs/promises'
const out = 'docs/implementation-audit/screenshots'
await mkdir(out, { recursive: true })
const base = process.env.BASE ?? 'http://127.0.0.1:3000'
const tag = process.env.TAG ?? ''
const browser = await chromium.launch({ headless: true })
for (const [w, h] of [[1440, 900], [1280, 800], [768, 1024], [390, 844], [360, 800]]) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, locale: 'ar-EG' })
  await page.goto(base, { waitUntil: 'networkidle' })
  await page.evaluate(async () => { for (let y = 0; y < document.documentElement.scrollHeight; y += 400) { scrollTo(0, y); await new Promise(r => setTimeout(r, 80)) } scrollTo(0, 0) })
  await page.waitForTimeout(500)
  await page.screenshot({ path: `${out}/implementation-home-${w}${tag}.png`, fullPage: true })
  await page.screenshot({ path: `${out}/implementation-first-screen-${w}${tag}.png` })
  const ov = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
  console.log(w, 'overflow', ov, 'height', await page.evaluate(() => document.documentElement.scrollHeight))
  await page.close()
}
await browser.close()

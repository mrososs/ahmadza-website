import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'

const out = 'docs/reference-audit'
await mkdir(`${out}/screenshots`, { recursive: true })
const browser = await chromium.launch({ headless: true })
const viewports = [[1440, 900], [1280, 800], [768, 1024], [390, 844], [360, 800]]

async function reveal(page) {
  const h = await page.evaluate(() => document.documentElement.scrollHeight)
  for (let y = 0; y < h; y += 400) { await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(120) }
  await page.evaluate(() => {
    document.querySelectorAll('.wow').forEach((e) => { e.style.visibility = 'visible'; e.style.animationName = 'none'; e.style.opacity = '1' })
    document.querySelectorAll('img[loading=lazy]').forEach((i) => { i.loading = 'eager' })
  })
  await page.waitForTimeout(800)
  await page.evaluate(() => window.scrollTo(0, 0))
}

for (const [w, h] of viewports) {
  const page = await browser.newPage({ viewport: { width: w, height: h }, locale: 'ar-EG' })
  await page.goto('https://haddady.com/', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
  await reveal(page)
  await page.screenshot({ path: `${out}/screenshots/reference-home-${w}.png`, fullPage: true })
  await page.screenshot({ path: `${out}/screenshots/reference-first-screen-${w}.png` })
  if (w === 1440) {
    const info = await page.evaluate(() => {
      const cs = (el) => {
        const s = getComputedStyle(el), r = el.getBoundingClientRect()
        const p = ['fontFamily','fontSize','fontWeight','lineHeight','color','backgroundColor','backgroundImage','backgroundSize','backgroundPosition','backgroundRepeat','padding','margin','borderTop','borderBottom','borderRadius','boxShadow','position','zIndex','overflow','display','gridTemplateColumns','flexDirection','gap','textAlign','transition','animation','transform']
        const o = { tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 80), x: Math.round(r.x), y: Math.round(r.y + scrollY), w: Math.round(r.width), h: Math.round(r.height), text: (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 60) }
        for (const k of p) { const v = s[k]; if (v && v !== 'none' && v !== 'normal' && v !== '0px' && v !== 'auto' && v !== 'rgba(0, 0, 0, 0)') o[k] = v }
        return o
      }
      const body = document.body
      const top = [...body.children].filter((e) => !['SCRIPT','STYLE','LINK'].includes(e.tagName)).map((e) => ({ ...cs(e), children: [...e.children].slice(0, 30).map(cs) }))
      const heads = [...document.querySelectorAll('h1,h2,h3,h4')].map((e) => ({ ...cs(e), tagName: e.tagName }))
      const links = [...document.querySelectorAll('nav a, .navbar a')].map((e) => ({ t: e.innerText.trim(), href: e.getAttribute('href') }))
      const keyframes = []
      for (const sh of document.styleSheets) { try { for (const r of sh.cssRules) if (r.type === CSSRule.KEYFRAMES_RULE) keyframes.push(r.name) } catch {} }
      const marq = document.querySelector('marquee')
      const ms = marq ? { direction: marq.getAttribute('direction'), scrollamount: marq.getAttribute('scrollamount'), behavior: marq.getAttribute('behavior'), ...cs(marq), items: [...marq.querySelectorAll('a')].slice(0, 4).map(cs), count: marq.querySelectorAll('a').length } : null
      return { top, heads, links, keyframes: [...new Set(keyframes)], marquee: ms, docHeight: document.documentElement.scrollHeight, fonts: [...document.fonts].map((f) => f.family + ' ' + f.status) }
    })
    await writeFile(`${out}/dom-extract-1440.json`, JSON.stringify(info, null, 1))
  }
  await page.close()
}

// region crops at 1440
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, locale: 'ar-EG' })
await page.goto('https://haddady.com/', { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
await reveal(page)
const regions = {
  header: 'nav.navbar', hero: '.header-carousel', marquee: 'marquee',
}
for (const [n, sel] of Object.entries(regions)) {
  const el = page.locator(sel).first()
  if (await el.count()) { await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(300); await el.screenshot({ path: `${out}/screenshots/reference-${n}.png` }).catch(() => {}) }
}
// section-by-section strips of the full page (900px each) for reading lower content
const total = await page.evaluate(() => document.documentElement.scrollHeight)
let i = 0
for (let y = 0; y < total; y += 900) {
  await page.evaluate((v) => window.scrollTo(0, v), y); await page.waitForTimeout(250)
  await page.screenshot({ path: `${out}/screenshots/reference-strip-${String(i++).padStart(2, '0')}.png` })
}
console.log('docHeight', total, 'strips', i)

// marquee motion sampling + hover
const m = await page.evaluate(() => { const e = document.querySelector('marquee'); e.scrollIntoView(); return !!e })
if (m) {
  const sample = async () => page.evaluate(() => { const a = document.querySelector('marquee a'); return a ? Math.round(a.getBoundingClientRect().x * 10) / 10 : null })
  const xs = []; for (let k = 0; k < 6; k++) { xs.push([k * 500, await sample()]); await page.waitForTimeout(500) }
  const box = await page.locator('marquee').boundingBox()
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
  const h1 = await sample(); await page.waitForTimeout(600); const h2 = await sample()
  await writeFile(`${out}/marquee-samples.json`, JSON.stringify({ xs, hoverBefore: h1, hoverAfter: h2 }, null, 1))
}
// nav hover/dropdown + carousel timing
const car = await page.evaluate(() => { const o = document.querySelector('.owl-carousel'); return o ? { cls: o.className, items: o.querySelectorAll('.owl-item').length, active: o.querySelectorAll('.owl-item.active').length } : null })
await writeFile(`${out}/carousel.json`, JSON.stringify(car, null, 1))
await browser.close()

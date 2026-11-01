import { chromium } from '@playwright/test'
const out = 'docs/implementation-audit/screenshots'
const base = process.env.BASE ?? 'http://127.0.0.1:3000'
const pages = [['category', '/articles'], ['sermons', '/sermons'], ['audio', '/audio'], ['books', '/books'], ['benefits', '/benefits'], ['post', '/articles/reading-with-a-method'], ['search', '/search?q=القراءة'], ['about', '/about'], ['videos', '/videos']]
const b = await chromium.launch()
for (const [w, h] of [[1440, 900], [390, 844]]) {
  for (const [name, path] of pages) {
    const p = await b.newPage({ viewport: { width: w, height: h }, locale: 'ar-EG' })
    const errs = []
    p.on('pageerror', e => errs.push(e.message.slice(0, 90)))
    p.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 90)) })
    await p.goto(base + path, { waitUntil: 'networkidle' }); await p.waitForTimeout(700)
    const m = await p.evaluate(() => [Math.round(document.querySelector('.library-masthead').getBoundingClientRect().height), document.documentElement.scrollWidth - innerWidth])
    await p.screenshot({ path: `${out}/implementation-inner-${name}-${w}.png`, fullPage: true })
    await p.evaluate(() => scrollTo(0, 700)); await p.waitForTimeout(700)
    const st = await p.evaluate(() => { const h = document.querySelector('.site-header'); return [getComputedStyle(h).position, Math.round(h.getBoundingClientRect().top), h.classList.contains('site-header--stuck'), getComputedStyle(h).backgroundColor].join(' ') })
    if (name === 'category' || name === 'post') await p.screenshot({ path: `${out}/implementation-header-fixed-${name}-${w}.png` })
    console.log(w, name.padEnd(9), 'hero', m[0], 'overflow', m[1], '| header', st, errs.length ? errs : '')
    await p.close()
  }
}
await b.close()

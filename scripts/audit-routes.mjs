import { chromium } from '@playwright/test'
const routes = ['/', '/articles', '/articles/reading-with-a-method', '/sermons', '/books', '/audio', '/benefits', '/videos', '/search?q=القراءة', '/about']
const out = 'docs/implementation-audit/screenshots'
const b = await chromium.launch()
for (const [w, h] of [[1440, 900], [390, 844]]) {
  for (const r of routes) {
    const p = await b.newPage({ viewport: { width: w, height: h }, locale: 'ar-EG' })
    const errs = []
    p.on('console', m => { if (['error', 'warning'].includes(m.type())) errs.push(m.text().slice(0, 120)) })
    p.on('pageerror', e => errs.push('pageerror ' + e.message.slice(0, 120)))
    await p.goto('http://127.0.0.1:3000' + r, { waitUntil: 'networkidle' })
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - innerWidth)
    const name = 'route' + (r === '/' ? '-home' : r.replace(/[^a-z0-9]+/gi, '-').replace(/-$/, '')) + '-' + w
    await p.screenshot({ path: `${out}/${name}.png`, fullPage: false })
    console.log(w, r, 'overflow', ov, 'errs', errs.length, errs[0] ?? '')
    await p.close()
  }
}
await b.close()

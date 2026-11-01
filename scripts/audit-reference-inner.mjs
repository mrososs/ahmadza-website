import { chromium } from '@playwright/test'
import { mkdir, writeFile } from 'node:fs/promises'
const out = 'docs/reference-audit'
await mkdir(`${out}/screenshots`, { recursive: true })
const b = await chromium.launch()
const base = 'https://haddady.com'
const home = await b.newPage({ viewport: { width: 1440, height: 900 }, locale: 'ar-EG' })
await home.goto(base, { waitUntil: 'networkidle' }).catch(() => {})
const post = await home.evaluate(() => [...document.querySelectorAll('.blog a, .blog-item a, h4 a')].map(a => a.href).find(h => h && !h.includes('category') && h.startsWith('https://haddady.com/')))
await home.close()
const pages = { category: base + '/category/' + encodeURIComponent('مقالات') + '/', sermons: base + '/category/' + encodeURIComponent('خطب-مكتوبة') + '/', audio: base + '/sound_cat/' + encodeURIComponent('الدروس') + '/', books: base + '/' + encodeURIComponent('الكتب') + '/' + encodeURIComponent('كتب'), benefits: base + '/' + encodeURIComponent('الفوائد') + '/', bio: base + '/' + encodeURIComponent('السيرة-الذاتية') + '/' }
if (post) pages.post = post
const info = {}
for (const [name, url] of Object.entries(pages)) {
  for (const [w, h] of [[1440, 900], [390, 844]]) {
    const p = await b.newPage({ viewport: { width: w, height: h }, locale: 'ar-EG' })
    await p.goto(url, { waitUntil: 'networkidle', timeout: 60000 }).catch(() => {})
    const H = await p.evaluate(() => document.documentElement.scrollHeight)
    for (let y = 0; y < H; y += 400) { await p.evaluate(v => scrollTo(0, v), y); await p.waitForTimeout(80) }
    await p.evaluate(() => { document.querySelectorAll('.wow').forEach(e => { e.style.visibility = 'visible'; e.style.animationName = 'none' }); scrollTo(0, 0) })
    await p.waitForTimeout(500)
    await p.screenshot({ path: `${out}/screenshots/reference-inner-${name}-${w}.png`, fullPage: true })
    if (w === 1440) info[name] = await p.evaluate(() => {
      const s = (e) => { const c = getComputedStyle(e), r = e.getBoundingClientRect(); return { cls: String(e.className).slice(0, 60), y: Math.round(r.y + scrollY), h: Math.round(r.height), w: Math.round(r.width), bg: c.backgroundColor, bgi: c.backgroundImage.slice(0, 70), color: c.color, fs: c.fontSize, pad: c.padding } }
      return { url: location.href, title: document.title, docH: document.documentElement.scrollHeight, top: [...document.body.children].filter(e => !['SCRIPT', 'STYLE', 'LINK', 'IFRAME'].includes(e.tagName)).map(e => ({ tag: e.tagName, ...s(e), text: e.innerText.trim().replace(/\s+/g, ' ').slice(0, 70) })), heads: [...document.querySelectorAll('h1,h2,h3,h4,h5')].slice(0, 12).map(e => ({ t: e.tagName, ...s(e), text: e.innerText.trim().slice(0, 50) })) }
    })
    await p.close()
  }
}
await writeFile(`${out}/dom-extract-inner.json`, JSON.stringify(info, null, 1))
console.log(Object.keys(pages).join(','), post)
await b.close()

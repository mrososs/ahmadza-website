import { chromium } from '@playwright/test'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { writeFileSync, mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
const dir = mkdtempSync(resolve(tmpdir(), 'cmp-'))
const load = async (page, html) => { const f = resolve(dir, 'p.html'); writeFileSync(f, html); await page.goto(pathToFileURL(f).href); await page.waitForLoadState('load') }
const ref = (n) => pathToFileURL(resolve(`docs/reference-audit/screenshots/${n}`)).href
const imp = (n) => pathToFileURL(resolve(`docs/implementation-audit/screenshots/${n}`)).href
const jobs = [
  ['first-screen-1440', 'reference-first-screen-1440.png', 'implementation-first-screen-1440.png', 1440],
  ['first-screen-390', 'reference-first-screen-390.png', 'implementation-first-screen-390.png', 390],
  ['full-1440', 'reference-home-1440.png', 'implementation-home-1440.png', 1440],
  ['full-390', 'reference-home-390.png', 'implementation-home-390.png', 390],
  ['full-768', 'reference-home-768.png', 'implementation-home-768.png', 768],
]
const b = await chromium.launch()
for (const [name, r, i, w] of jobs) {
  const p = await b.newPage({ viewport: { width: w * 2 + 30, height: 900 } })
  const side = `<body style="margin:0;background:#888;display:flex;gap:30px;direction:ltr"><div><img style="width:${w}px;display:block" src="${ref(r)}"></div><div><img style="width:${w}px;display:block" src="${imp(i)}"></div></body>`
  await load(p, side); await p.waitForTimeout(500)
  await p.screenshot({ path: `docs/visual-comparison/side-by-side-${name}.png`, fullPage: true })
  const diff = `<body style="margin:0;background:#000;position:relative;width:${w}px"><img style="width:${w}px;display:block" src="${ref(r)}"><img style="width:${w}px;position:absolute;left:0;top:0;mix-blend-mode:difference" src="${imp(i)}"></body>`
  await p.setViewportSize({ width: w, height: 900 }); await load(p, diff); await p.waitForTimeout(500)
  await p.screenshot({ path: `docs/visual-comparison/difference-${name}.png`, fullPage: true })
  await p.close()
}
await b.close()

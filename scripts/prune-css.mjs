// One-off: drop CSS rules whose every selector targets a class that no template uses any more.
// Brace-aware (handles @media nesting) so multi-line rules are removed whole.
import { readFileSync, writeFileSync } from 'node:fs'

const file = 'app/assets/css/main.css'
const prefixDead = ["page-intro", "detail-hero", "search-hero", "about-hero", "content-card", "book-spine", "video-poster", "video-directory", "directory-tools", "directory-results", "about-manifesto"]
const exactDead = ["content-grid", "detail-layout", "detail-aside", "detail-meta", "related-grid", "search-results", "search-results__list", "site-header--overlay", "about-page", "about-copy__grid", "content-card"]
const deadClass = new RegExp(String.raw`\.(${prefixDead.join('|')})(?![A-Za-z0-9])|\.(${exactDead.join('|')})(?![\w-])`)
const src = readFileSync(file, 'utf8')

function parse(text, start = 0, nested = false) {
  const out = []
  let i = start
  let buffer = ''
  while (i < text.length) {
    const ch = text[i]
    if (ch === '/' && text[i + 1] === '*') {
      const end = text.indexOf('*/', i) + 2
      buffer += text.slice(i, end)
      i = end
      continue
    }
    if (ch === '{') {
      const prelude = buffer
      const atRule = prelude.trim().startsWith('@')
      if (atRule && /@(media|supports)/.test(prelude)) {
        const [children, next] = parse(text, i + 1, true)
        out.push({ prelude, children })
        i = next
      }
      else {
        let depth = 1
        let j = i + 1
        while (depth) { if (text[j] === '{') depth++; if (text[j] === '}') depth--; j++ }
        out.push({ prelude, body: text.slice(i, j) })
        i = j
      }
      buffer = ''
      continue
    }
    if (ch === '}' && nested) return [out, i + 1]
    buffer += ch
    i++
  }
  if (buffer.trim()) out.push({ prelude: buffer, body: '' })
  return [out, i]
}

let removed = 0
function keep(node) {
  if (node.children) {
    node.children = node.children.filter(keep)
    return node.children.length > 0
  }
  if (!node.body || node.prelude.trim().startsWith('@')) return true
  const code = node.prelude.replace(/\/\*[\s\S]*?\*\//g, '')
  const selectors = code.split(',').map(s => s.trim()).filter(Boolean)
  const alive = selectors.length === 0 || !selectors.every(s => deadClass.test(s))
  if (!alive) removed++
  return alive
}
function print(nodes) {
  return nodes.map(n => n.children ? `${n.prelude}{${print(n.children)}}` : `${n.prelude}${n.body}`).join('')
}
const [tree] = parse(src)
const result = print(tree.filter(keep))
writeFileSync(file, result.replace(/\n{3,}/g, '\n\n'))
console.log('removed rules:', removed, 'braces', (result.match(/\{/g) || []).length, (result.match(/\}/g) || []).length)

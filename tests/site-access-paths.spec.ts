import { expect, test } from '@playwright/test'
import { classifySiteRequest } from '../server/utils/site-access-paths'

// Pure unit tests of the gate's path rules (no server involved). The gate itself is covered by tests/publication and tests/maintenance.

test('content pages, listings, search and unknown routes are gated as pages', () => {
  for (const path of ['/', '/articles', '/articles/some-slug', '/books/x', '/search?q=%D9%85', '/videos', '/no-such-page', '/articles/some-slug/']) {
    expect(classifySiteRequest(path), path).toBe('page')
  }
})

test('APIs are gated as APIs, files as files', () => {
  for (const path of ['/api/content', '/api/content/article/x', '/api/videos/x/playback', '/api/__sitemap__/urls', '/api/unknown']) expect(classifySiteRequest(path), path).toBe('api')
  for (const path of ['/sitemap.xml', '/sitemap_index.xml', '/favicon.ico', '/articles/x/_payload.json', '/anything.pdf', '/__sitemap__/style.xsl']) expect(classifySiteRequest(path), path).toBe('file')
})

test('the admin console, build assets, bundled artwork, the logo API, robots and preview sessions stay open', () => {
  for (const path of ['/admin', '/admin/login', '/admin/content/0b9e2a4c-0000-0000-0000-000000000000', '/admin/branding?x=1', '/_nuxt/entry.abc.js', '/_pdfjs/6.4.299/cmaps/a.bcmap', '/branding/header-logo-ahmad-alzahrani.webp', '/fonts/AlMohanad-Regular.ttf', '/ornaments/lattice.webp', '/favicon.svg', '/robots.txt', '/api/branding', '/api/preview/session', '/admin/content/%D9%85%D9%82%D8%A7%D9%84']) {
    expect(classifySiteRequest(path), path).toBe('open')
  }
})

test('prefix look-alikes are not open', () => {
  for (const path of ['/administrator', '/admin-tools', '/_nuxtish/x', '/brandingx', '/api/branding/extra', '/api/preview/session/extra', '/api/preview', '/robots.txt.bak', '/fontsx/a.ttf']) {
    expect(classifySiteRequest(path), path).not.toBe('open')
  }
})

test('dot segments and encodings cannot carry a content route through an open prefix', () => {
  for (const path of [
    '/_nuxt/../articles/x', '/_nuxt/%2e%2e/articles/x', '/_nuxt/%2E%2E/articles/x', '/admin/../articles/x', '/admin/..%2farticles/x', '/admin/%2e%2e/articles/x',
    '/admin/%252e%252e/articles/x', '/admin/%252e%252e%252farticles/x', '/branding/../api/content', '/admin/..\\articles/x', '/admin%2F..%2Farticles%2Fx', '//articles/x',
  ]) {
    expect(classifySiteRequest(path), path).not.toBe('open')
  }
  // The answer keeps the shape of what would really be served.
  expect(classifySiteRequest('/branding/../api/content')).toBe('api')
  expect(classifySiteRequest('/_nuxt/%2e%2e/articles/x')).toBe('page')
})

test('malformed encodings and odd characters are gated, never open', () => {
  for (const path of ['/admin/%E0%A4%A', '/admin/%', '/admin/%zz', '/admin/x%00y', '/admin/x%23y', '/admin/x%3Fy']) {
    expect(classifySiteRequest(path), path).not.toBe('open')
  }
})

test('the dev server plumbing is open only in development', () => {
  expect(classifySiteRequest('/__nuxt_vite_node__/x', { dev: true })).toBe('open')
  expect(classifySiteRequest('/__nuxt_vite_node__/x')).not.toBe('open')
  expect(classifySiteRequest('/__sitemap__/debug', { dev: false })).not.toBe('open')
})

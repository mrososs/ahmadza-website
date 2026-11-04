import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

// The book reader (usePdfReader) needs pdf.js decoders, CMaps and fonts as plain files. They are served straight from the
// installed package under a versioned path, so an upgrade can never leave browsers with a stale decoder.
const pdfjsRoot = fileURLToPath(new URL('./node_modules/pdfjs-dist/', import.meta.url))
const pdfjsVersion = (JSON.parse(readFileSync(`${pdfjsRoot}package.json`, 'utf8')) as { version: string }).version
const pdfjsAssets = ['cmaps', 'standard_fonts', 'wasm', 'iccs'].map(folder => ({
  dir: `${pdfjsRoot}${folder}`,
  baseURL: `/_pdfjs/${pdfjsVersion}/${folder}`,
  maxAge: 60 * 60 * 24 * 365,
}))

export default defineNuxtConfig({
  compatibilityDate: '2026-10-31',
  devtools: { enabled: true },
  modules: ['@nuxt/image', '@nuxtjs/sitemap'],
  css: [
    '@fontsource/ibm-plex-sans-arabic/400.css',
    '@fontsource/ibm-plex-sans-arabic/500.css',
    '@fontsource/ibm-plex-sans-arabic/600.css',
    '@fontsource/ibm-plex-sans-arabic/700.css',
    '@fontsource/noto-naskh-arabic/400.css',
    '@fontsource/noto-naskh-arabic/600.css',
    '@fontsource/noto-naskh-arabic/700.css',
    '~/assets/css/main.css',
    '~/assets/css/content.css',
  ],
  vite: {
    plugins: [tailwindcss()],
    // Pre-bundle so a cold dev server does not re-optimize and hard-reload the page mid-session.
    optimizeDeps: { include: ['zod', '@lucide/vue', '@supabase/supabase-js'] },
  },
  app: {
    head: {
      htmlAttrs: { lang: 'ar', dir: 'rtl' },
      meta: [
        { name: 'theme-color', content: '#173f34' },
        { name: 'color-scheme', content: 'light' },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
  runtimeConfig: {
    supabaseUrl: '',
    supabasePublishableKey: '',
    // Tests only: NUXT_SITE_ACCESS_DEMO_MODE=maintenance puts the demo repository in maintenance. Never read by the Supabase adapter.
    siteAccessDemoMode: '',
    public: {
      // The publishable key is designed for browsers; RLS and admin_profiles gate every write.
      supabaseUrl: '',
      supabasePublishableKey: '',
      // Largest video an editor may upload, in MB. The `videos` bucket enforces its own limit (200 MB); keep this at or below it.
      videoMaxMb: 200,
      siteUrl: 'https://prof-ahmadza.com',
      siteName: 'مكتبة أحمد الزهراني الرقمية',
      authorDisplayName: 'أحمد الزهراني',
    },
  },
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || 'https://prof-ahmadza.com',
    name: 'مكتبة أحمد الزهراني الرقمية',
  },
  // The sitemap is rebuilt at most once a minute, so a launch shows up in it quickly. While the site is in maintenance the gate answers
  // /sitemap.xml itself (503), so nothing is ever built or cached from hidden content.
  sitemap: { sources: ['/api/__sitemap__/urls'], exclude: ['/admin', '/admin/**'], cacheMaxAgeSeconds: 60 },
  routeRules: {
    '/admin/**': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow' } },
    // Content pages are rendered per request on purpose: stale-while-revalidate kept serving an empty list
    // after an editor published, and editors expect to see their change as soon as they open the site.
  },
  nitro: {
    // sanitize-html (and its parser/postcss dependencies) is CommonJS; bundling it into the server build instead of tracing it
    // keeps the serverless function from failing to load it, which took every content API route down.
    externals: { inline: ['sanitize-html'] },
    publicAssets: pdfjsAssets,
    // No crawlLinks: crawling the site navigation froze every content list (and any item that existed at build
    // time) into static HTML, so books published later never appeared. Only truly static routes are prerendered.
    // /robots.txt is a server route: it has to follow the publication state.
    prerender: { crawlLinks: false, routes: [] },
  },
  typescript: { typeCheck: true, strict: true },
})

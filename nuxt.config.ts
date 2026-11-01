import tailwindcss from '@tailwindcss/vite'

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
    public: {
      // The publishable key is designed for browsers; RLS and admin_profiles gate every write.
      supabaseUrl: '',
      supabasePublishableKey: '',
      siteUrl: 'https://prof-ahmadza.com',
      siteName: 'مكتبة أحمد زايد الرقمية',
      authorDisplayName: 'أحمد زايد',
    },
  },
  site: {
    url: process.env.NUXT_PUBLIC_SITE_URL || 'https://prof-ahmadza.com',
    name: 'مكتبة أحمد زايد الرقمية',
  },
  sitemap: { sources: ['/api/__sitemap__/urls'], exclude: ['/admin', '/admin/**'] },
  routeRules: {
    '/admin/**': { ssr: false, headers: { 'x-robots-tag': 'noindex, nofollow' } },
    '/': { swr: 60 },
    '/about': { prerender: true },
    '/articles/**': { swr: 60 },
    '/books/**': { swr: 60 },
    '/sermons/**': { swr: 60 },
    '/audio/**': { swr: 60 },
    '/benefits/**': { swr: 60 },
    '/videos': { swr: 60 },
  },
  nitro: {
    prerender: { crawlLinks: true, routes: ['/robots.txt'] },
  },
  typescript: { typeCheck: true, strict: true },
})

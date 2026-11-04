import { defineConfig, devices } from '@playwright/test'

// Real end-to-end run of the private-launch feature (maintenance gate, admin preview, publication switch, RLS) against an
// isolated LOCAL Supabase stack (never a hosted project):
//   supabase start            (applies supabase/migrations)
//   LOCAL_SUPABASE_URL=http://127.0.0.1:54321 LOCAL_SUPABASE_KEY=<publishable> LOCAL_SUPABASE_SECRET_KEY=<secret> \
//     npx playwright test -c playwright.publication.config.ts
// The secret key is used only by the test setup (throwaway admins, seed content); the app itself only ever gets the publishable key.
// Set PUBLICATION_REUSE_SERVER=1 to run against a dev server you already started on PUBLICATION_PORT.
const port = Number(process.env.PUBLICATION_PORT || 3301)
const supabaseUrl = process.env.LOCAL_SUPABASE_URL ?? process.env.BRANDING_SUPABASE_URL ?? ''
const publishableKey = process.env.LOCAL_SUPABASE_KEY ?? process.env.BRANDING_SUPABASE_KEY ?? ''

export default defineConfig({
  testDir: './tests/publication',
  timeout: 90_000,
  expect: { timeout: 20_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${port}`, locale: 'ar-EG', trace: 'retain-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } }],
  webServer: {
    command: `npx nuxt dev --host 127.0.0.1 --port ${port}`,
    // Not "/": the site answers 503 there while it is in maintenance, which is exactly what these tests start with.
    url: `http://127.0.0.1:${port}/robots.txt`,
    env: { NUXT_SUPABASE_URL: supabaseUrl, NUXT_SUPABASE_PUBLISHABLE_KEY: publishableKey, NUXT_PUBLIC_SUPABASE_URL: supabaseUrl, NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey },
    reuseExistingServer: Boolean(process.env.PUBLICATION_REUSE_SERVER),
    timeout: 300_000,
  },
})

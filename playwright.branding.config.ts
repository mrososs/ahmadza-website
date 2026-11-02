import { defineConfig, devices } from '@playwright/test'

// Real end-to-end run of the site-branding feature against an isolated LOCAL Supabase stack (never a hosted project):
//   supabase start            (applies supabase/migrations)
//   BRANDING_SUPABASE_URL=http://127.0.0.1:54321 BRANDING_SUPABASE_KEY=<publishable> BRANDING_SUPABASE_SECRET_KEY=<secret> \
//     npx playwright test -c playwright.branding.config.ts
// The secret key is used only by the test setup to create two throwaway admins; the app itself only ever gets the publishable key.
const port = Number(process.env.BRANDING_PORT || 3200)
const supabaseUrl = process.env.BRANDING_SUPABASE_URL ?? ''
const publishableKey = process.env.BRANDING_SUPABASE_KEY ?? ''

export default defineConfig({
  testDir: './tests/branding',
  // Each flow signs in, uploads, saves and loads public pages against a dev server, which is slower than the default 30 s allows.
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${port}`, locale: 'ar-EG', trace: 'retain-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } }],
  webServer: {
    command: `npx nuxt dev --host 127.0.0.1 --port ${port}`,
    url: `http://127.0.0.1:${port}`,
    env: { NUXT_SUPABASE_URL: supabaseUrl, NUXT_SUPABASE_PUBLISHABLE_KEY: publishableKey, NUXT_PUBLIC_SUPABASE_URL: supabaseUrl, NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: publishableKey },
    reuseExistingServer: false,
    timeout: 300_000,
  },
})

import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  // Needs a local Supabase stack; run with `npm run test:e2e:branding`.
  testIgnore: '**/tests/branding/**',
  globalSetup: './tests/global-setup.ts',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : 2,
  reporter: [['html', { open: 'never' }]],
  use: {
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:3000',
    locale: 'ar-EG',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile-390', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
  webServer: {
    command: 'npx nuxt cleanup && npx nuxt dev --host 127.0.0.1',
    url: 'http://127.0.0.1:3000',
    // Tests always run on the labelled demo data, never against a real Supabase project from a local .env.
    env: { NUXT_SUPABASE_URL: '', NUXT_SUPABASE_PUBLISHABLE_KEY: '', NUXT_PUBLIC_SUPABASE_URL: '', NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '' },
    reuseExistingServer: false,
    timeout: 300_000,
  },
})

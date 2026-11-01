import { defineConfig, devices } from '@playwright/test'

// Read-only checks against a deployed site: SMOKE_URL=https://… npx playwright test -c playwright.smoke.config.ts
export default defineConfig({
  testDir: './tests',
  testMatch: 'production-smoke.spec.ts',
  retries: 1,
  reporter: [['list']],
  use: { baseURL: process.env.SMOKE_URL, locale: 'ar-EG', trace: 'off' },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } },
    { name: 'mobile-390', use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
  ],
})

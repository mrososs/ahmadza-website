import { defineConfig, devices } from '@playwright/test'

// The coming-soon page and the gate on the labelled demo data: no Supabase and no Docker needed.
//   npm run test:e2e:maintenance
// NUXT_SITE_ACCESS_DEMO_MODE=maintenance puts the demo repository in maintenance (the only way to force it; nothing can force "published").
const port = Number(process.env.MAINTENANCE_PORT || 3400)

export default defineConfig({
  testDir: './tests/maintenance',
  timeout: 60_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list']],
  use: { baseURL: `http://127.0.0.1:${port}`, locale: 'ar-EG', trace: 'retain-on-failure' },
  projects: [{ name: 'desktop', use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 1000 } } }],
  webServer: {
    command: `npx nuxt dev --host 127.0.0.1 --port ${port}`,
    // Not "/": the site answers 503 there while it is in maintenance.
    url: `http://127.0.0.1:${port}/robots.txt`,
    env: { NUXT_SITE_ACCESS_DEMO_MODE: 'maintenance', NUXT_SUPABASE_URL: '', NUXT_SUPABASE_PUBLISHABLE_KEY: '', NUXT_PUBLIC_SUPABASE_URL: '', NUXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: '' },
    reuseExistingServer: Boolean(process.env.MAINTENANCE_REUSE_SERVER),
    timeout: 300_000,
  },
})

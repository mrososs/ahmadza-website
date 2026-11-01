import { chromium } from '@playwright/test'

// A freshly cleaned `nuxt dev` discovers client dependencies lazily and hard-reloads the page when it
// re-optimizes them. Visiting the main routes once up front keeps that churn out of the tests.
export default async function globalSetup() {
  const baseURL = process.env.BASE_URL || 'http://127.0.0.1:3000'
  const browser = await chromium.launch()
  const page = await browser.newPage()
  for (const path of ['/', '/articles', '/search', '/admin/login', '/admin/forgot-password']) {
    await page.goto(`${baseURL}${path}`, { waitUntil: 'networkidle', timeout: 120_000 }).catch(() => undefined)
    await page.waitForTimeout(1500)
  }
  await browser.close()
}

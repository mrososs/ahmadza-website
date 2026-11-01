import { expect, test } from '@playwright/test'

// Non-destructive: no content is created or deleted. Credentialed checks run only when the owner
// supplies SMOKE_ADMIN_EMAIL / SMOKE_ADMIN_PASSWORD in the environment; they are never printed or stored.
test.skip(!process.env.SMOKE_URL, 'set SMOKE_URL to run against a deployment')

test('public pages load without errors and show the real (possibly empty) library', async ({ page }) => {
  const problems: string[] = []
  page.on('pageerror', error => problems.push(error.message))
  page.on('console', message => { if (message.type() === 'error') problems.push(message.text()) })

  for (const path of ['/', '/articles', '/books', '/sermons', '/audio', '/benefits', '/videos', '/search', '/about']) {
    const response = await page.goto(path)
    expect(response?.status(), path).toBe(200)
    await expect(page.locator('main'), path).toBeVisible()
    await expect(page.locator('body'), path).not.toContainText('محتوى تجريبي')
    await expect(page.locator('body'), path).not.toContainText('بيانات تجريبية')
  }
  expect(problems).toEqual([])
})

test('empty library shows clean Arabic empty states', async ({ page, request }) => {
  const list = await (await request.get('/api/content?limit=1')).json() as { total: number; source: string }
  expect(list.source).toBe('supabase')
  test.skip(list.total > 0, 'library already has published content')
  await page.goto('/articles')
  await expect(page.getByText('لا توجد مواد منشورة حاليًا')).toBeVisible()
  await page.goto('/')
  await expect(page.getByText('لا توجد مواد منشورة حاليًا')).toBeVisible()
})

test('admin is protected, noindexed and rejects bad credentials', async ({ page, request }) => {
  await page.goto('/admin/content')
  await expect(page).toHaveURL(/\/admin\/login/)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/)
  expect((await request.get('/admin/login')).headers()['x-robots-tag']).toContain('noindex')

  await page.getByLabel('البريد الإلكتروني').fill('nobody@example.com')
  await page.getByLabel('كلمة المرور').fill('definitely-wrong-password')
  await page.getByRole('button', { name: 'دخول' }).click()
  await expect(page.getByRole('alert')).toContainText('غير صحيحة')
  await expect(page).toHaveURL(/\/admin\/login/)
})

test('recovery pages are reachable and reject a missing code', async ({ page }) => {
  await page.goto('/admin/forgot-password')
  await expect(page.getByRole('heading', { level: 1, name: 'استعادة كلمة المرور' })).toBeVisible()
  await page.goto('/admin/reset-password')
  await expect(page.getByRole('alert')).toContainText('اطلب رابطًا جديدًا')
})

test('anonymous visitors cannot write or read admin data through the public API', async ({ request }) => {
  const url = process.env.SMOKE_SUPABASE_URL
  const key = process.env.SMOKE_SUPABASE_KEY
  test.skip(!url || !key, 'SMOKE_SUPABASE_URL / SMOKE_SUPABASE_KEY not provided')
  const write = await request.post(`${url}/rest/v1/categories`, { headers: { apikey: key!, 'Content-Type': 'application/json' }, data: { slug: 'smoke-denied', name: 'denied' } })
  expect([401, 403]).toContain(write.status())
  const profiles = await request.get(`${url}/rest/v1/admin_profiles?select=*`, { headers: { apikey: key! } })
  expect(await profiles.json()).toEqual([])
})

test('owner can sign in, see the dashboard and sign out', async ({ page }) => {
  const email = process.env.SMOKE_ADMIN_EMAIL
  const password = process.env.SMOKE_ADMIN_PASSWORD
  test.skip(!email || !password, 'owner credentials not provided')
  await page.goto('/admin/login')
  await page.getByLabel('البريد الإلكتروني').fill(email!)
  await page.getByLabel('كلمة المرور').fill(password!)
  await page.getByRole('button', { name: 'دخول' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'لوحة التحكم' })).toBeVisible()
  await expect(page.getByText('مدير الموقع')).toBeVisible()
  await page.getByRole('button', { name: 'تسجيل الخروج' }).click()
  await expect(page).toHaveURL(/\/admin\/login/)
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/login/)
})

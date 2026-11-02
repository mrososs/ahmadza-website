import { expect, test, type Page } from '@playwright/test'
import { configured, owner, seedAdmin, serviceHeaders, supabaseUrl } from './support'

// Same local Supabase stack as branding.spec.ts: the editor's checkbox goes through the real admin adapter into
// metadata.downloadAllowed, and the real Storage endpoint is asked for the attachment.
test.skip(!configured, 'set BRANDING_SUPABASE_URL, BRANDING_SUPABASE_KEY and BRANDING_SUPABASE_SECRET_KEY for a local stack')
test.describe.configure({ mode: 'serial' })

const slug = 'dl-test-book'
const pdfPath = 'books/dl-test-0a1b2c3d.pdf'
const pdfUrl = `${supabaseUrl}/storage/v1/object/public/publications/${pdfPath}`
const smallPdf = Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 10 10]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n', 'latin1')
let bookId = ''

async function metadata(page: Page) {
  const response = await page.request.get(`${supabaseUrl}/rest/v1/content_items?select=metadata&id=eq.${bookId}`, { headers: serviceHeaders() })
  return ((await response.json()) as Array<{ metadata: Record<string, unknown> }>)[0]?.metadata ?? {}
}

test.beforeAll(async ({ request }) => {
  await seedAdmin(request, owner)
  const { 'content-type': _ignored, ...uploadHeaders } = serviceHeaders()
  const upload = await request.post(`${supabaseUrl}/storage/v1/object/publications/${pdfPath}`, { headers: { ...uploadHeaders, 'x-upsert': 'true' }, multipart: { file: { name: 'book.pdf', mimeType: 'application/pdf', buffer: smallPdf } } })
  expect(upload.ok(), 'the test PDF uploads').toBe(true)
  await request.delete(`${supabaseUrl}/rest/v1/content_items?slug=eq.${slug}`, { headers: serviceHeaders() })
  const created = await request.post(`${supabaseUrl}/rest/v1/content_items`, {
    headers: { ...serviceHeaders(), prefer: 'return=representation' },
    data: { type: 'book', slug, title: 'كتاب اختبار التنزيل', excerpt: '', status: 'published', published_at: new Date(Date.now() - 60_000).toISOString(), metadata: { authorLabel: 'مؤلف الاختبار', pdfUrl, pageCount: 1 } },
  })
  expect(created.ok(), 'the test book is created').toBe(true)
  bookId = ((await created.json()) as Array<{ id: string }>)[0]?.id ?? ''
})

test.afterAll(async ({ request }) => {
  await request.delete(`${supabaseUrl}/rest/v1/content_items?slug=eq.${slug}`, { headers: serviceHeaders() })
  await request.delete(`${supabaseUrl}/storage/v1/object/publications/${pdfPath}`, { headers: serviceHeaders() })
})

test('a book without the option is read on the site only', async ({ page, request }) => {
  const api = await (await request.get(`/api/content/book/${slug}`)).json() as { item: { downloadAllowed: boolean } }
  expect(api.item.downloadAllowed).toBe(false)
  await page.goto(`/books/${slug}`)
  const media = page.getByRole('region', { name: 'الوسائط' })
  await expect(media.getByRole('button', { name: 'قراءة الكتاب' })).toBeVisible()
  await expect(media.getByText('متاح للقراءة على الموقع فقط.')).toBeVisible()
  await expect(media.getByRole('link', { name: 'تنزيل PDF' })).toHaveCount(0)
})

test('ticking the option in the admin adds a working download button to the book page', async ({ page, request }) => {
  await page.goto(`/admin/content/${bookId}`)
  await page.getByRole('heading', { level: 1, name: 'تسجيل دخول المدير' }).waitFor()
  await page.getByLabel('البريد الإلكتروني').fill(owner.email)
  await page.getByLabel('كلمة المرور').fill(owner.password)
  await page.getByRole('button', { name: 'دخول' }).click()

  const checkbox = page.getByLabel('السماح بتنزيل الكتاب')
  await expect(checkbox).not.toBeChecked()
  await checkbox.check()
  await page.getByRole('button', { name: 'حفظ المادة' }).click()
  await expect(page.getByText('تم حفظ التعديلات.')).toBeVisible()
  // The flag is stored with the rest of the book's metadata, which survives the save.
  expect(await metadata(page)).toMatchObject({ downloadAllowed: true, pdfUrl, authorLabel: 'مؤلف الاختبار', pageCount: 1 })

  await page.goto(`/books/${slug}`)
  const download = page.getByRole('region', { name: 'الوسائط' }).getByRole('link', { name: 'تنزيل PDF' })
  await expect(download).toBeVisible()
  const href = await download.getAttribute('href')
  expect(new URL(href ?? '').searchParams.get('download')).toBe(`${slug}.pdf`)
  await expect(page.getByText('يمكنك قراءة الكتاب على الموقع أو تنزيله.')).toBeVisible()

  // The link makes Storage answer with an attachment, which is what turns a click into a save-to-disk.
  const file = await request.get(href ?? '')
  expect(file.status()).toBe(200)
  expect(file.headers()['content-type']).toContain('application/pdf')
  expect(file.headers()['content-disposition']).toMatch(/attachment/i)
  expect(file.headers()['content-disposition']).toContain(`${slug}.pdf`)
})

test('clearing the option removes the download button again', async ({ page }) => {
  await page.goto(`/admin/content/${bookId}`)
  await page.getByRole('heading', { level: 1, name: 'تسجيل دخول المدير' }).waitFor()
  await page.getByLabel('البريد الإلكتروني').fill(owner.email)
  await page.getByLabel('كلمة المرور').fill(owner.password)
  await page.getByRole('button', { name: 'دخول' }).click()

  const checkbox = page.getByLabel('السماح بتنزيل الكتاب')
  await expect(checkbox).toBeChecked()
  await checkbox.uncheck()
  await page.getByRole('button', { name: 'حفظ المادة' }).click()
  await expect(page.getByText('تم حفظ التعديلات.')).toBeVisible()
  expect((await metadata(page)).downloadAllowed).toBe(false)

  await page.goto(`/books/${slug}`)
  await expect(page.getByRole('region', { name: 'الوسائط' }).getByRole('button', { name: 'قراءة الكتاب' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'تنزيل PDF' })).toHaveCount(0)
})

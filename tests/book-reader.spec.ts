import { expect, test, type Page } from '@playwright/test'

const BOOK_TITLE = 'دفاتر في بناء المعرفة'
const BOOK_PATH = '/books/notes-on-knowledge-building'
const PDF_PATH = '/test-files/book.pdf'
const PAGES = 3

async function waitForHydration(page: Page) {
  await page.locator('html[data-hydrated="true"]').waitFor({ state: 'attached' })
}

/** A valid PDF whose pages are solid black rectangles, so a rendered canvas is easy to tell from an empty one. */
function buildPdf(pageCount: number): Buffer {
  const content = '0 0 0 rg 20 20 260 360 re f'
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    `<< /Type /Pages /Kids [${Array.from({ length: pageCount }, (_, index) => `${3 + index * 2} 0 R`).join(' ')}] /Count ${pageCount} >>`,
    ...Array.from({ length: pageCount }, (_, index) => [
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 300 400] /Contents ${4 + index * 2} 0 R >>`,
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    ]).flat(),
  ]
  let body = '%PDF-1.4\n'
  const offsets = objects.map((object, index) => {
    const offset = body.length
    body += `${index + 1} 0 obj\n${object}\nendobj\n`
    return offset
  })
  const xrefOffset = body.length
  body += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}`
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`
  return Buffer.from(body, 'latin1')
}

/** The demo data has no PDF on purpose, so give the book one for the browser only: on client navigation the detail API is fetched from the page. */
async function serveBookPdf(page: Page, overrides: Record<string, unknown> = {}) {
  await page.route('**/api/content/book/*', async (route) => {
    const original = await (await route.fetch()).json() as { item: Record<string, unknown> }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ...original, item: { ...original.item, pdfUrl: PDF_PATH, ...overrides } }) })
  })
  await page.route(`**${PDF_PATH}`, route => route.fulfill({ status: 200, contentType: 'application/pdf', body: buildPdf(PAGES) }))
}

async function openBookPage(page: Page, overrides: Record<string, unknown> = {}) {
  await serveBookPdf(page, overrides)
  await page.goto('/books')
  await waitForHydration(page)
  await page.getByRole('link', { name: BOOK_TITLE }).first().click()
  await expect(page).toHaveURL(new RegExp(`${BOOK_PATH}$`))
}

async function openBookReader(page: Page) {
  await openBookPage(page)
  await page.getByRole('button', { name: 'قراءة الكتاب' }).click()
  return page.locator('#book-reader')
}

test('a book without a PDF shows an honest empty state and no reader', async ({ page }) => {
  await page.goto(BOOK_PATH)
  await waitForHydration(page)
  await expect(page.getByText('لا يتوفر ملف PDF موثوق لهذا النموذج')).toBeVisible()
  await expect(page.getByRole('button', { name: 'قراءة الكتاب' })).toHaveCount(0)
})

test('the book reader draws the PDF in the page and, by default, offers no way to download it', async ({ page }) => {
  const reader = await openBookReader(page)
  const canvas = reader.locator('canvas')

  await expect(reader.getByRole('img', { name: new RegExp(`^صفحة 1 من كتاب ${BOOK_TITLE}`) })).toBeVisible()
  await expect(reader.getByText(`من ${PAGES}`, { exact: true })).toBeVisible()
  // A canvas inherits the page's rtl direction and pdf.js then mirrors Arabic text, so the page canvas must stay ltr.
  await expect(canvas).toHaveCSS('direction', 'ltr')
  await expect.poll(() => canvas.evaluate((element: HTMLCanvasElement) => {
    const [red = 255] = element.getContext('2d')!.getImageData(element.width / 2, element.height / 2, 1, 1).data
    return red
  }), { message: 'the page is painted onto the canvas' }).toBeLessThan(50)

  // Nothing on the page may hand the visitor the file: no download or new-tab links, no embedded browser PDF viewer.
  const media = page.getByRole('region', { name: 'الوسائط' })
  await expect(media.locator('a[download], a[href$=".pdf"], iframe, embed, object')).toHaveCount(0)
  await expect(media.getByRole('link', { name: /تنزيل|تحميل|تبويب/ })).toHaveCount(0)
  await expect(media.getByRole('button', { name: /تنزيل|تحميل|طباعة/ })).toHaveCount(0)

  // "Save image as" is blocked on the page itself.
  const menuPrevented = await canvas.evaluate((element) => {
    const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true })
    element.dispatchEvent(event)
    return event.defaultPrevented
  })
  expect(menuPrevented).toBe(true)

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test('a book that allows downloading offers a PDF download next to the reader', async ({ page }) => {
  await openBookPage(page, { downloadAllowed: true })
  const media = page.getByRole('region', { name: 'الوسائط' })
  const download = media.getByRole('link', { name: 'تنزيل PDF' })
  await expect(download).toBeVisible()
  await expect(download).toHaveAttribute('download', '')
  await expect(download).toHaveAttribute('href', PDF_PATH)
  await expect(media.getByText('يمكنك قراءة الكتاب على الموقع أو تنزيله.')).toBeVisible()
  // Reading on the site is still there, and still draws on a canvas rather than embedding the browser viewer.
  await media.getByRole('button', { name: 'قراءة الكتاب' }).click()
  await expect(page.locator('#book-reader canvas')).toBeVisible()
  await expect(media.locator('iframe, embed, object')).toHaveCount(0)
})

test('a downloadable book stored in Supabase Storage is served as an attachment named after its slug', async ({ page }) => {
  const stored = 'https://project.supabase.co/storage/v1/object/public/publications/books/0a1b2c3d.pdf'
  await openBookPage(page, { pdfUrl: stored, downloadAllowed: true })
  const href = await page.getByRole('link', { name: 'تنزيل PDF' }).getAttribute('href')
  expect(new URL(href ?? '').searchParams.get('download')).toBe('notes-on-knowledge-building.pdf')
  expect(href).toContain('/storage/v1/object/public/publications/books/0a1b2c3d.pdf')
})

test('the book reader turns pages with buttons, the page box and RTL arrow keys', async ({ page }) => {
  const reader = await openBookReader(page)
  const pageBox = reader.getByLabel('الصفحة', { exact: true })
  const previous = reader.getByRole('button', { name: 'السابقة' })
  const next = reader.getByRole('button', { name: 'التالية' })

  await expect(pageBox).toHaveValue('1')
  await expect(previous).toBeDisabled()

  await next.click()
  await expect(reader.getByRole('img', { name: /^صفحة 2 من كتاب/ })).toBeVisible()
  await expect(pageBox).toHaveValue('2')

  await pageBox.fill('3')
  await pageBox.press('Enter')
  await expect(reader.getByRole('img', { name: /^صفحة 3 من كتاب/ })).toBeVisible()
  await expect(next).toBeDisabled()

  // Arabic books turn leftwards, so the right arrow goes back.
  await reader.getByRole('region', { name: `صفحة 3 من ${PAGES}` }).press('ArrowRight')
  await expect(pageBox).toHaveValue('2')

  // A page number beyond the book is clamped to the last page rather than blanking the reader.
  await pageBox.fill('99')
  await pageBox.press('Enter')
  await expect(pageBox).toHaveValue(String(PAGES))

  await reader.getByRole('button', { name: 'تكبير الصفحة' }).click()
  await expect(reader.getByRole('button', { name: 'تصغير الصفحة' })).toBeEnabled()
})

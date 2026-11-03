const { chromium } = require('@playwright/test')
const { createClient } = require('@supabase/supabase-js')
const { execFileSync } = require('node:child_process')
const fs = require('node:fs')
const API = 'http://127.0.0.1:55321', PUB = process.env.STACK_PUBLISHABLE_KEY, SECRET = process.env.STACK_SECRET_KEY
const base = 'http://127.0.0.1:3100'
const shots = 'D:/mostqel/ahmadza-web/artifacts/shots/'
const sql = q => execFileSync('docker', ['exec', 'supabase_db_ahmadza-brand-test', 'psql', '-U', 'postgres', '-tA', '-c', q]).toString().trim()
const out = []
const check = (n, ok, x = '') => { out.push(ok); console.log(ok ? 'PASS' : 'FAIL', n, x) }

;(async () => {
  const admin = createClient(API, SECRET, { auth: { persistSession: false } })
  const email = `ui-${Date.now()}@example.com`, password = 'Passw0rd!long-enough'
  const { data } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  sql(`insert into public.admin_profiles (user_id, role, display_name) values ('${data.user.id}','editor','UI Editor')`)

  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
  const errors = []
  const page = await b.newPage({ viewport: { width: 1440, height: 1000 }, locale: 'ar-EG' })
  page.on('pageerror', e => errors.push('pageerror ' + e.message))

  // A real, playable WebM made in the browser.
  const bytes = await page.evaluate(async () => {
    const c = document.createElement('canvas'); c.width = 640; c.height = 360
    const ctx = c.getContext('2d'); const rec = new MediaRecorder(c.captureStream(15), { mimeType: 'video/webm' })
    const chunks = []; rec.ondataavailable = e => chunks.push(e.data)
    rec.start(); for (let i = 0; i < 20; i++) { ctx.fillStyle = `hsl(${i * 18},70%,40%)`; ctx.fillRect(0, 0, 640, 360); await new Promise(r => setTimeout(r, 100)) }
    await new Promise(r => { rec.onstop = r; rec.stop() })
    return Array.from(new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()))
  })
  const file = require('node:path').join(require('node:os').tmpdir(), 'clip.webm')
  fs.writeFileSync(file, Buffer.from(bytes))
  console.log('webm bytes', bytes.length)

  await page.goto(base + '/admin/login', { waitUntil: 'networkidle', timeout: 120000 })
  await page.getByLabel('البريد الإلكتروني').fill(email)
  await page.getByLabel('كلمة المرور').fill(password)
  await page.getByRole('button', { name: 'دخول' }).click()
  await page.waitForURL('**/admin', { timeout: 30000 })
  await page.goto(base + '/admin/content/new')
  await page.getByLabel('نوع المادة').selectOption('video')
  const slug = `real-${Date.now().toString(36)}`
  await page.getByLabel('العنوان', { exact: true }).fill('فيديو مرفوع حقيقي')
  await page.getByLabel('الرابط المختصر').fill(slug)
  await page.getByTestId('video-source').getByLabel('رفع فيديو من الجهاز').check()
  await page.getByTestId('video-file').setInputFiles(file)
  await page.getByTestId('video-uploaded').waitFor({ timeout: 60000 })
  check('upload completes and shows the uploaded state', true)
  await page.locator('[data-testid="video-uploaded"] video').waitFor({ timeout: 30000 })
  const ready = await page.waitForFunction(() => document.querySelector('[data-testid="video-uploaded"] video')?.readyState >= 1, null, { timeout: 30000 }).then(() => true).catch(() => false)
  check('admin preview plays the private file through a signed URL', ready)
  check('duration was read from the file', Number(await page.getByLabel('المدة بالثواني').inputValue()) > 0, await page.getByLabel('المدة بالثواني').inputValue())
  await page.getByLabel('السماح للزائر بتحميل الفيديو').check()
  await page.getByLabel('الحالة').selectOption('published')
  await page.screenshot({ path: shots + 'after-admin-video-upload-1440.png', fullPage: true })
  await page.getByRole('button', { name: 'حفظ المادة' }).click()
  await page.getByText('تمت إضافة المادة.').waitFor({ timeout: 30000 })
  const meta = JSON.parse(sql(`select metadata from content_items where slug='${slug}'`))
  check('metadata stores source, path, mime, no youtube id', meta.videoSource === 'upload' && /^uploads\/.+\.webm$/.test(meta.videoPath) && !meta.youtubeId && meta.downloadAllowed === true, JSON.stringify(meta))

  const pub = await b.newPage({ viewport: { width: 390, height: 844 }, locale: 'ar-EG', hasTouch: true })
  await pub.goto(`${base}/videos/${slug}`, { waitUntil: 'networkidle' })
  const played = await pub.waitForFunction(() => { const v = document.querySelector('.video-player video'); return v && v.readyState >= 1 }, null, { timeout: 30000 }).then(() => true).catch(() => false)
  check('public player loads the video (mobile viewport)', played)
  check('download button is shown when allowed', await pub.getByRole('link', { name: 'تنزيل الفيديو' }).isVisible())
  check('no permanent public URL in page HTML', !(await pub.content()).includes('/object/public/videos'))
  await pub.screenshot({ path: shots + 'after-public-video-390.png', fullPage: true })
  const dl = await fetch(`${base}/api/videos/${slug}/download`, { redirect: 'manual' })
  check('download endpoint redirects to a short-lived attachment URL', dl.status === 302 && /token=/.test(dl.headers.get('location')) && /download=/.test(dl.headers.get('location')), String(dl.status))
  const playRes = await fetch(`${base}/api/videos/${slug}/playback`); const pj = await playRes.json()
  check('playback endpoint is no-store with an expiry', playRes.headers.get('cache-control') === 'no-store' && pj.expiresInSeconds > 0)

  // Turn downloads off: UI hides the button and the endpoint itself refuses.
  await page.getByRole('heading', { name: 'تعديل مادة' }).waitFor()
  await page.getByTestId('video-source').getByTestId('video-uploaded').waitFor()
  await page.getByLabel('السماح للزائر بتحميل الفيديو').uncheck()
  await page.getByRole('button', { name: 'حفظ المادة' }).click()
  await page.getByText('تم حفظ التعديلات.').waitFor({ timeout: 30000 })
  await pub.reload({ waitUntil: 'networkidle' })
  check('download button hidden when disabled, playback still available', (await pub.getByRole('link', { name: 'تنزيل الفيديو' }).count()) === 0 && (await pub.locator('.video-player video').count()) === 1)
  const dl2 = await fetch(`${base}/api/videos/${slug}/download`, { redirect: 'manual' })
  check('download endpoint refuses (403) when disabled', dl2.status === 403, String(dl2.status))

  // Switch to YouTube: the uploaded file is removed on save, YouTube-only metadata is stored.
  const oldPath = meta.videoPath
  await page.goto(`${base}/admin/content`, { waitUntil: 'networkidle' })
  await page.getByRole('link', { name: 'فيديو مرفوع حقيقي' }).first().click()
  await page.getByTestId('video-source').waitFor()
  await page.getByTestId('video-source').getByLabel('فيديو يوتيوب').check()
  await page.getByLabel('رابط فيديو يوتيوب').fill('https://youtu.be/dQw4w9WgXcQ?si=zz')
  await page.getByRole('button', { name: 'حفظ المادة' }).click()
  await page.getByText('تم حفظ التعديلات.').waitFor({ timeout: 30000 })
  const meta2 = JSON.parse(sql(`select metadata from content_items where slug='${slug}'`))
  check('switching to YouTube stores only the id', meta2.youtubeId === 'dQw4w9WgXcQ' && !meta2.videoPath, JSON.stringify(meta2))
  await new Promise(r => setTimeout(r, 1500))
  check('replaced upload was removed from storage', sql(`select count(*) from storage.objects where bucket_id='videos' and name='${oldPath}'`) === '0')
  const yt = await b.newPage({ locale: 'ar-EG' })
  await yt.goto(`${base}/videos/${slug}`, { waitUntil: 'networkidle' })
  const src = await yt.locator('.video-player iframe').getAttribute('src')
  check('public page embeds YouTube via nocookie with referrer policy', /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/.test(src) && (await yt.locator('.video-player iframe').getAttribute('referrerpolicy')) === 'strict-origin-when-cross-origin', src)

  // Existing legacy-shaped record keeps working.
  sql(`insert into content_items (type, slug, title, status, published_at, metadata) values ('video','legacy-yt','قديم','published', now() - interval '1 day', '{"youtubeId":"dQw4w9WgXcQ","durationSeconds":60}')`)
  await yt.goto(`${base}/videos/legacy-yt`, { waitUntil: 'networkidle' })
  check('legacy YouTube-only record still plays', (await yt.locator('.video-player iframe').count()) === 1)

  // Rich article through the real stack, sanitized on read even if the DB row is hostile.
  sql(`insert into content_items (type, slug, title, status, published_at, body) values ('article','hostile','مقال','published', now() - interval '1 day', '[{"id":"b","paragraphs":[],"html":"<p onclick=\\"x()\\">آمن</p><script>window.__xss=1</script><img src=\\"x\\" onerror=\\"window.__xss=1\\"><a href=\\"javascript:window.__xss=1\\">رابط</a>"}]'::jsonb)`)
  await yt.goto(`${base}/articles/hostile`, { waitUntil: 'networkidle' })
  check('hostile stored HTML is neutralised in SSR output', !/<script>window|onerror|onclick|javascript:/.test(await (await fetch(`${base}/articles/hostile`)).text()))
  check('no script ran', (await yt.evaluate(() => window.__xss)) === undefined)

  console.log(errors.join('\n') || 'no page errors')
  console.log(out.every(Boolean) ? 'ALL PASS' : 'SOME FAILED')
  await b.close()
})().catch((e) => { console.error(e); process.exit(1) })

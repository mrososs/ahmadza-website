const { createClient } = require('@supabase/supabase-js')
const tus = require('tus-js-client')
const { execFileSync } = require('node:child_process')
const URL_ = 'http://127.0.0.1:55321'
const PUB = process.env.STACK_PUBLISHABLE_KEY
const SECRET = process.env.STACK_SECRET_KEY
const results = []
const check = (name, ok, extra = '') => { results.push(ok); console.log(ok ? 'PASS' : 'FAIL', name, extra) }
const sql = q => execFileSync('docker', ['exec', 'supabase_db_ahmadza-brand-test', 'psql', '-U', 'postgres', '-tA', '-c', q]).toString().trim()

;(async () => {
  const admin = createClient(URL_, SECRET, { auth: { persistSession: false } })
  const email = `ed-${Date.now()}@example.com`, password = 'Passw0rd!long-enough'
  const { data: created, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error) throw error
  sql(`insert into public.admin_profiles (user_id, role, display_name) values ('${created.user.id}','editor','Test Editor')`)
  const editor = createClient(URL_, PUB, { auth: { persistSession: false } })
  const { data: session } = await editor.auth.signInWithPassword({ email, password })
  const token = session.session.access_token
  const anon = createClient(URL_, PUB, { auth: { persistSession: false } })

  const path = `uploads/${crypto.randomUUID()}.mp4`
  const body = Buffer.alloc(300_000, 7)
  const upload = (headers, objectName, type = 'video/mp4') => new Promise((resolve) => {
    const u = new tus.Upload(body, {
      endpoint: `${URL_}/storage/v1/upload/resumable`, chunkSize: 6 * 1024 * 1024, retryDelays: [], headers: { apikey: PUB, ...headers },
      uploadDataDuringCreation: true, removeFingerprintOnSuccess: true,
      metadata: { bucketName: 'videos', objectName, contentType: type, cacheControl: '3600' },
      onSuccess: () => resolve({ ok: true }), onError: e => resolve({ ok: false, status: e.originalResponse?.getStatus?.() }),
    })
    u.start()
  })

  const anonUp = await upload({}, `uploads/${crypto.randomUUID()}.mp4`)
  check('anonymous resumable upload is refused', !anonUp.ok, String(anonUp.status))
  const badName = await upload({ Authorization: `Bearer ${token}` }, 'evil/../x.mp4')
  check('admin upload with a non-generated name is refused', !badName.ok, String(badName.status))
  const badType = await upload({ Authorization: `Bearer ${token}` }, `uploads/${crypto.randomUUID()}.mp4`, 'application/x-msdownload')
  check('disallowed MIME type is refused', !badType.ok, String(badType.status))
  const good = await upload({ Authorization: `Bearer ${token}` }, path)
  check('admin resumable upload of a valid mp4 succeeds', good.ok, String(good.status))

  const slug = `video-${Date.now()}`
  const row = (status, extra = {}) => ({ type: 'video', slug, title: 'فيديو اختبار', status, published_at: status === 'published' ? new Date(Date.now() - 1000).toISOString() : null, metadata: { videoSource: 'upload', videoPath: path, videoMimeType: 'video/mp4', ...extra } })
  const ins = await editor.from('content_items').insert(row('draft')).select('id').single()
  check('editor can save a draft video record', !ins.error, ins.error?.message)
  const id = ins.data.id

  const badRow = await editor.from('content_items').insert({ ...row('draft'), slug: slug + '-b', metadata: { videoPath: '../../etc/passwd' } })
  check('DB rejects a malformed video path', Boolean(badRow.error), badRow.error?.code)
  const both = await editor.from('content_items').insert({ ...row('draft'), slug: slug + '-c', metadata: { videoPath: path, youtubeId: 'dQw4w9WgXcQ' } })
  check('DB rejects both sources at once', Boolean(both.error), both.error?.code)

  let s = await anon.storage.from('videos').createSignedUrl(path, 60)
  check('anon cannot sign a DRAFT video', Boolean(s.error) || !s.data)
  const list = await anon.storage.from('videos').list('uploads')
  check('anon cannot list the private bucket', !list.data || list.data.length === 0)
  const pub = await fetch(`${URL_}/storage/v1/object/public/videos/${path}`)
  check('no permanent public URL exists', pub.status >= 400, String(pub.status))

  await editor.from('content_items').update({ status: 'published', published_at: new Date(Date.now() - 1000).toISOString() }).eq('id', id)
  s = await anon.storage.from('videos').createSignedUrl(path, 60)
  check('anon can sign a PUBLISHED video', !s.error && Boolean(s.data?.signedUrl))
  const play = await fetch(s.data.signedUrl, { headers: { range: 'bytes=0-9' } })
  check('signed URL plays (range request)', play.status === 206 || play.status === 200, String(play.status))
  const dl = await anon.storage.from('videos').createSignedUrl(path, 60, { download: `${slug}.mp4` })
  const dlRes = await fetch(dl.data.signedUrl)
  check('download URL sends an attachment', /attachment/.test(dlRes.headers.get('content-disposition') ?? ''), dlRes.headers.get('content-disposition'))

  const other = await anon.storage.from('videos').createSignedUrl(`uploads/${crypto.randomUUID()}.mp4`, 60)
  check('anon cannot sign an unreferenced path', Boolean(other.error) || !other.data)

  const anonUpdate = await anon.from('content_items').update({ title: 'x' }).eq('id', id).select()
  check('anon cannot modify content', !anonUpdate.data?.length)
  const anonDelete = await anon.storage.from('videos').remove([path])
  check('anon cannot delete the file', (anonDelete.data ?? []).length === 0)

  await editor.from('content_items').update({ status: 'archived' }).eq('id', id)
  s = await anon.storage.from('videos').createSignedUrl(path, 60)
  check('un-publishing revokes access immediately', Boolean(s.error) || !s.data)

  const rm = await editor.storage.from('videos').remove([path])
  check('editor can delete the unreferenced/replaced file', (rm.data ?? []).length === 1)
  await editor.from('content_items').delete().eq('id', id)
  console.log(results.every(Boolean) ? 'ALL PASS' : 'SOME FAILED')
})().catch((e) => { console.error(e); process.exit(1) })

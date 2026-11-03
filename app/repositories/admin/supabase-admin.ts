import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Upload } from 'tus-js-client'
import { z } from 'zod'
import { contentTypes, type ContentType, type PublishStatus } from '~/types/content'
import type {
  AdminCategory,
  AdminContentFilter,
  AdminContentRecord,
  AdminContentSummary,
  AdminProfile,
  AdminStats,
  ContentDraft,
} from '~/types/admin'
import { publishStatuses } from '~/types/admin'
import type { BrandingImage, BrandingSlot, PreparedBrandingImage, SiteBranding } from '~/types/branding'
import { brandingBucket, brandingExtension, brandingSettingKeys, brandingSpecs, brandingStorageBase, defaultSiteBranding, validateBrandingFile } from '~/utils/branding'
import { parseBrandingRows } from '~/utils/branding-rows'
import { mediaExtension, mediaSpecs, validateMediaFile, type MediaKind } from '~/utils/media-upload'
import { bodyToDraftHtml, draftToBody, draftToMetadata, isoToLocalInput, localInputToIso, metadataToDraftFields } from '~/utils/admin-content'
import { sanitizeRichTextInBrowser } from '~/utils/rich-text-client'
import { parseVideoMetadata } from '~/utils/video-metadata'
import { defaultVideoMaxMb, isVideoPath, validateVideoFile, videoBucket, videoExtension, videoFolder } from '~/utils/video-upload'
import { AdminError, type AdminAuth, type AdminBackend, type AdminRepository, type CategoryInput, type VideoUpload } from '~/repositories/admin/admin-repository'

const statusSchema = z.enum(publishStatuses)
const typeSchema = z.enum(contentTypes)

const summaryRowSchema = z.object({
  id: z.string(),
  type: typeSchema,
  slug: z.string(),
  title: z.string(),
  status: statusSchema,
  featured: z.boolean(),
  published_at: z.string().nullable(),
  updated_at: z.string(),
})

const sectionSchema = z.object({
  id: z.string().optional(),
  heading: z.string().optional(),
  paragraphs: z.array(z.string()).default([]),
  quote: z.string().optional(),
  html: z.string().optional(),
})

const recordRowSchema = summaryRowSchema.extend({
  excerpt: z.string(),
  body: z.array(sectionSchema),
  scheduled_at: z.string().nullable(),
  reading_minutes: z.number().nullable(),
  metadata: z.record(z.string(), z.unknown()),
  seo_title: z.string().nullable(),
  seo_description: z.string().nullable(),
  content_categories: z.array(z.object({ category_id: z.string() })),
})

const categoryRowSchema = z.object({
  id: z.string(),
  slug: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  sort_order: z.number(),
  active: z.boolean(),
})

const profileRowSchema = z.object({
  user_id: z.string(),
  display_name: z.string(),
  role: z.enum(['owner', 'editor']),
  active: z.boolean(),
})

const MEDIA_BUCKET = 'publications'
const SUMMARY_COLUMNS ='id, type, slug, title, status, featured, published_at, updated_at'
const RECORD_COLUMNS = `${SUMMARY_COLUMNS}, excerpt, body, scheduled_at, reading_minutes, metadata, seo_title, seo_description, content_categories(category_id)`

function parseRows<T>(schema: z.ZodType<T>, rows: unknown): T[] {
  const parsed = z.array(schema).safeParse(rows)
  if (!parsed.success) throw new AdminError('وصلت من قاعدة البيانات بيانات غير متوقعة. حدّث الصفحة وحاول مرة أخرى.')
  return parsed.data
}

function toSummary(row: z.infer<typeof summaryRowSchema>): AdminContentSummary {
  return { id: row.id, type: row.type, slug: row.slug, title: row.title, status: row.status, featured: row.featured, publishedAt: row.published_at, updatedAt: row.updated_at }
}

/** Maps PostgREST/Postgres failures to Arabic messages without leaking internals. */
function failure(error: { code?: string; message: string }, fallback: string): AdminError {
  if (error.code === '23505') return new AdminError('الرابط المختصر مستخدم من قبل، اختر رابطًا آخر.')
  if (error.code === '42501' || error.code === 'PGRST301') return new AdminError('ليست لديك صلاحية لتنفيذ هذا الإجراء. سجّل الدخول من جديد.')
  if (error.code === '23514') return new AdminError('إحدى القيم لا تطابق القواعد المسموح بها. راجع الحقول وحاول مرة أخرى.')
  console.error('[admin] Supabase request failed', error.code, error.message)
  return new AdminError(fallback)
}

/** Resolves with the HTTP status (0 on a network failure) and reports whole-percent upload progress. */
function sendWithProgress(url: string, headers: Record<string, string>, body: FormData, onProgress?: (percent: number) => void): Promise<number> {
  return new Promise((resolve) => {
    const request = new XMLHttpRequest()
    request.open('POST', url)
    for (const [name, value] of Object.entries(headers)) request.setRequestHeader(name, value)
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.min(100, Math.round((event.loaded / event.total) * 100)))
    }
    request.onload = () => resolve(request.status)
    request.onerror = () => resolve(0)
    request.send(body)
  })
}

/** Maps a failed resumable upload to an editor-readable message. */
function videoUploadFailure(error: unknown): AdminError {
  const status = typeof error === 'object' && error !== null && 'originalResponse' in error
    ? (error as { originalResponse?: { getStatus(): number } | null }).originalResponse?.getStatus()
    : undefined
  if (status === 413) return new AdminError('حجم الفيديو أكبر من الحد المسموح به في الخادم.')
  if (status === 401 || status === 403) return new AdminError('ليست لديك صلاحية رفع الفيديو. سجّل الدخول من جديد.')
  if (status === 415) return new AdminError('صيغة الفيديو غير مقبولة في الخادم.')
  console.error('[admin] video upload failed', status ?? 'network', error instanceof Error ? error.message : '')
  return new AdminError('انقطع رفع الفيديو. تحقق من الاتصال ثم اضغط «إعادة المحاولة» لمتابعة الرفع.')
}

class SupabaseAdminAuth implements AdminAuth {
  readonly source = 'supabase'
  constructor(private readonly client: SupabaseClient) {}

  private async loadProfile(userId: string, email: string): Promise<AdminProfile | null> {
    const { data, error } = await this.client
      .from('admin_profiles')
      .select('user_id, display_name, role, active')
      .eq('user_id', userId)
      .maybeSingle()
    if (error || !data) return null
    const row = profileRowSchema.safeParse(data)
    if (!row.success || !row.data.active) return null
    return { userId: row.data.user_id, email, displayName: row.data.display_name, role: row.data.role }
  }

  async restore(): Promise<AdminProfile | null> {
    const { data } = await this.client.auth.getSession()
    const user = data.session?.user
    if (!user) return null
    const profile = await this.loadProfile(user.id, user.email ?? '')
    if (!profile) await this.client.auth.signOut()
    return profile
  }

  async signIn(email: string, password: string): Promise<AdminProfile> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password })
    if (error || !data.user) {
      // One message for every credential failure so the form cannot be used to probe for accounts.
      if (error?.status === 429) throw new AdminError('محاولات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.')
      throw new AdminError('البريد الإلكتروني أو كلمة المرور غير صحيحة.')
    }
    const profile = await this.loadProfile(data.user.id, data.user.email ?? email)
    if (!profile) {
      await this.client.auth.signOut()
      throw new AdminError('هذا الحساب غير مفعّل كمدير للموقع. تواصل مع مالك الموقع.')
    }
    return profile
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut()
  }

  async requestPasswordReset(email: string, redirectTo: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email, { redirectTo })
    if (!error) return
    if (error.status === 429) throw new AdminError('تم إرسال طلبات كثيرة. انتظر قليلًا ثم حاول مرة أخرى.')
    console.error('[admin] password reset request failed', error.status, error.code)
    throw new AdminError('تعذر إرسال رسالة الاستعادة الآن. حاول لاحقًا أو تواصل مع المطوّر.')
  }

  async completeRecovery(code: string | null): Promise<boolean> {
    if (code) {
      const { error } = await this.client.auth.exchangeCodeForSession(code)
      if (error) throw new AdminError('رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.')
    }
    const { data } = await this.client.auth.getSession()
    return Boolean(data.session)
  }

  async updatePassword(password: string): Promise<AdminProfile> {
    const { data, error } = await this.client.auth.updateUser({ password })
    if (error || !data.user) {
      if (error?.code === 'same_password') throw new AdminError('اختر كلمة مرور مختلفة عن السابقة.')
      if (error?.code === 'weak_password') throw new AdminError('كلمة المرور ضعيفة أو مسرّبة في اختراقات سابقة. اختر كلمة أقوى.')
      console.error('[admin] password update failed', error?.status, error?.code)
      throw new AdminError('تعذر تعيين كلمة المرور. اطلب رابطًا جديدًا وحاول مرة أخرى.')
    }
    const profile = await this.loadProfile(data.user.id, data.user.email ?? '')
    if (!profile) {
      await this.client.auth.signOut()
      throw new AdminError('هذا الحساب غير مفعّل كمدير للموقع. تواصل مع مالك الموقع.')
    }
    return profile
  }
}

class SupabaseAdminRepository implements AdminRepository {
  readonly source = 'supabase'
  constructor(private readonly client: SupabaseClient, private readonly url: string, private readonly publishableKey: string, private readonly videoMaxMb: number) {}

  /** Public object URLs an article image may use; the same prefix the server sanitizer allows. */
  private get imagePrefixes(): string[] {
    return [`${this.url.replace(/\/$/, '')}/storage/v1/object/public/${MEDIA_BUCKET}/`]
  }

  private async currentUserId(): Promise<string> {
    const { data } = await this.client.auth.getUser()
    if (!data.user) throw new AdminError('انتهت الجلسة. سجّل الدخول من جديد.')
    return data.user.id
  }

  async stats(): Promise<AdminStats> {
    const { data, error } = await this.client
      .from('content_items')
      .select(SUMMARY_COLUMNS)
      .order('updated_at', { ascending: false })
      .limit(2000)
    if (error) throw failure(error, 'تعذر تحميل الإحصاءات.')

    const items = parseRows(summaryRowSchema, data).map(toSummary)
    const byType = Object.fromEntries(contentTypes.map(type => [type, 0])) as Record<ContentType, number>
    const byStatus = Object.fromEntries(publishStatuses.map(status => [status, 0])) as Record<PublishStatus, number>
    for (const item of items) {
      byType[item.type] += 1
      byStatus[item.status] += 1
    }
    return { total: items.length, byType, byStatus, recent: items.slice(0, 6) }
  }

  async listContent(filter: AdminContentFilter = {}): Promise<AdminContentSummary[]> {
    let request = this.client.from('content_items').select(SUMMARY_COLUMNS).order('updated_at', { ascending: false }).limit(300)
    if (filter.type) request = request.eq('type', filter.type)
    if (filter.status) request = request.eq('status', filter.status)
    const needle = filter.query?.trim().replace(/[%_,()\\]/g, ' ').trim()
    if (needle) request = request.ilike('title', `%${needle}%`)

    const { data, error } = await request
    if (error) throw failure(error, 'تعذر تحميل المحتوى.')
    return parseRows(summaryRowSchema, data).map(toSummary)
  }

  async getContent(id: string): Promise<AdminContentRecord | null> {
    const { data, error } = await this.client.from('content_items').select(RECORD_COLUMNS).eq('id', id).maybeSingle()
    if (error) throw failure(error, 'تعذر تحميل المادة.')
    if (!data) return null

    const [row] = parseRows(recordRowSchema, [data])
    if (!row) return null
    return {
      id: row.id,
      type: row.type,
      slug: row.slug,
      title: row.title,
      excerpt: row.excerpt,
      bodyHtml: bodyToDraftHtml(row.body.map(section => ({
        id: section.id ?? crypto.randomUUID(),
        paragraphs: section.paragraphs,
        ...(section.heading ? { heading: section.heading } : {}),
        ...(section.quote ? { quote: section.quote } : {}),
        ...(section.html === undefined ? {} : { html: section.html }),
      }))),
      status: row.status,
      publishedAt: isoToLocalInput(row.published_at),
      scheduledAt: isoToLocalInput(row.scheduled_at),
      featured: row.featured,
      readingMinutes: row.reading_minutes === null ? '' : String(row.reading_minutes),
      seoTitle: row.seo_title ?? '',
      seoDescription: row.seo_description ?? '',
      categoryIds: row.content_categories.map(link => link.category_id),
      ...metadataToDraftFields(row.type, row.metadata),
    }
  }

  /** The uploaded video a saved record currently points at, so a replaced or removed file can be cleaned up after a successful save. */
  private async storedVideoPath(id: string): Promise<string | undefined> {
    const { data } = await this.client.from('content_items').select('metadata').eq('id', id).maybeSingle()
    const metadata = (data as { metadata?: unknown } | null)?.metadata
    return typeof metadata === 'object' && metadata !== null ? parseVideoMetadata(metadata as Record<string, unknown>).videoPath : undefined
  }

  async saveContent(draft: ContentDraft, id?: string): Promise<string> {
    const userId = await this.currentUserId()
    const previousVideoPath = id ? await this.storedVideoPath(id) : undefined
    const metadata = draftToMetadata(draft)
    const published = draft.status === 'published'
    const row = {
      type: draft.type,
      slug: draft.slug.trim(),
      title: draft.title.trim(),
      excerpt: draft.excerpt.trim(),
      // The editor already restricts formatting; this makes the stored HTML match the allow-list the public site enforces.
      body: draftToBody(sanitizeRichTextInBrowser(draft.bodyHtml, this.imagePrefixes)),
      status: draft.status,
      // The database requires a publish time for published rows; a future time keeps the row hidden until then.
      published_at: published ? (localInputToIso(draft.publishedAt) ?? new Date().toISOString()) : localInputToIso(draft.publishedAt),
      scheduled_at: draft.status === 'scheduled' ? localInputToIso(draft.scheduledAt) : null,
      featured: draft.featured,
      reading_minutes: draft.readingMinutes.trim() ? Number(draft.readingMinutes) : null,
      metadata,
      seo_title: draft.seoTitle.trim() || null,
      seo_description: draft.seoDescription.trim() || null,
      updated_by: userId,
    }

    const saved = id
      ? await this.client.from('content_items').update(row).eq('id', id).select('id').maybeSingle()
      : await this.client.from('content_items').insert({ ...row, created_by: userId }).select('id').single()
    if (saved.error) throw failure(saved.error, 'تعذر حفظ المادة.')
    if (!saved.data) throw new AdminError('لم يتم العثور على المادة، ربما حُذفت.')

    const contentId = z.object({ id: z.string() }).parse(saved.data).id
    await this.syncCategories(contentId, draft.categoryIds)
    // The record no longer points at the old file, so nothing else can be using it.
    const nextVideoPath = typeof metadata.videoPath === 'string' ? metadata.videoPath : undefined
    if (previousVideoPath && previousVideoPath !== nextVideoPath) await this.removeVideoFile(previousVideoPath)
    return contentId
  }

  private async syncCategories(contentId: string, categoryIds: string[]): Promise<void> {
    const existing = await this.client.from('content_categories').select('category_id').eq('content_id', contentId)
    if (existing.error) throw failure(existing.error, 'حُفظت المادة لكن تعذر تحديث التصنيفات.')

    const current = new Set(parseRows(z.object({ category_id: z.string() }), existing.data).map(link => link.category_id))
    const wanted = new Set(categoryIds)
    const toRemove = [...current].filter(categoryId => !wanted.has(categoryId))
    const toAdd = [...wanted].filter(categoryId => !current.has(categoryId))

    if (toRemove.length) {
      const removed = await this.client.from('content_categories').delete().eq('content_id', contentId).in('category_id', toRemove)
      if (removed.error) throw failure(removed.error, 'حُفظت المادة لكن تعذر تحديث التصنيفات.')
    }
    if (toAdd.length) {
      const added = await this.client.from('content_categories').insert(toAdd.map(categoryId => ({ content_id: contentId, category_id: categoryId })))
      if (added.error) throw failure(added.error, 'حُفظت المادة لكن تعذر تحديث التصنيفات.')
    }
  }

  async deleteContent(id: string): Promise<void> {
    const videoPath = await this.storedVideoPath(id)
    const { error } = await this.client.from('content_items').delete().eq('id', id)
    if (error) throw failure(error, 'تعذر حذف المادة.')
    if (videoPath) await this.removeVideoFile(videoPath)
  }

  /** Uploads to a public bucket with the editor's session and returns the object's public URL. */
  private async putObject(bucket: string, path: string, file: File, onProgress?: (percent: number) => void): Promise<string> {
    const { data } = await this.client.auth.getSession()
    if (!data.session) throw new AdminError('انتهت الجلسة. سجّل الدخول من جديد.')

    const body = new FormData()
    body.append('cacheControl', '31536000')
    body.append('', file)
    // supabase-js cannot report upload progress, so the same storage endpoint is called directly with the editor's session.
    const status = await sendWithProgress(`${this.url}/storage/v1/object/${bucket}/${path}`, { apikey: this.publishableKey, authorization: `Bearer ${data.session.access_token}` }, body, onProgress)
    if (status === 401 || status === 403) throw new AdminError('ليست لديك صلاحية رفع الملفات. سجّل الدخول من جديد.')
    if (status === 413) throw new AdminError('حجم الملف أكبر من الحد المسموح به.')
    if (status < 200 || status >= 300) {
      console.error('[admin] upload failed', bucket, status)
      throw new AdminError('تعذر رفع الملف. تحقق من الاتصال وحاول مرة أخرى.')
    }
    return this.client.storage.from(bucket).getPublicUrl(path).data.publicUrl
  }

  async uploadMedia(kind: MediaKind, file: File, onProgress?: (percent: number) => void): Promise<string> {
    const problem = validateMediaFile(kind, file)
    if (problem) throw new AdminError(problem)
    const extension = mediaExtension(kind, file.type)
    if (!extension) throw new AdminError(mediaSpecs[kind].wrongTypeMessage)

    // A random name avoids collisions and keeps Arabic file names out of the public URL.
    return this.putObject(MEDIA_BUCKET, `${mediaSpecs[kind].folder}/${crypto.randomUUID()}.${extension}`, file, onProgress)
  }

  uploadVideo(file: File, onProgress?: (percent: number) => void): VideoUpload {
    const problem = validateVideoFile(file, this.videoMaxMb)
    const extension = videoExtension(file.type)
    if (problem || !extension) return { result: Promise.reject(new AdminError(problem ?? 'صيغة الفيديو غير مدعومة.')), abort: () => undefined }

    let upload: Upload | undefined
    let cancelled = false
    const result = (async () => {
      const { data } = await this.client.auth.getSession()
      if (!data.session) throw new AdminError('انتهت الجلسة. سجّل الدخول من جديد.')

      // A random name keeps Arabic file names out of storage and means an upload can never overwrite another video.
      let path = `${videoFolder}/${crypto.randomUUID()}.${extension}`
      const tus = new Upload(file, {
        // Supabase Storage's resumable (TUS) endpoint; chunks must be exactly 6 MB.
        endpoint: `${this.url}/storage/v1/upload/resumable`,
        chunkSize: 6 * 1024 * 1024,
        retryDelays: [0, 3000, 5000, 10000, 20000],
        headers: { apikey: this.publishableKey },
        uploadDataDuringCreation: true,
        removeFingerprintOnSuccess: true,
        metadata: { bucketName: videoBucket, objectName: path, contentType: file.type, cacheControl: '3600' },
        // Long uploads outlive one access token, so every request carries the session's current one.
        onBeforeRequest: async (request) => {
          const { data: current } = await this.client.auth.getSession()
          if (current.session) request.setHeader('Authorization', `Bearer ${current.session.access_token}`)
        },
        onProgress: (sent, total) => onProgress?.(Math.min(100, Math.round((sent / total) * 100))),
      })
      upload = tus

      // Picking the same file again after a dropped connection continues the earlier upload instead of starting over.
      const previous = (await tus.findPreviousUploads())[0]
      const previousPath = previous?.metadata.objectName
      if (previous && isVideoPath(previousPath)) {
        path = previousPath
        tus.resumeFromPreviousUpload(previous)
      }
      if (cancelled) throw new AdminError('أُلغي رفع الفيديو.')

      await new Promise<void>((resolve, reject) => {
        tus.options.onSuccess = () => resolve()
        tus.options.onError = error => reject(cancelled ? new AdminError('أُلغي رفع الفيديو.') : videoUploadFailure(error))
        tus.start()
      })
      return { path, mimeType: file.type, bytes: file.size }
    })()

    return {
      result,
      abort: () => {
        cancelled = true
        // Terminating also deletes the partial object on the server.
        void upload?.abort(true).catch(() => undefined)
      },
    }
  }

  async previewVideoUrl(path: string): Promise<string> {
    if (!isVideoPath(path)) throw new AdminError('ملف الفيديو غير صالح.')
    const { data, error } = await this.client.storage.from(videoBucket).createSignedUrl(path, 60 * 60)
    if (error || !data) throw new AdminError('تعذر تحميل معاينة الفيديو.')
    return data.signedUrl
  }

  async removeVideoFile(path: string): Promise<void> {
    if (!isVideoPath(path)) return
    const { error } = await this.client.storage.from(videoBucket).remove([path])
    if (error) console.error('[admin] could not remove an unused video file', path)
  }

  async getSiteBranding(): Promise<SiteBranding> {
    const { data, error } = await this.client.from('site_settings').select('key, value').in('key', [...brandingSettingKeys])
    if (error) throw failure(error, 'تعذر تحميل هوية الموقع.')
    return parseBrandingRows(data, brandingStorageBase(this.url))
  }

  async saveBrandingImage(slot: BrandingSlot, image: PreparedBrandingImage, onProgress?: (percent: number) => void): Promise<BrandingImage> {
    const problem = validateBrandingFile(image.file)
    if (problem) throw new AdminError(problem)
    const extension = brandingExtension(image.file.type)
    if (!extension) throw new AdminError('الصورة يجب أن تكون بصيغة PNG أو WebP.')

    // Every upload gets a new path, so a saved image is never overwritten and each URL is safe to cache for good.
    const spec = brandingSpecs[slot]
    const storagePath = `${spec.folder}/${crypto.randomUUID()}.${extension}`
    const url = await this.putObject(brandingBucket, storagePath, image.file, onProgress)

    const value = { url, storagePath, alt: image.alt, width: image.width, height: image.height, updatedAt: new Date().toISOString() }
    const { error } = await this.client.from('site_settings').upsert({ key: spec.settingKey, value, public_readable: true }, { onConflict: 'key' })
    if (error) {
      // The setting still points at the previous image, so the live site is untouched. Drop the file that was just uploaded.
      const cleanup = await this.client.storage.from(brandingBucket).remove([storagePath])
      if (cleanup.error) console.error('[admin] could not remove the unused branding upload', storagePath)
      throw failure(error, 'تعذر حفظ الصورة. لم يتغير شيء على الموقع.')
    }
    // The replaced file is kept on purpose: pages cached elsewhere may still reference it until they reload.
    return { url, width: image.width, height: image.height, alt: image.alt, custom: true }
  }

  async resetBrandingImage(slot: BrandingSlot): Promise<BrandingImage> {
    const { error } = await this.client.from('site_settings').delete().eq('key', brandingSpecs[slot].settingKey)
    if (error) throw failure(error, 'تعذر استعادة الصورة الافتراضية.')
    // Row-level security hides rows from an unauthorized caller instead of raising, so confirm the override is really gone.
    if ((await this.getSiteBranding())[slot].custom) throw new AdminError('ليست لديك صلاحية لتغيير هوية الموقع. هذه الصفحة للمالك فقط.')
    return defaultSiteBranding()[slot]
  }

  async listCategories(): Promise<AdminCategory[]> {
    const { data, error } = await this.client.from('categories').select('id, slug, name, description, sort_order, active').order('sort_order').order('name')
    if (error) throw failure(error, 'تعذر تحميل التصنيفات.')
    return parseRows(categoryRowSchema, data).map(row => ({ id: row.id, slug: row.slug, name: row.name, description: row.description ?? '', sortOrder: row.sort_order, active: row.active }))
  }

  async saveCategory(input: CategoryInput, id?: string): Promise<void> {
    const row = { slug: input.slug.trim(), name: input.name.trim(), description: input.description.trim() || null, sort_order: input.sortOrder, active: input.active }
    const { error } = id
      ? await this.client.from('categories').update(row).eq('id', id)
      : await this.client.from('categories').insert(row)
    if (error) throw failure(error, 'تعذر حفظ التصنيف.')
  }
}

export function createSupabaseAdminBackend(url: string, publishableKey: string, videoMaxMb: number = defaultVideoMaxMb): AdminBackend {
  // Unlike the public repository this client keeps the editor's session so RLS sees `auth.uid()`.
  const client = createClient(url, publishableKey, { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, flowType: 'pkce' } })
  return { auth: new SupabaseAdminAuth(client), repository: new SupabaseAdminRepository(client, url, publishableKey, videoMaxMb) }
}

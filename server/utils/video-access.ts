import type { H3Event } from 'h3'
import type { VideoAccessMode } from '~/types/content'

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** Shared by the playback and download endpoints: validates the slug, asks the repository (which enforces the policy), maps the outcome to HTTP. */
export async function resolveVideoAccess(event: H3Event, mode: VideoAccessMode) {
  const slug = getRouterParam(event, 'slug') ?? ''
  if (!slugPattern.test(slug)) throw createError({ statusCode: 400, statusMessage: 'رابط الفيديو غير صالح' })

  // Signed URLs expire, so a cached response would hand out a dead link.
  setResponseHeader(event, 'cache-control', 'no-store')

  let access
  try {
    access = await getContentRepository(event).getVideoAccess(slug, mode)
  }
  catch (cause) {
    console.error('Video access failure', cause)
    throw createError({ statusCode: 503, statusMessage: 'تعذر تحميل الفيديو الآن' })
  }

  if (access.status === 'not-found') throw createError({ statusCode: 404, statusMessage: 'الفيديو غير موجود' })
  if (access.status === 'download-disabled') throw createError({ statusCode: 403, statusMessage: 'تنزيل هذا الفيديو غير متاح' })
  return access
}

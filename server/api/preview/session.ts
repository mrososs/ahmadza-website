import type { H3Event } from 'h3'

/**
 * The preview session of the admin who is looking at the unpublished site. One path, two verbs, and a clean 405 for anything
 * else (a missing verb handler would fall through to the page renderer, which has nothing to say here).
 *
 * POST   Called by the admin console right after sign-in (and before opening the site). The caller proves who they are with their
 *        Supabase access token; the database, not this code, decides whether that user is an active admin and issues the session.
 *        The token goes into an HttpOnly cookie, so page scripts never see it and nothing in the URL or localStorage grants access.
 * DELETE Sign-out: revoke the session in the database and clear the cookie. Always clears, even if the database is unreachable.
 */
export default defineEventHandler(async (event) => {
  setResponseHeader(event, 'cache-control', 'no-store')

  if (event.method === 'POST') return startSession(event)
  if (event.method === 'DELETE') return endSession(event)

  setResponseHeader(event, 'allow', 'POST, DELETE')
  throw createError({ statusCode: 405, statusMessage: 'Method Not Allowed' })
})

async function startSession(event: H3Event) {
  const accessToken = /^Bearer ([\w-]+\.[\w-]+\.[\w-]+)$/.exec(getRequestHeader(event, 'authorization') ?? '')?.[1]
  if (!accessToken) throw createError({ statusCode: 401, statusMessage: 'تسجيل الدخول مطلوب' })

  let token: string | null
  try {
    token = await getContentRepository().startPreviewSession(accessToken)
  }
  catch (cause) {
    console.error('[preview] could not start a preview session', cause)
    throw createError({ statusCode: 503, statusMessage: 'تعذر تفعيل المعاينة الآن' })
  }
  if (!token) throw createError({ statusCode: 403, statusMessage: 'هذا الحساب غير مخوّل بمعاينة الموقع' })

  setPreviewCookie(event, token)
  return { ok: true, expiresInSeconds: previewSessionSeconds }
}

async function endSession(event: H3Event) {
  const token = readPreviewToken(event)
  clearPreviewCookie(event)
  if (token) {
    forgetPreviewToken(token)
    try {
      await getContentRepository().endPreviewSession(token)
    }
    catch (cause) {
      // The cookie is gone from this browser; the row simply expires on its own.
      console.error('[preview] could not end the preview session in the database', cause)
    }
  }
  return { ok: true }
}

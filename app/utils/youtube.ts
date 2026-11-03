/**
 * YouTube link handling. Editors paste whatever the browser address bar or the Share button gave them; only the
 * 11-character video id is stored, and the embed URL is always built here, so a pasted link can never become an arbitrary iframe source.
 */
const idPattern = /^[\w-]{11}$/
const hosts = new Set(['youtube.com', 'www.youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com', 'www.youtube-nocookie.com'])
const pathPrefixes = new Set(['embed', 'shorts', 'live', 'v'])

export type YoutubeParseResult = { ok: true; id: string } | { ok: false; message: string }

const invalid = (message: string): YoutubeParseResult => ({ ok: false, message })

export function parseYoutubeInput(input: string): YoutubeParseResult {
  const value = input.trim()
  if (!value) return invalid('أدخل رابط فيديو يوتيوب.')
  if (idPattern.test(value)) return { ok: true, id: value }

  let url: URL
  try {
    url = new URL(/^[a-z][a-z\d+.-]*:\/\//i.test(value) ? value : `https://${value}`)
  }
  catch {
    return invalid('الرابط غير صالح. الصق رابط الفيديو كما يظهر في يوتيوب.')
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return invalid('الرابط يجب أن يبدأ بـ https://')

  const host = url.hostname.toLowerCase()
  const segments = url.pathname.split('/').filter(Boolean)
  let candidate: string | null | undefined

  if (host === 'youtu.be' || host === 'www.youtu.be') candidate = segments[0]
  else if (hosts.has(host)) {
    if (segments[0] === 'watch') candidate = url.searchParams.get('v')
    else if (segments[0] && pathPrefixes.has(segments[0])) candidate = segments[1]
  }
  else return invalid('الرابط ليس من يوتيوب. استخدم رابطًا من youtube.com أو youtu.be.')

  if (candidate && idPattern.test(candidate)) return { ok: true, id: candidate }
  if (hosts.has(host) && (segments[0] === 'playlist' || segments[0] === 'channel' || segments[0]?.startsWith('@'))) {
    return invalid('هذا الرابط لقائمة تشغيل أو قناة. الصق رابط فيديو واحد.')
  }
  return invalid('لم نجد معرّف فيديو في هذا الرابط. تأكد من نسخه كاملًا.')
}

export const youtubeEmbedOrigin = 'https://www.youtube-nocookie.com'

/** `origin` lets the embedded player report errors (such as "embedding disabled by the owner") back to the page. */
export const youtubeEmbedUrl = (id: string, origin?: string) =>
  `${youtubeEmbedOrigin}/embed/${id}?rel=0&playsinline=1&enablejsapi=1${origin ? `&origin=${encodeURIComponent(origin)}` : ''}`
export const youtubeWatchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`
export const youtubeThumbnailUrl = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`

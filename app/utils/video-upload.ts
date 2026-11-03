/** The private bucket that holds uploaded videos. Created (and locked down) by the `videos_bucket` migration. */
export const videoBucket = 'videos'
export const videoFolder = 'uploads'

const MB = 1024 * 1024

/** Mirrors the bucket's `allowed_mime_types`. MP4 (H.264/AAC) is the format every current browser plays. */
export const videoTypes: Readonly<Record<string, string>> = { 'video/mp4': 'mp4', 'video/webm': 'webm' }

/** Mirrors the bucket's `file_size_limit`. The Supabase project's own global upload limit may be lower. */
export const defaultVideoMaxMb = 200

export const videoAccept = [...Object.keys(videoTypes), ...Object.values(videoTypes).map(extension => `.${extension}`)].join(',')

export function videoExtension(mimeType: string): string | undefined {
  return videoTypes[mimeType]
}

export function formatMegabytes(bytes: number): string {
  return new Intl.NumberFormat('ar-EG', { maximumFractionDigits: 1 }).format(bytes / MB)
}

/** Returns an editor-readable Arabic message, or null when the file may be uploaded. */
export function validateVideoFile(file: { type: string; size: number }, maxMb = defaultVideoMaxMb): string | null {
  if (!videoExtension(file.type)) return 'صيغة الفيديو غير مدعومة. استخدم ملف MP4 (يفضّل H.264) أو WebM.'
  if (file.size === 0) return 'الملف فارغ.'
  if (file.size > maxMb * MB) return `حجم الفيديو أكبر من ${formatMegabytes(maxMb * MB)} ميجابايت.`
  return null
}

const pathPattern = /^uploads\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(mp4|webm)$/

/** Only paths this feature generates are accepted from stored metadata, so a record can never point the signer at another file. */
export const isVideoPath = (value: unknown): value is string => typeof value === 'string' && pathPattern.test(value)

/** Playing time of a local video file, read by the browser from its header. Undefined when the browser cannot tell. */
export function readVideoDuration(file: Blob): Promise<number | undefined> {
  const url = URL.createObjectURL(file)
  return new Promise<number | undefined>((resolve) => {
    const video = document.createElement('video')
    const finish = (value: number | undefined) => {
      URL.revokeObjectURL(url)
      resolve(value)
    }
    video.preload = 'metadata'
    video.onloadedmetadata = () => finish(Number.isFinite(video.duration) ? Math.round(video.duration) : undefined)
    video.onerror = () => finish(undefined)
    video.src = url
  })
}

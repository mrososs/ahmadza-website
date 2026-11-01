export type MediaKind = 'pdf' | 'audio' | 'image'

interface MediaSpec {
  /** Accepted MIME type mapped to the extension used for the stored file. */
  readonly types: Readonly<Record<string, string>>
  readonly maxBytes: number
  readonly folder: string
  readonly wrongTypeMessage: string
}

const MB = 1024 * 1024

export const mediaSpecs: Readonly<Record<MediaKind, MediaSpec>> = {
  pdf: { types: { 'application/pdf': 'pdf' }, maxBytes: 50 * MB, folder: 'books', wrongTypeMessage: 'الملف يجب أن يكون بصيغة PDF.' },
  audio: {
    types: { 'audio/mpeg': 'mp3', 'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/ogg': 'ogg', 'audio/webm': 'webm' },
    maxBytes: 50 * MB,
    folder: 'audio',
    wrongTypeMessage: 'الملف يجب أن يكون صوتيًا بصيغة MP3 أو M4A أو WAV أو OGG.',
  },
  image: { types: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }, maxBytes: 5 * MB, folder: 'covers', wrongTypeMessage: 'الصورة يجب أن تكون بصيغة JPG أو PNG أو WEBP.' },
}

/** Value for `<input accept>`: MIME types plus the matching extensions, since some browsers report empty MIME types. */
export function acceptAttribute(kind: MediaKind): string {
  const { types } = mediaSpecs[kind]
  return [...Object.keys(types), ...new Set(Object.values(types).map(extension => `.${extension}`))].join(',')
}

export function mediaExtension(kind: MediaKind, mimeType: string): string | undefined {
  return mediaSpecs[kind].types[mimeType]
}

/** Returns an editor-readable Arabic message, or null when the file may be uploaded. */
export function validateMediaFile(kind: MediaKind, file: { type: string; size: number }): string | null {
  const spec = mediaSpecs[kind]
  if (!mediaExtension(kind, file.type)) return spec.wrongTypeMessage
  if (file.size === 0) return 'الملف فارغ.'
  if (file.size > spec.maxBytes) return `حجم الملف أكبر من ${Math.round(spec.maxBytes / MB)} ميجابايت.`
  return null
}

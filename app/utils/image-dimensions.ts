export interface ImageSize {
  width: number
  height: number
}

const MIN_WIDTH = 320
const MIN_HEIGHT = 180
const MAX_EDGE = 8000

/** Natural size of an image file, read in the browser before anything is uploaded. Rejects when the file is not a decodable image. */
export async function readImageSize(file: Blob): Promise<ImageSize> {
  const url = URL.createObjectURL(file)
  try {
    return await new Promise<ImageSize>((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight })
      image.onerror = () => reject(new Error('undecodable image'))
      image.src = url
    })
  }
  catch {
    return { width: 0, height: 0 }
  }
  finally {
    URL.revokeObjectURL(url)
  }
}

/** Returns an editor-readable Arabic message, or null when the picture is a usable size. Zero means the file could not be decoded. */
export function validateImageDimensions({ width, height }: ImageSize): string | null {
  if (width === 0 || height === 0) return 'تعذر قراءة الصورة. تأكد أنها ملف صورة سليم.'
  if (width < MIN_WIDTH || height < MIN_HEIGHT) return `الصورة صغيرة جدًا. الحد الأدنى ${MIN_WIDTH}×${MIN_HEIGHT} بكسل.`
  if (width > MAX_EDGE || height > MAX_EDGE) return `الصورة كبيرة جدًا. الحد الأقصى ${MAX_EDGE} بكسل لأي ضلع.`
  return null
}

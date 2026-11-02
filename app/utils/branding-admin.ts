import type { BrandingSlot } from '~/types/branding'
import { brandingMaxSide, brandingSpecs, type Dimensions } from '~/utils/branding'

interface BrandingCopy {
  title: string
  subtitle: string
  /** Shown verbatim, one fact per line. */
  helper: string
  hint?: string
  savedMessage: string
  resetMessage: string
}

export const brandingCopy: Readonly<Record<BrandingSlot, BrandingCopy>> = {
  headerLogo: {
    title: 'شعار الموقع',
    subtitle: 'الشعار الذي يظهر في رأس الموقع.',
    helper: 'المقاس الموصى به: 1200 × 500 بكسل\n(نسبة 12:5، عريضة قليلًا).\nالصيغ المدعومة: PNG أو WebP.\nيُفضّل استخدام خلفية شفافة.\nالحد الأقصى: 5 ميجابايت.',
    savedMessage: 'تم حفظ شعار الموقع، وسيظهر في رأس الموقع عند فتح أي صفحة.',
    resetMessage: 'عاد شعار الموقع إلى الصورة الافتراضية.',
  },
  heroImage: {
    title: 'صورة الواجهة الرئيسية',
    subtitle: 'الصورة الرئيسية التي تظهر أعلى الموقع.',
    helper: 'المقاس الموصى به: 1600 × 900 بكسل\n(نسبة 16:9).\nالصيغ المدعومة: PNG أو WebP.\nيُفضّل استخدام خلفية شفافة.\nالحد الأقصى: 5 ميجابايت.',
    hint: 'يُفضّل أن تتضمن الصورة كلمة «موقع»،\nواسم «أحمد الزهراني» بالخط العربي،\nوعبارة Website Ahmed Alzahrani.',
    savedMessage: 'تم حفظ صورة الواجهة الرئيسية، وستظهر أعلى الموقع عند فتح أي صفحة.',
    resetMessage: 'عادت صورة الواجهة الرئيسية إلى الصورة الافتراضية.',
  },
}

export interface BrandingImageInfo extends Dimensions {
  /** Null when the pixels could not be inspected. */
  hasTransparency: boolean | null
  /** True when visible artwork reaches the image border, so it may look clipped. */
  touchesEdge: boolean | null
}

export interface BrandingAssessment {
  /** Blocks the upload. */
  error: string | null
  /** Shown beside the preview; the owner may still save. */
  warnings: string[]
}

/** Keeps "800 × 600" in reading order inside Arabic text. */
export const sizeLabel = ({ width, height }: Dimensions) => `⁦${width} × ${height}⁩`

export function formatFileSize(bytes: number): string {
  return bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} ميجابايت` : `${Math.max(1, Math.round(bytes / 1024))} كيلوبايت`
}

export function assessBrandingImage(slot: BrandingSlot, info: BrandingImageInfo): BrandingAssessment {
  const { minimum, recommended, ratio } = brandingSpecs[slot]

  if (info.width < minimum.width || info.height < minimum.height) {
    return { error: `الصورة صغيرة جدًا (${sizeLabel(info)} بكسل). الحد الأدنى ${sizeLabel(minimum)} بكسل، والموصى به ${sizeLabel(recommended)}.`, warnings: [] }
  }
  if (Math.max(info.width, info.height) > brandingMaxSide) {
    return { error: `أبعاد الصورة كبيرة جدًا (${sizeLabel(info)} بكسل). الحد الأقصى ${brandingMaxSide} بكسل لأي ضلع.`, warnings: [] }
  }

  const warnings: string[] = []
  if (info.width < recommended.width || info.height < recommended.height) {
    warnings.push(`الصورة أقل من المقاس الموصى به (${sizeLabel(recommended)} بكسل)، وقد تبدو أقل حدّة على الشاشات عالية الدقة.`)
  }
  if (Math.abs(info.width / info.height / (ratio.width / ratio.height) - 1) > 0.12) {
    warnings.push(`نسبة الصورة تختلف عن ${ratio.width}:${ratio.height}. ستظهر كاملة دون قص أو تمطيط، لكن قد تبدو أصغر أو بهوامش إضافية.`)
  }
  if (info.hasTransparency === false) {
    warnings.push('الصورة بلا خلفية شفافة، وستظهر خلفيتها كمستطيل فوق خلفية الموقع.')
  }
  if (info.touchesEdge) {
    warnings.push('تلامس الكتابة حافة الصورة، وقد تبدو مقصوصة. يُفضّل ترك هامش حولها.')
  }
  return { error: null, warnings }
}

function analyzePixels(bitmap: ImageBitmap): Pick<BrandingImageInfo, 'hasTransparency' | 'touchesEdge'> {
  const unknown = { hasTransparency: null, touchesEdge: null }
  try {
    // A small copy is enough to see whether the background is transparent and whether artwork touches the border.
    const scale = Math.min(1, 256 / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) return unknown
    context.drawImage(bitmap, 0, 0, width, height)
    const { data } = context.getImageData(0, 0, width, height)

    let transparent = false
    let edge = false
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const alpha = data[(y * width + x) * 4 + 3] ?? 255
        if (alpha < 250) transparent = true
        if (alpha > 64 && (x === 0 || y === 0 || x === width - 1 || y === height - 1)) edge = true
      }
    }
    return { hasTransparency: transparent, touchesEdge: transparent && edge }
  }
  catch {
    return unknown
  }
}

/** Decodes the file in the browser. Rejects when it is not a readable image, whatever its extension says. */
export async function inspectBrandingImage(file: File): Promise<BrandingImageInfo> {
  const bitmap = await createImageBitmap(file)
  try {
    return { width: bitmap.width, height: bitmap.height, ...analyzePixels(bitmap) }
  }
  finally {
    bitmap.close()
  }
}

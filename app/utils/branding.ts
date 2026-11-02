import { brandingSlots, type BrandingSlot, type SiteBranding } from '~/types/branding'

export interface Dimensions {
  width: number
  height: number
}

interface BrandingSpec {
  /** Row key in `site_settings`. */
  readonly settingKey: string
  /** Folder in the `site-branding` bucket; the database check constraint and storage policy require it. */
  readonly folder: string
  /** Artwork bundled in /public, shown whenever the owner has no override. */
  readonly fallback: Dimensions & { readonly url: string }
  readonly recommended: Dimensions
  /** The framing the slot's layout is designed for; other ratios are allowed with a warning. */
  readonly ratio: Dimensions
  /** Smaller images are rejected: they would look soft even at 1x. */
  readonly minimum: Dimensions
}

const MB = 1024 * 1024

export const brandingBucket = 'site-branding'
export const brandingMaxBytes = 5 * MB
/** Accepted MIME type mapped to the stored extension. SVG is deliberately absent: it can carry script. */
export const brandingMimeTypes: Readonly<Record<string, string>> = { 'image/png': 'png', 'image/webp': 'webp' }
export const brandingAccept = 'image/png,image/webp,.png,.webp'
/** Sanity ceiling so a huge image cannot exhaust memory while it is decoded in the browser. */
export const brandingMaxSide = 6000
// Both bundled images are the client's «أحمد الزهراني» artwork. The hero is the full lockup (16:9); the header logo is the
// same artwork without the English line, so the Arabic name stays legible at header height (about 12:5).
export const brandingSpecs: Readonly<Record<BrandingSlot, BrandingSpec>> = {
  headerLogo: {
    settingKey: 'branding.header_logo',
    folder: 'header-logo',
    fallback: { url: '/branding/header-logo-ahmad-alzahrani.webp', width: 640, height: 280 },
    recommended: { width: 1200, height: 500 },
    ratio: { width: 12, height: 5 },
    minimum: { width: 600, height: 250 },
  },
  heroImage: {
    settingKey: 'branding.hero_image',
    folder: 'hero-image',
    fallback: { url: '/branding/hero-ahmad-alzahrani.webp', width: 1400, height: 788 },
    recommended: { width: 1600, height: 900 },
    ratio: { width: 16, height: 9 },
    minimum: { width: 800, height: 450 },
  },
}

export const brandingSettingKeys: readonly string[] = brandingSlots.map(slot => brandingSpecs[slot].settingKey)

/** A fresh object each call, so callers may mutate their copy. */
export function defaultSiteBranding(): SiteBranding {
  const image = (slot: BrandingSlot) => ({ ...brandingSpecs[slot].fallback, alt: '', custom: false })
  return { headerLogo: image('headerLogo'), heroImage: image('heroImage') }
}

/** Public URL prefix of the branding bucket for a Supabase project. */
export function brandingStorageBase(supabaseUrl: string): string {
  return `${supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/public/${brandingBucket}/`
}

export function brandingExtension(mimeType: string): string | undefined {
  return brandingMimeTypes[mimeType]
}

/** Returns an editor-readable Arabic message, or null when the file may be uploaded. */
export function validateBrandingFile(file: { type: string; size: number }): string | null {
  if (!brandingExtension(file.type)) return 'الصورة يجب أن تكون بصيغة PNG أو WebP. صيغ مثل JPG وSVG وGIF غير مدعومة.'
  if (file.size === 0) return 'الملف فارغ.'
  if (file.size > brandingMaxBytes) return `حجم الملف أكبر من ${Math.round(brandingMaxBytes / MB)} ميجابايت.`
  return null
}

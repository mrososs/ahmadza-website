/** The two owner-managed images. They are independent: each has its own setting row, upload and reset. */
export const brandingSlots = ['headerLogo', 'heroImage'] as const
export type BrandingSlot = (typeof brandingSlots)[number]

export interface BrandingImage {
  url: string
  width: number
  height: number
  /** Empty for the bundled artwork; components fall back to the author's display name. */
  alt: string
  /** True when the owner uploaded this image, false for the artwork bundled with the site. */
  custom: boolean
}

export type SiteBranding = Record<BrandingSlot, BrandingImage>

export interface SiteBrandingResult {
  branding: SiteBranding
  /** `fallback` means the data source failed and the bundled images are being served. */
  source: 'supabase' | 'demo' | 'fallback'
}

/** A validated file plus the pixel size read from the decoded image, ready to upload. */
export interface PreparedBrandingImage {
  file: File
  width: number
  height: number
  alt: string
}

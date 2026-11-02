import { z } from 'zod'
import { brandingSlots, type SiteBranding } from '~/types/branding'
import { brandingSpecs, defaultSiteBranding } from '~/utils/branding'

const rowSchema = z.object({ key: z.string(), value: z.unknown() })
const uuid = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'

/** Mirrors the `site_settings_branding_value_check` constraint so a bad row can never reach the page. */
const valueSchema = (folder: string) => z.object({
  url: z.string().regex(/^https?:\/\//),
  storagePath: z.string().regex(new RegExp(`^${folder}/${uuid}\\.(png|webp)$`)),
  width: z.number().int().min(1).max(20000),
  height: z.number().int().min(1).max(20000),
  alt: z.string().max(200).default(''),
})

/**
 * Turns `site_settings` rows into the branding the site renders. Anything missing or malformed falls back to
 * the bundled image for that slot only, and says so in the log so the fallback is never silent.
 */
export function parseBrandingRows(rows: unknown, storageBase: string): SiteBranding {
  const branding = defaultSiteBranding()
  const parsedRows = z.array(rowSchema).safeParse(rows)
  if (!parsedRows.success) {
    console.warn('[branding] unexpected site_settings rows; serving the bundled images')
    return branding
  }

  for (const slot of brandingSlots) {
    const spec = brandingSpecs[slot]
    const row = parsedRows.data.find(candidate => candidate.key === spec.settingKey)
    if (!row) continue
    const value = valueSchema(spec.folder).safeParse(row.value)
    // The URL must be exactly this project's public branding bucket + the validated path; nothing external.
    if (!value.success || value.data.url !== `${storageBase}${value.data.storagePath}`) {
      console.warn(`[branding] ignoring invalid ${spec.settingKey}; serving the bundled image`)
      continue
    }
    branding[slot] = { url: value.data.url, width: value.data.width, height: value.data.height, alt: value.data.alt, custom: true }
  }
  return branding
}

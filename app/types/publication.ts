/** Whether the public may see the site. `maintenance` is the safe default: anything unknown or unreadable means maintenance. */
export const publicationModes = ['maintenance', 'published'] as const
export type PublicationMode = (typeof publicationModes)[number]

/** The `site_settings` row that holds the mode. */
export const publicationSettingKey = 'site.publication'

/** What an admin sees on the publication panel: the mode and who last changed it (both stamped by the database). */
export interface PublicationRecord {
  mode: PublicationMode
  /** False while no row exists, i.e. the site has never been published. */
  configured: boolean
  updatedAt: string | null
  updatedByName: string | null
}

/** One server-side decision per request: what the visitor may see, and whether this request carries a valid admin preview. */
export interface SiteAccess {
  mode: PublicationMode
  /** True only when a valid preview session was verified by the database for this request. */
  preview: boolean
}

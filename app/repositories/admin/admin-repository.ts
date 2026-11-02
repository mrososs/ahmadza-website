import type {
  AdminCategory,
  AdminContentFilter,
  AdminContentRecord,
  AdminContentSummary,
  AdminProfile,
  AdminSource,
  AdminStats,
  ContentDraft,
} from '~/types/admin'
import type { BrandingImage, BrandingSlot, PreparedBrandingImage, SiteBranding } from '~/types/branding'
import type { MediaKind } from '~/utils/media-upload'

export type CategoryInput = Pick<AdminCategory, 'slug' | 'name' | 'description' | 'sortOrder' | 'active'>

/** Raised for failures whose message is already safe and readable to show an editor. */
export class AdminError extends Error {
  override readonly name = 'AdminError'
}

export interface AdminAuth {
  readonly source: AdminSource
  /** Returns the signed-in active admin, or null. Never throws for "not signed in". */
  restore(): Promise<AdminProfile | null>
  signIn(email: string, password: string): Promise<AdminProfile>
  signOut(): Promise<void>
  /** Always resolves for well-formed addresses so the form cannot reveal which emails have accounts. */
  requestPasswordReset(email: string, redirectTo: string): Promise<void>
  /** Exchanges the one-time recovery code for a session. Resolves true when a session is available. */
  completeRecovery(code: string | null): Promise<boolean>
  /** Sets a new password for the current session and returns the (still active) admin profile. */
  updatePassword(password: string): Promise<AdminProfile>
}

export interface AdminRepository {
  readonly source: AdminSource
  stats(): Promise<AdminStats>
  listContent(filter?: AdminContentFilter): Promise<AdminContentSummary[]>
  getContent(id: string): Promise<AdminContentRecord | null>
  saveContent(draft: ContentDraft, id?: string): Promise<string>
  deleteContent(id: string): Promise<void>
  /** Stores a validated file in public storage and returns its public URL. `onProgress` receives 0–100. Rejects with an editor-readable AdminError. */
  uploadMedia(kind: MediaKind, file: File, onProgress?: (percent: number) => void): Promise<string>
  listCategories(): Promise<AdminCategory[]>
  saveCategory(input: CategoryInput, id?: string): Promise<void>
  /** The header logo and hero image as stored; the bundled artwork where no override exists. */
  getSiteBranding(): Promise<SiteBranding>
  /**
   * Owners only. Uploads the image to the branding bucket, then points the slot's setting at it. If the setting cannot be
   * saved the new file is removed and the current image stays live. `onProgress` receives 0–100.
   */
  saveBrandingImage(slot: BrandingSlot, image: PreparedBrandingImage, onProgress?: (percent: number) => void): Promise<BrandingImage>
  /** Owners only. Removes the override so the slot shows the bundled image again, and returns that image. Uploaded files are kept. */
  resetBrandingImage(slot: BrandingSlot): Promise<BrandingImage>
}

export interface AdminBackend {
  auth: AdminAuth
  repository: AdminRepository
}

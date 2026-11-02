const storagePublicPath = '/storage/v1/object/public/'

/**
 * The link behind the "تنزيل PDF" button. The HTML `download` attribute is ignored on cross-origin links, so a file in
 * Supabase Storage is asked to arrive as an attachment (`?download=<name>` makes Storage send Content-Disposition).
 * The name comes from the slug, which is always plain ASCII. Any other URL is used as given.
 */
export function bookDownloadUrl(pdfUrl: string, slug: string): string {
  if (!pdfUrl.includes(storagePublicPath)) return pdfUrl
  try {
    const url = new URL(pdfUrl)
    url.searchParams.set('download', `${slug}.pdf`)
    return url.toString()
  }
  catch {
    return pdfUrl
  }
}

import type { SiteBrandingResult } from '~/types/branding'
import { defaultSiteBranding } from '~/utils/branding'

export default defineEventHandler(async (event): Promise<SiteBrandingResult> => {
  // Read per request and never cached downstream, so an owner's change shows on the next page load.
  setHeader(event, 'cache-control', 'no-store')
  try {
    return await getContentRepository().getBranding()
  }
  catch (cause) {
    // A branding failure must not take the whole site down: serve the bundled artwork and say so in the log.
    console.error('[branding] could not load site branding; serving the bundled images', cause)
    return { branding: defaultSiteBranding(), source: 'fallback' }
  }
})

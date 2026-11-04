// Runs for every render so the decision is in the payload before any component asks. While an admin previews an unpublished
// site the page must also say "do not index" in its own markup, not only in the response header.
export default defineNuxtPlugin({
  name: 'site-access',
  setup() {
    const access = useSiteAccess()
    if (access.value.mode === 'maintenance' && access.value.preview) useSeoMeta({ robots: 'noindex, nofollow, noarchive' })
  },
})

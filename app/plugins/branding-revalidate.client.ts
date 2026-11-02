// Pages prerendered at build time (e.g. /about) carry the branding from build time. Refresh it once the app is
// running so an owner's later change appears there without a redeploy. Server-rendered pages are already current.
export default defineNuxtPlugin({
  name: 'branding-revalidate',
  setup(nuxtApp) {
    if (!nuxtApp.payload.prerenderedAt) return
    onNuxtReady(() => { void refreshNuxtData('site-branding') })
  },
})

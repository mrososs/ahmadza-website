import type { ComponentPublicInstance } from 'vue'
import type { BrandingSlot, SiteBrandingResult } from '~/types/branding'
import { defaultSiteBranding } from '~/utils/branding'

// One shared handler, so every caller of the same key passes identical options.
const fetchBranding = () => $fetch<SiteBrandingResult>('/api/branding')

/**
 * The owner-managed header logo and hero image. One request feeds the header, footer, hero and admin bar:
 * Nuxt shares `useAsyncData` results by key, so only the first caller fetches and the value rides the SSR payload.
 */
export function useSiteBranding() {
  const asyncData = useAsyncData('site-branding', fetchBranding)
  const { data, error, status, refresh } = asyncData
  const branding = computed(() => data.value?.branding ?? defaultSiteBranding())
  // Lets a layout wait for the data during SSR so the first paint already has the right images.
  const ready = asyncData.then(() => undefined)
  return { branding, error, status, refresh, ready }
}

/**
 * One slot's image plus a safety net: if the saved image cannot be loaded (file removed, storage outage) the bundled
 * artwork is shown instead of a broken-image icon. Bind `bind` as the `<img>` ref and `onError` as its error handler.
 */
export function useBrandingImage(slot: BrandingSlot) {
  const { branding } = useSiteBranding()
  const failed = shallowRef(false)
  const image = computed(() => failed.value ? defaultSiteBranding()[slot] : branding.value[slot])
  let element: HTMLImageElement | null = null

  // A new saved image deserves a fresh attempt.
  watch(() => branding.value[slot].url, () => { failed.value = false })
  // The error event can fire before hydration attaches the handler, so check images that already failed.
  onMounted(() => {
    if (element?.complete && element.naturalWidth === 0) failed.value = true
  })

  return {
    image,
    bind: (target: Element | ComponentPublicInstance | null) => { element = target instanceof HTMLImageElement ? target : null },
    onError: () => { failed.value = true },
  }
}

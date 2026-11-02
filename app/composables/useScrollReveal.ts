/**
 * Fades and lifts `[data-reveal]` sections into place as they scroll into view.
 * Content stays fully visible without JavaScript and under `prefers-reduced-motion`: only elements below the fold
 * are hidden (after mount, so server HTML is never hidden), and each is revealed once.
 */
export function useScrollReveal() {
  const route = useRoute()
  let observer: IntersectionObserver | undefined

  function scan() {
    observer?.disconnect()
    if (!window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return

    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('reveal-in')
        observer?.unobserve(entry.target)
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 })

    for (const element of document.querySelectorAll<HTMLElement>('[data-reveal]:not(.reveal-in)')) {
      if (element.getBoundingClientRect().top < window.innerHeight * 0.92) continue
      element.classList.add('reveal-pending')
      observer.observe(element)
    }
  }

  // Wait for hydration: Vue may re-render the sections while it hydrates, which would drop the classes added here.
  onNuxtReady(scan)
  watch(() => route.path, () => nextTick(scan))
  onBeforeUnmount(() => observer?.disconnect())
}

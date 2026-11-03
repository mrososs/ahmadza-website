interface PageSeoOptions {
  title: MaybeRefOrGetter<string>
  description: MaybeRefOrGetter<string>
  path: MaybeRefOrGetter<string>
  type?: 'website' | 'article' | 'book'
  /** Preview picture for link sharing: an absolute URL or a site-relative path. Omitted when the page has no real image. */
  image?: MaybeRefOrGetter<string | undefined>
}

export function usePageSeo(options: PageSeoOptions) {
  const config = useRuntimeConfig()
  const siteUrl = computed(() => config.public.siteUrl.replace(/\/$/, ''))
  const canonical = computed(() => `${siteUrl.value}${toValue(options.path)}`)

  const absolute = (value: string | undefined) => value ? new URL(value, `${siteUrl.value}/`).toString() : undefined

  useSeoMeta({
    title: () => `${toValue(options.title)} | ${config.public.siteName}`,
    description: () => toValue(options.description),
    ogTitle: () => toValue(options.title),
    ogDescription: () => toValue(options.description),
    ogType: options.type === 'article' ? 'article' : 'website',
    ogLocale: 'ar_AR',
    ogUrl: () => canonical.value,
    ogImage: () => absolute(toValue(options.image)),
    twitterImage: () => absolute(toValue(options.image)),
    twitterCard: () => toValue(options.image) ? 'summary_large_image' : 'summary',
  })

  useHead({ link: [{ rel: 'canonical', href: canonical }] })
  return { canonical, absolute }
}

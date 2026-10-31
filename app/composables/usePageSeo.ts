interface PageSeoOptions {
  title: MaybeRefOrGetter<string>
  description: MaybeRefOrGetter<string>
  path: MaybeRefOrGetter<string>
  type?: 'website' | 'article' | 'book'
}

export function usePageSeo(options: PageSeoOptions) {
  const config = useRuntimeConfig()
  const siteUrl = computed(() => config.public.siteUrl.replace(/\/$/, ''))
  const canonical = computed(() => `${siteUrl.value}${toValue(options.path)}`)

  useSeoMeta({
    title: () => `${toValue(options.title)} | ${config.public.siteName}`,
    description: () => toValue(options.description),
    ogTitle: () => toValue(options.title),
    ogDescription: () => toValue(options.description),
    ogType: options.type === 'article' ? 'article' : 'website',
    ogLocale: 'ar_AR',
    ogUrl: () => canonical.value,
    twitterCard: 'summary_large_image',
  })

  useHead({ link: [{ rel: 'canonical', href: canonical }] })
  return { canonical }
}

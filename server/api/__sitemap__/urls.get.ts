import { contentTypeRoutes } from '~/types/content'

export default defineEventHandler(async () => {
  const { items } = await getContentRepository().list({ limit: 50 })
  const staticRoutes = ['/', '/articles', '/books', '/sermons', '/audio', '/benefits', '/videos', '/search']
  return [
    ...staticRoutes.map(loc => ({ loc, changefreq: 'weekly' as const, priority: loc === '/' ? 1 : 0.7 })),
    ...items
      .map(item => ({ loc: `${contentTypeRoutes[item.type]}/${item.slug}`, lastmod: item.updatedAt })),
  ]
})

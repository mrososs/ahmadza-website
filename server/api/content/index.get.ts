import { contentTypes, type ContentQuery, type ContentType } from '~/types/content'

const isContentType = (value: unknown): value is ContentType => typeof value === 'string' && contentTypes.includes(value as ContentType)

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const repository = getContentRepository(event)
  const options: ContentQuery = {
    ...(isContentType(query.type) ? { type: query.type } : {}),
    ...(typeof query.q === 'string' && query.q.trim() ? { query: query.q.trim() } : {}),
    ...(typeof query.category === 'string' && query.category ? { category: query.category } : {}),
    ...(query.featured === 'true' ? { featured: true } : {}),
    ...(typeof query.limit === 'string' ? { limit: Number.parseInt(query.limit, 10) || 12 } : {}),
    ...(typeof query.page === 'string' ? { page: Number.parseInt(query.page, 10) || 1 } : {}),
  }

  try {
    const result = await repository.list(options)
    return { ...result, items: result.items.map(withoutRichBody) }
  }
  catch (cause) {
    console.error('Content repository list failure', cause)
    throw createError({ statusCode: 503, statusMessage: 'تعذر تحميل المحتوى الآن' })
  }
})

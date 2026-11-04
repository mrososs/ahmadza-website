import { contentTypes, type ContentType } from '~/types/content'

export default defineEventHandler(async (event) => {
  const type = getRouterParam(event, 'type')
  const slug = getRouterParam(event, 'slug')
  if (!type || !contentTypes.includes(type as ContentType) || !slug) {
    throw createError({ statusCode: 400, statusMessage: 'مسار المحتوى غير صالح' })
  }

  try {
    const result = await getContentRepository(event).getBySlug(type as ContentType, slug)
    if (!result) throw createError({ statusCode: 404, statusMessage: 'المحتوى غير موجود' })
    return { ...result, item: await withSafeBody(result.item), related: result.related.map(withoutRichBody) }
  }
  catch (cause) {
    if (isError(cause) && cause.statusCode === 404) throw cause
    console.error('Content repository detail failure', cause)
    throw createError({ statusCode: 503, statusMessage: 'تعذر تحميل المحتوى الآن' })
  }
})

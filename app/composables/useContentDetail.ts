import type { ContentDetailResult, ContentType } from '~/types/content'

export async function useContentDetail(type: ContentType) {
  const route = useRoute()
  const slug = computed(() => String(route.params.slug || ''))
  const { data, error } = await useAsyncData(
    `content-${type}-${slug.value}`,
    () => $fetch<ContentDetailResult>(`/api/content/${type}/${slug.value}`),
  )

  if (error.value || !data.value) {
    throw createError({ statusCode: error.value?.statusCode ?? 404, statusMessage: 'المحتوى غير موجود' })
  }

  return { result: data }
}

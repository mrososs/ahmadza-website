<script setup lang="ts">
import type { ContentListResult, ContentType } from '~/types/content'

const { type, title, description } = defineProps<{ type: ContentType; title: string; description: string }>()
const route = useRoute()
const queryInput = shallowRef(typeof route.query.q === 'string' ? route.query.q : '')

const requestQuery = computed(() => ({
  type,
  q: typeof route.query.q === 'string' ? route.query.q : undefined,
  category: typeof route.query.category === 'string' ? route.query.category : undefined,
  page: typeof route.query.page === 'string' ? route.query.page : '1',
  limit: '12',
}))

const { data, status, error } = await useAsyncData(
  () => `directory-${type}-${JSON.stringify(requestQuery.value)}`,
  () => $fetch<ContentListResult>('/api/content', { query: requestQuery.value }),
  { watch: [requestQuery] },
)
const { data: categoryData } = await useAsyncData(
  `categories-${type}`,
  () => $fetch<ContentListResult>('/api/content', { query: { type, limit: 50 } }),
)

const categories = computed(() => {
  const map = new Map<string, string>()
  for (const item of categoryData.value?.items || []) {
    for (const category of item.categories) map.set(category.slug, category.name)
  }
  return [...map].map(([slug, name]) => ({ slug, name }))
})
const hasFilters = computed(() => Boolean(route.query.q || route.query.category))
const totalPages = computed(() => Math.max(1, Math.ceil((data.value?.total || 0) / (data.value?.pageSize || 12))))

function updateQuery(changes: Record<string, string | undefined>) {
  return navigateTo({ path: route.path, query: { ...route.query, ...changes } })
}

function submitSearch() {
  updateQuery({ q: queryInput.value.trim() || undefined, page: undefined })
}

function changeCategory(category?: string) {
  updateQuery({ category, page: undefined })
}

usePageSeo({ title, description, path: route.path })
</script>

<template>
  <InnerPage :title="title">
    <p class="sr-only">{{ description }}</p>
    <form class="ref-search" role="search" @submit.prevent="submitSearch">
      <label class="sr-only" for="directory-search">كلمة البحث</label>
      <input id="directory-search" v-model="queryInput" name="q" type="search" placeholder="كلمة البحث">
    </form>
    <div v-if="categories.length" class="category-filter" role="group" aria-label="التصنيفات">
      <button type="button" :aria-pressed="!route.query.category" @click="changeCategory()">الكل</button>
      <button
        v-for="category in categories"
        :key="category.slug"
        type="button"
        :aria-pressed="route.query.category === category.slug"
        @click="changeCategory(category.slug)"
      >
        {{ category.name }}
      </button>
    </div>

    <div aria-live="polite" :aria-busy="status === 'pending'">
      <div v-if="status === 'pending'" class="loading-state" role="status">جارٍ ترتيب الرفوف…</div>
      <div v-else-if="error" class="error-state" role="alert">
        <h2>تعذر تحميل المواد</h2>
        <p>أعد المحاولة بعد قليل.</p>
      </div>
      <EmptyState
        v-else-if="!data?.items.length"
        :title="hasFilters ? undefined : 'لا توجد مواد منشورة حاليًا'"
        :description="hasFilters ? undefined : 'سيظهر المحتوى هنا فور نشره.'"
      />
      <ContentCardGrid v-else :items="data.items" :eager-count="3" />
    </div>
    <ContentPagination
      v-if="data"
      :page="data.page"
      :total-pages="totalPages"
      @change="updateQuery({ page: String($event) })"
    />
  </InnerPage>
</template>

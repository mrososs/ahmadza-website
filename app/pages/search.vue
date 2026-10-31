<script setup lang="ts">
import { Search } from '@lucide/vue'
import { contentTypes, contentTypeLabels, type ContentListResult, type ContentType } from '~/types/content'

const route = useRoute()
const query = shallowRef(typeof route.query.q === 'string' ? route.query.q : '')
const selectedType = computed(() => contentTypes.includes(route.query.type as ContentType) ? route.query.type as ContentType : undefined)
const request = computed(() => ({ q: typeof route.query.q === 'string' ? route.query.q : '', type: selectedType.value, limit: 50 }))
const { data, status, error } = await useAsyncData(
  () => `search-${request.value.q}-${request.value.type || 'all'}`,
  () => $fetch<ContentListResult>('/api/content', { query: request.value }),
  { watch: [request] },
)

function submit(value: string) {
  query.value = value
  navigateTo({ path: '/search', query: { ...(value.trim() ? { q: value.trim() } : {}), ...(selectedType.value ? { type: selectedType.value } : {}) } })
}

function setType(type?: ContentType) {
  navigateTo({ path: '/search', query: { ...route.query, type } })
}

usePageSeo({ title: 'البحث في المكتبة', description: 'بحث موحد في المقالات والكتب والخطب والصوتيات والفوائد والمرئيات.', path: '/search' })
</script>

<template>
  <div>
    <header class="search-hero">
      <div class="site-container">
        <Search :size="30" aria-hidden="true" />
        <h1>ابحث في المكتبة كلّها</h1>
        <p>نتيجة واحدة تجمع المواد المكتوبة والمسموعة والمرئية، مع توضيح نوع كل مادة.</p>
        <ContentSearch v-model="query" placeholder="مثال: القراءة، المعرفة، المجتمع" @submit="submit" />
      </div>
    </header>
    <section class="site-container search-results">
      <div class="category-filter search-results__types" aria-label="نوع المحتوى">
        <button type="button" :aria-pressed="!selectedType" @click="setType()">كل الأنواع</button>
        <button v-for="type in contentTypes" :key="type" type="button" :aria-pressed="selectedType === type" @click="setType(type)">{{ contentTypeLabels[type] }}</button>
      </div>
      <div class="search-results__summary">
        <h2 v-if="route.query.q">نتائج البحث عن «{{ route.query.q }}»</h2>
        <h2 v-else>كل مواد المكتبة</h2>
        <span v-if="data">{{ data.total }} نتيجة</span>
      </div>
      <div v-if="status === 'pending'" class="loading-state" role="status">جارٍ البحث…</div>
      <div v-else-if="error" class="error-state" role="alert">تعذر إتمام البحث الآن.</div>
      <EmptyState v-else-if="!data?.items.length" title="لا توجد نتائج بهذه العبارة" />
      <div v-else class="search-results__list" data-testid="search-results">
        <ContentCard v-for="item in data.items" :key="item.id" :item="item" />
      </div>
    </section>
  </div>
</template>

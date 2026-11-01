<script setup lang="ts">
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
  <InnerPage title="البحث في المكتبة">
    <ContentSearch v-model="query" placeholder="كلمة البحث" @submit="submit" />
    <div class="category-filter search-results__types" role="group" aria-label="نوع المحتوى">
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
    <ul v-else class="ref-list" data-testid="search-results">
      <li v-for="item in data.items" :key="item.id">
        <NuxtLink :to="contentPath(item)">{{ item.title }}</NuxtLink>
        <small>{{ contentTypeLabels[item.type] }}</small>
      </li>
    </ul>
  </InnerPage>
</template>

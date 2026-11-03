<script setup lang="ts">
import type { ContentListResult } from '~/types/content'

const route = useRoute()
const query = shallowRef(typeof route.query.q === 'string' ? route.query.q : '')
const { data } = await useAsyncData('videos-directory', () => $fetch<ContentListResult>('/api/content', { query: { type: 'video', limit: 30 } }))
const visible = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase('ar')
  return (data.value?.items || []).filter(item => !needle || `${item.title} ${item.excerpt}`.toLocaleLowerCase('ar').includes(needle))
})

usePageSeo({ title: 'المرئيات', description: 'دليل المقاطع والمحاضرات المصورة، يوتيوب أو مرفوعة مباشرة، مع تشغيل آمن داخل الموقع.', path: '/videos' })
</script>

<template>
  <InnerPage title="المرئيات">
    <p class="inner-card__note">دليل المقاطع والمحاضرات المصورة. افتح أي مقطع لمشاهدته داخل الموقع.</p>
    <form class="ref-search" role="search" @submit.prevent>
      <label class="sr-only" for="videos-search">كلمة البحث</label>
      <input id="videos-search" v-model="query" type="search" placeholder="كلمة البحث">
    </form>
    <EmptyState v-if="!visible.length" :title="query.trim() ? undefined : 'لا توجد مواد منشورة حاليًا'" :description="query.trim() ? undefined : 'ستظهر المرئيات هنا فور نشرها.'" />
    <ContentCardGrid v-else :items="visible" :eager-count="3" />
  </InnerPage>
</template>

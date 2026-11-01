<script setup lang="ts">
import type { ContentListResult } from '~/types/content'
import { formatDuration } from '~/utils/format'

const route = useRoute()
const query = shallowRef(typeof route.query.q === 'string' ? route.query.q : '')
const { data } = await useAsyncData('videos-directory', () => $fetch<ContentListResult>('/api/content', { query: { type: 'video', limit: 30 } }))
const visible = computed(() => {
  const needle = query.value.trim().toLocaleLowerCase('ar')
  return (data.value?.items || []).filter(item => !needle || `${item.title} ${item.excerpt}`.toLocaleLowerCase('ar').includes(needle))
})

usePageSeo({ title: 'المرئيات', description: 'دليل المقاطع والمحاضرات المصورة، مع تضمين آمن حين يتوفر رابط موثوق.', path: '/videos' })
</script>

<template>
  <InnerPage title="المرئيات">
    <p class="inner-card__note">دليل المقاطع والمحاضرات المصورة. لا نضمّن أي فيديو قبل التحقق من رابطه ومصدره.</p>
    <form class="ref-search" role="search" @submit.prevent>
      <label class="sr-only" for="videos-search">كلمة البحث</label>
      <input id="videos-search" v-model="query" type="search" placeholder="كلمة البحث">
    </form>
    <EmptyState v-if="!visible.length" />
    <ul v-else class="ref-list ref-list--detailed">
      <li v-for="video in visible" :key="video.id">
        <h2>{{ video.title }}</h2>
        <p>{{ video.excerpt }}</p>
        <MediaAvailability v-if="video.type === 'video' && video.youtubeId" :item="video" />
        <small v-else>الرابط قيد التزويد — بطاقة تجريبية{{ video.type === 'video' && video.durationSeconds ? ` · ${formatDuration(video.durationSeconds)}` : '' }}.</small>
      </li>
    </ul>
  </InnerPage>
</template>

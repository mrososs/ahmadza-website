<script setup lang="ts">
import type { ContentListResult } from '~/types/content'
import { formatArabicDate } from '~/utils/format'

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
    <ul v-else class="video-grid">
      <li v-for="video in visible" :key="video.id">
        <MediaAvailability v-if="video.type === 'video' && video.youtubeId" :item="video" />
        <VideoPlaceholder v-else :duration="video.type === 'video' ? video.durationSeconds : undefined" />
        <h2>{{ video.title }}</h2>
        <p class="video-grid__meta">
          <span v-if="video.categories[0]">{{ video.categories[0].name }}</span>
          <time :datetime="video.publishedAt">{{ formatArabicDate(video.publishedAt) }}</time>
        </p>
        <p>{{ video.excerpt }}</p>
        <small v-if="!(video.type === 'video' && video.youtubeId)">الرابط قيد التزويد — بطاقة تجريبية.</small>
      </li>
    </ul>
  </InnerPage>
</template>

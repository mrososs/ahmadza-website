<script setup lang="ts">
import { Play } from '@lucide/vue'
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
  <div>
    <PageIntro title="المرئيات" description="دليل المقاطع والمحاضرات المصورة. لا نضمّن أي فيديو قبل التحقق من رابطه ومصدره." :count="data?.total" />
    <section class="site-container directory-tools"><ContentSearch v-model="query" /></section>
    <section class="site-container video-directory">
      <EmptyState v-if="!visible.length" />
      <article v-for="video in visible" v-else :key="video.id" class="video-directory__item">
        <div class="video-directory__poster">
          <Play :size="40" aria-hidden="true" />
          <span v-if="video.type === 'video' && video.youtubeId">مشاهدة</span>
          <span v-else>الرابط قيد التزويد</span>
        </div>
        <div>
          <div class="content-card__meta"><span>{{ video.categories[0]?.name }}</span><span>{{ video.type === 'video' ? formatDuration(video.durationSeconds) : '' }}</span></div>
          <h2>{{ video.title }}</h2>
          <p>{{ video.excerpt }}</p>
          <MediaAvailability v-if="video.type === 'video' && video.youtubeId" :item="video" />
          <p v-else class="video-directory__notice">هذه بطاقة تجريبية؛ لم نعرض مشغلًا أو صورة مصغرة مزيفة.</p>
        </div>
      </article>
    </section>
  </div>
</template>

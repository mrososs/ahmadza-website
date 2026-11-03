<script setup lang="ts">
import type { ContentItem } from '~/types/content'
import { toContentCard } from '~/utils/content-card'
import { formatDuration } from '~/utils/format'

defineProps<{ videos: ContentItem[] }>()
const isDemo = useIsDemoContent()
</script>

<template>
  <section v-if="videos.length" class="youtube-band" aria-labelledby="youtube-title" data-reveal>
    <div class="ref-container">
      <h2 id="youtube-title">أحدث فيديوهات قناة اليوتيوب</h2>
      <ul class="youtube-band__grid">
        <li v-for="video in videos" :key="video.id">
          <NuxtLink :to="contentPath(video)" class="youtube-band__card">
            <ContentCover :image="toContentCard(video).image" type="video" />
            <strong>{{ video.title }}</strong>
            <small v-if="video.type === 'video' && video.durationSeconds">{{ formatDuration(video.durationSeconds) }}</small>
            <small v-if="isDemo">محتوى تجريبي</small>
          </NuxtLink>
        </li>
      </ul>
      <NuxtLink class="ref-more ref-more--light" to="/videos">دليل المرئيات</NuxtLink>
    </div>
  </section>
</template>

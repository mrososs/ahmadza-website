<script setup lang="ts">
import { ArrowLeft, BookOpen, Headphones, Play, ScrollText, type LucideIcon } from '@lucide/vue'
import { contentTypeLabels, contentTypeRoutes, type ContentItem } from '~/types/content'
import { formatArabicDate, formatDuration } from '~/utils/format'

const { item, prominent = false } = defineProps<{ item: ContentItem; prominent?: boolean }>()

const route = computed(() => `${contentTypeRoutes[item.type]}${item.type === 'video' ? '' : `/${item.slug}`}`)
const iconMap: Record<ContentItem['type'], LucideIcon> = {
  article: ArrowLeft,
  book: BookOpen,
  sermon: ScrollText,
  audio: Headphones,
  video: Play,
  benefit: ArrowLeft,
}
const icon = computed(() => iconMap[item.type])
const meta = computed(() => item.type === 'audio' || item.type === 'video' ? formatDuration(item.durationSeconds) : formatArabicDate(item.publishedAt))
</script>

<template>
  <article class="content-card" :class="{ 'content-card--prominent': prominent, [`content-card--${item.type}`]: true }">
    <div v-if="item.type === 'book'" class="book-spine" aria-hidden="true">
      <span>{{ item.title }}</span>
      <small>نسخة تجريبية</small>
    </div>
    <div v-else-if="item.type === 'video'" class="video-poster" aria-hidden="true">
      <span class="video-poster__lines" />
      <Play :size="34" />
    </div>
    <div class="content-card__body">
      <div class="content-card__meta">
        <span><component :is="icon" :size="15" aria-hidden="true" /> {{ contentTypeLabels[item.type] }}</span>
        <time :datetime="item.publishedAt">{{ meta }}</time>
      </div>
      <h2><NuxtLink :to="route">{{ item.title }}</NuxtLink></h2>
      <p>{{ item.excerpt }}</p>
      <div class="content-card__footer">
        <span>{{ item.categories[0]?.name }}</span>
        <NuxtLink :to="route" :aria-label="`افتح: ${item.title}`">{{ item.type === 'video' ? 'اعرض الدليل' : 'اقرأ المزيد' }} <ArrowLeft :size="16" aria-hidden="true" /></NuxtLink>
      </div>
    </div>
  </article>
</template>

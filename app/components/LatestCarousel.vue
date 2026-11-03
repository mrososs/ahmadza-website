<script setup lang="ts">
import { ChevronLeft, ChevronRight } from '@lucide/vue'
import type { ContentItem } from '~/types/content'
import { toContentCard } from '~/utils/content-card'

const { items } = defineProps<{ items: ContentItem[] }>()
const track = useTemplateRef<HTMLUListElement>('track')

// In RTL, scrollLeft runs negative: "next" scrolls toward the left edge.
function step(direction: 1 | -1) {
  const el = track.value
  if (!el) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  el.scrollBy({ left: -direction * el.clientWidth * 0.9, behavior: reduce ? 'auto' : 'smooth' })
}
</script>

<template>
  <div class="latest-carousel">
    <div class="latest-carousel__controls">
      <button type="button" class="ref-arrow" aria-label="السابق" @click="step(-1)"><ChevronRight :size="18" aria-hidden="true" /></button>
      <button type="button" class="ref-arrow" aria-label="التالي" @click="step(1)"><ChevronLeft :size="18" aria-hidden="true" /></button>
    </div>
    <ul ref="track" class="latest-carousel__track" tabindex="0" aria-label="أحدث المنشورات">
      <li v-for="(item, index) in items" :key="item.id">
        <ContentCard :card="toContentCard(item)" :eager="index < 3" />
      </li>
    </ul>
  </div>
</template>

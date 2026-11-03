<script setup lang="ts">
import type { ContentItem } from '~/types/content'
import { toContentCard } from '~/utils/content-card'

// The first row is likely above the fold, so its pictures load eagerly; everything after it is lazy.
const { items, eagerCount = 0 } = defineProps<{ items: ContentItem[]; eagerCount?: number }>()
const cards = computed(() => items.map(toContentCard))
</script>

<template>
  <ul class="content-grid">
    <li v-for="(card, index) in cards" :key="card.id">
      <ContentCard :card="card" :eager="index < eagerCount" />
    </li>
  </ul>
</template>

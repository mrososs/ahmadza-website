<script setup lang="ts">
import { ArrowLeft } from '@lucide/vue'
import type { ContentCardModel } from '~/utils/content-card'
import { formatArabicDate } from '~/utils/format'

const { card, eager = false } = defineProps<{ card: ContentCardModel; eager?: boolean }>()
</script>

<template>
  <article class="content-card" :class="`content-card--${card.type}`">
    <ContentCover :image="card.image" :type="card.type" :eager="eager" />
    <div class="content-card__body">
      <p class="content-card__kicker">
        <span class="content-card__type">{{ card.typeLabel }}</span>
        <time :datetime="card.publishedAt">{{ formatArabicDate(card.publishedAt) }}</time>
      </p>
      <h3 class="content-card__title">
        <!-- The link stretches over the whole card (see ::after), so the card has one tab stop and one accessible name. -->
        <NuxtLink :to="card.href" class="content-card__link">{{ card.title }}</NuxtLink>
      </h3>
      <p v-if="card.description" class="content-card__text">{{ card.description }}</p>
      <ul v-if="card.meta.length" class="content-card__meta" aria-label="تفاصيل">
        <li v-for="entry in card.meta" :key="entry">{{ entry }}</li>
      </ul>
      <span class="content-card__action" aria-hidden="true">{{ card.actionLabel }} <ArrowLeft :size="16" /></span>
    </div>
  </article>
</template>

<script setup lang="ts">
import type { ContentItem } from '~/types/content'

const { home = false } = defineProps<{ home?: boolean; items: ContentItem[] }>()
const authorDisplayName = useRuntimeConfig().public.authorDisplayName
</script>

<template>
  <div class="site-masthead">
    <section class="library-masthead" aria-label="هوية الموقع">
      <div class="library-masthead__pattern" aria-hidden="true" />
      <div class="site-container library-masthead__inner">
        <div class="library-masthead__name">
          <component :is="home ? 'h1' : 'div'" :class="{ 'library-masthead__heading': !home }">
            <img src="/ornaments/ahmad-zayed-logo-client.png" :alt="authorDisplayName" width="1448" height="1086" fetchpriority="high">
          </component>
        </div>
      </div>
    </section>
    <LatestTicker :items="items" />
  </div>
</template>

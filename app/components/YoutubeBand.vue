<script setup lang="ts">
import { Play } from '@lucide/vue'
import type { ContentItem } from '~/types/content'

defineProps<{ videos: ContentItem[] }>()
</script>

<template>
  <section class="youtube-band" aria-labelledby="youtube-title">
    <div class="ref-container">
      <h2 id="youtube-title">أحدث فيديوهات قناة اليوتيوب</h2>
      <ul class="youtube-band__grid">
        <li v-for="video in videos" :key="video.id">
          <NuxtLink to="/videos" class="youtube-band__card">
            <span class="youtube-band__poster"><Play :size="34" aria-hidden="true" /><small>لا يوجد رابط موثوق — محتوى تجريبي</small></span>
            <strong>{{ video.title }}</strong>
          </NuxtLink>
        </li>
      </ul>
      <NuxtLink class="ref-more ref-more--light" to="/videos">دليل المرئيات</NuxtLink>
    </div>
  </section>
</template>

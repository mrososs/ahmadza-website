<script setup lang="ts">
import { Play } from '@lucide/vue'
import { formatDuration } from '~/utils/format'

// Decorative poster for a video that has no trusted link yet. It is deliberately labelled as a preview
// so it never suggests a playable file exists; the surrounding card carries the accessible status text.
defineProps<{ duration?: number | undefined }>()
const isDemo = useIsDemoContent()
</script>

<template>
  <div class="video-placeholder" aria-hidden="true">
    <span class="video-placeholder__tag">{{ isDemo ? "معاينة تجريبية" : "الفيديو غير متاح بعد" }}</span>
    <span class="video-placeholder__play"><Play :size="30" /></span>
    <span v-if="duration" class="video-placeholder__time">{{ formatDuration(duration) }}</span>
  </div>
</template>

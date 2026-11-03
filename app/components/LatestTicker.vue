<script setup lang="ts">
import { Pause, Play } from '@lucide/vue'
import type { ContentItem } from '~/types/content'

const { items } = defineProps<{ items: ContentItem[] }>()

// The reference marquee travels at ~85px/s; derive the loop duration from the measured set width.
// Items repeat within a set so one set always exceeds the viewport and the loop never shows a gap.
const loopItems = computed(() => [...items, ...items])
const PIXELS_PER_SECOND = 85
// Moving content that lasts longer than five seconds needs a way to stop it (WCAG 2.2.2); hover and focus also pause it.
const paused = shallowRef(false)
const firstSet = useTemplateRef<HTMLElement[]>('firstSet')
const duration = shallowRef<string>()
onMounted(() => {
  const width = firstSet.value?.[0]?.offsetWidth
  if (width) duration.value = `${Math.round(width / PIXELS_PER_SECOND)}s`
})
</script>

<template>
  <section v-if="items.length" class="latest-ticker" aria-label="أحدث المواد">
    <button type="button" class="latest-ticker__toggle" :aria-pressed="paused" :aria-label="paused ? 'تشغيل شريط أحدث المواد' : 'إيقاف شريط أحدث المواد مؤقتًا'" @click="paused = !paused">
      <Play v-if="paused" :size="18" aria-hidden="true" />
      <Pause v-else :size="18" aria-hidden="true" />
    </button>
    <div class="latest-ticker__viewport">
      <div class="latest-ticker__track" :class="{ 'latest-ticker__track--paused': paused }" :style="{ animationDuration: duration }">
        <div v-for="copy in 2" :key="copy" :ref="copy === 1 ? 'firstSet' : undefined" class="latest-ticker__set" :aria-hidden="copy === 2 ? 'true' : undefined" :inert="copy === 2">
          <NuxtLink v-for="(item, index) in loopItems" :key="`${copy}-${index}`" :to="contentPath(item)">{{ item.title }}</NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

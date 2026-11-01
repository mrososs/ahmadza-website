<script setup lang="ts">
import type { ContentItem } from '~/types/content'

const { items } = defineProps<{ items: ContentItem[] }>()

// The reference marquee travels at ~85px/s; derive the loop duration from the measured set width.
// Items repeat within a set so one set always exceeds the viewport and the loop never shows a gap.
const loopItems = computed(() => [...items, ...items])
const PIXELS_PER_SECOND = 85
const firstSet = useTemplateRef<HTMLElement[]>('firstSet')
const duration = shallowRef<string>()
onMounted(() => {
  const width = firstSet.value?.[0]?.offsetWidth
  if (width) duration.value = `${Math.round(width / PIXELS_PER_SECOND)}s`
})
</script>

<template>
  <section v-if="items.length" class="latest-ticker" aria-label="أحدث المواد">
    <div class="latest-ticker__viewport">
      <div class="latest-ticker__track" :style="{ animationDuration: duration }">
        <div v-for="copy in 2" :key="copy" :ref="copy === 1 ? 'firstSet' : undefined" class="latest-ticker__set" :aria-hidden="copy === 2 ? 'true' : undefined" :inert="copy === 2">
          <NuxtLink v-for="(item, index) in loopItems" :key="`${copy}-${index}`" :to="contentPath(item)">{{ item.title }}</NuxtLink>
        </div>
      </div>
    </div>
  </section>
</template>

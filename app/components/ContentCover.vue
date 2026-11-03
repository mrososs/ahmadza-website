<script setup lang="ts">
import { BookOpen, Headphones, Lightbulb, Mic, Newspaper, Play } from '@lucide/vue'
import type { Component } from 'vue'
import type { ContentType } from '~/types/content'
import type { ContentCardImage } from '~/utils/content-card'

const { image, type, eager = false } = defineProps<{ image?: ContentCardImage | undefined; type: ContentType; eager?: boolean }>()

const icons: Record<ContentType, Component> = { article: Newspaper, book: BookOpen, video: Play, audio: Headphones, benefit: Lightbulb, sermon: Mic }

// A picture that cannot load (removed file, blocked host) falls back to the local artwork instead of a broken-image icon.
const failed = shallowRef(false)
const element = useTemplateRef<HTMLImageElement>('element')
watch(() => image?.src, () => { failed.value = false })
// The error event can fire before hydration attaches the handler, so images that already failed are checked once mounted.
onMounted(() => {
  if (element.value?.complete && element.value.naturalWidth === 0) failed.value = true
})
const showImage = computed(() => Boolean(image) && !failed.value)
</script>

<template>
  <div class="content-cover" :class="[`content-cover--${type}`, { 'content-cover--empty': !showImage }]">
    <img
      v-if="showImage && image"
      ref="element"
      :src="image.src"
      :alt="image.alt"
      width="640"
      height="400"
      :loading="eager ? 'eager' : 'lazy'"
      decoding="async"
      @error="failed = true"
    >
    <span v-else class="content-cover__fallback" aria-hidden="true">
      <component :is="icons[type]" :size="44" :stroke-width="1.25" />
    </span>
  </div>
</template>

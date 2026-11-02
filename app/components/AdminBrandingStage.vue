<script setup lang="ts">
import type { BrandingSlot } from '~/types/branding'

/** The image on the same ground and at the same proportions it has on the live site, so what the owner sees is what visitors get. */
defineProps<{ area: BrandingSlot; src: string; width: number; height: number; alt: string }>()
</script>

<template>
  <div class="branding-stage" :class="`branding-stage--${area}`">
    <img :src="src" :alt="alt" :width="width" :height="height">
  </div>
</template>

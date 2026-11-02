<script setup lang="ts">
const { compact = false, headerLogo = false } = defineProps<{ compact?: boolean; headerLogo?: boolean }>()
const authorDisplayName = useRuntimeConfig().public.authorDisplayName
const { image, bind, onError } = useBrandingImage('headerLogo')
const artwork = computed(() => headerLogo
  ? { src: image.value.url, width: image.value.width, height: image.value.height, alt: image.value.alt || authorDisplayName }
  : { src: '/ornaments/ahmad-zayed-logo.svg', width: 180, height: 170, alt: authorDisplayName })
</script>

<template>
  <NuxtLink to="/" class="brand-mark" aria-label="الصفحة الرئيسية">
    <img :ref="bind" class="brand-mark__artwork" :src="artwork.src" :alt="artwork.alt" :width="artwork.width" :height="artwork.height" @error="onError">
    <span v-if="!compact" class="brand-mark__copy">
      <strong>مكتبة أحمد الزهراني</strong>
      <small>معرفةٌ تُقرأ على مهل</small>
    </span>
  </NuxtLink>
</template>

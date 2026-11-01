<script setup lang="ts">
const { compact = false, headerLogo = false } = defineProps<{ compact?: boolean; headerLogo?: boolean }>()
const authorDisplayName = useRuntimeConfig().public.authorDisplayName
</script>

<template>
  <NuxtLink to="/" class="brand-mark" aria-label="الصفحة الرئيسية">
    <img class="brand-mark__artwork" :src="headerLogo ? '/ornaments/ahmad-zayed-hero-client.png' : '/ornaments/ahmad-zayed-logo.svg'" :alt="authorDisplayName" :width="headerLogo ? 1448 : 180" :height="headerLogo ? 1086 : 170">
    <span v-if="!compact" class="brand-mark__copy">
      <strong>مكتبة أحمد زايد</strong>
      <small>معرفةٌ تُقرأ على مهل</small>
    </span>
  </NuxtLink>
</template>

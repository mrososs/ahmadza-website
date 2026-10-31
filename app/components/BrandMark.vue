<script setup lang="ts">
const { compact = false } = defineProps<{ compact?: boolean }>()
</script>

<template>
  <NuxtLink to="/" class="brand-mark" aria-label="الصفحة الرئيسية">
    <span class="brand-mark__seal" aria-hidden="true">أ</span>
    <span v-if="!compact" class="brand-mark__copy">
      <strong>مكتبة أحمد زايد</strong>
      <small>معرفةٌ تُقرأ على مهل</small>
    </span>
  </NuxtLink>
</template>

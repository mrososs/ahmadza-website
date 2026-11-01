<script setup lang="ts">
defineProps<{ items: Array<{ label: string; to?: string }> }>()
</script>

<template>
  <nav aria-label="مسار الصفحة" class="breadcrumbs">
    <ol>
      <li><NuxtLink to="/">الرئيسية</NuxtLink></li>
      <li v-for="item in items" :key="item.label">
        <span class="breadcrumbs__sep" aria-hidden="true">/</span>
        <NuxtLink v-if="item.to" :to="item.to">{{ item.label }}</NuxtLink>
        <span v-else aria-current="page">{{ item.label }}</span>
      </li>
    </ol>
  </nav>
</template>

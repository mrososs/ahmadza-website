<script setup lang="ts">
defineProps<{ title: string; description: string; count?: number | undefined }>()
</script>

<template>
  <header class="page-intro">
    <div class="site-container page-intro__grid">
      <h1>{{ title }}</h1>
      <div>
        <p>{{ description }}</p>
        <span v-if="count !== undefined" class="page-intro__count">{{ count }} مادة منشورة</span>
      </div>
    </div>
  </header>
</template>

<script setup lang="ts">
const { title, crumbs } = defineProps<{ title: string; crumbs?: Array<{ label: string; to?: string }> }>()
const trail = computed(() => crumbs ?? [{ label: title }])
</script>

<template>
  <div class="inner-page">
    <div class="ref-container">
      <Breadcrumbs :items="trail" />
      <section class="inner-card" aria-labelledby="inner-title">
        <slot name="eyebrow" />
        <h1 id="inner-title" class="inner-card__title">{{ title }}</h1>
        <slot />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
const route = useRoute()
const { data } = await useLibraryContent()
const items = computed(() => data.value?.items ?? [])
const latest = computed(() => items.value.slice(0, 5))
const videos = computed(() => items.value.filter(item => item.type === 'video').slice(0, 3))
</script>

<template>
  <div class="min-h-screen bg-paper text-ink">
    <a class="skip-link" href="#main-content">انتقل إلى المحتوى</a>
    <AppHeader />
    <SiteMasthead :home="route.path === '/'" :items="latest" />
    <main id="main-content">
      <slot />
    </main>
    <YoutubeBand :videos="videos" />
    <AppFooter />
  </div>
</template>

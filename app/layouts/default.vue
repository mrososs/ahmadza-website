<script setup lang="ts">
const route = useRoute()
useScrollReveal()
// Both requests start together; the branding result is then shared by the header, footer and hero.
const libraryRequest = useLibraryContent()
const [{ data }] = await Promise.all([libraryRequest, useSiteBranding().ready])
const items = computed(() => data.value?.items ?? [])
const latest = computed(() => items.value.slice(0, 5))
</script>

<template>
  <div class="min-h-screen bg-paper text-ink">
    <a class="skip-link" href="#main-content">انتقل إلى المحتوى</a>
    <AppHeader />
    <SiteMasthead :home="route.path === '/'" :items="latest" />
    <main id="main-content">
      <slot />
    </main>
    <AppFooter />
    <PreviewBar />
  </div>
</template>

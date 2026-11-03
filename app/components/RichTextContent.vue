<script setup lang="ts">
// The one place article HTML is rendered. The HTML is always sanitized before it gets here: by the server on every public
// read (server/utils/rich-text.ts) and by the browser sanitizer in the admin preview. Never pass it unsanitized HTML.
defineProps<{ html: string }>()
</script>

<template>
  <div class="article-prose" v-html="html" />
</template>

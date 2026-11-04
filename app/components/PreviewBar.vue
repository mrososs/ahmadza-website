<script setup lang="ts">
import { Eye } from '@lucide/vue'

// Only a request the server verified as an admin preview of an unpublished site gets this bar, so visitors never see it
// (nor a link to the console). It sticks to the bottom edge instead of covering the header or the content.
const access = useSiteAccess()
const visible = computed(() => access.value.mode === 'maintenance' && access.value.preview)
</script>

<template>
  <aside v-if="visible" class="preview-bar" aria-label="معاينة المدير">
    <p class="preview-bar__text"><Eye :size="20" aria-hidden="true" /> معاينة المدير: الموقع غير منشور للزوار بعد.</p>
    <a class="preview-bar__link" href="/admin">العودة إلى لوحة التحكم</a>
  </aside>
</template>

<script setup lang="ts">
import { Library } from '@lucide/vue'

defineProps<{ title?: string | undefined; description?: string | undefined }>()
</script>

<template>
  <div class="empty-state">
    <Library :size="30" aria-hidden="true" />
    <h2>{{ title || 'لم نجد مواد مطابقة' }}</h2>
    <p>{{ description || 'جرّب كلمة أقصر أو أزل أحد المرشحات.' }}</p>
  </div>
</template>

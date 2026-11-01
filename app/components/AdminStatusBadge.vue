<script setup lang="ts">
import { publishStatusLabels } from '~/types/admin'
import type { PublishStatus } from '~/types/content'

defineProps<{ status: PublishStatus }>()
</script>

<template>
  <span class="admin-badge" :class="`admin-badge--${status}`">{{ publishStatusLabels[status] }}</span>
</template>

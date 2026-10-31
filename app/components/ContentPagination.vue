<script setup lang="ts">
defineProps<{ page: number; totalPages: number }>()
const emit = defineEmits<{ change: [page: number] }>()
</script>

<template>
  <nav v-if="totalPages > 1" class="pagination" aria-label="صفحات النتائج">
    <button type="button" :disabled="page <= 1" @click="emit('change', page - 1)">السابق</button>
    <span>صفحة {{ page }} من {{ totalPages }}</span>
    <button type="button" :disabled="page >= totalPages" @click="emit('change', page + 1)">التالي</button>
  </nav>
</template>

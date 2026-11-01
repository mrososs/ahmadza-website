<script setup lang="ts">
const { page, totalPages } = defineProps<{ page: number; totalPages: number }>()
const emit = defineEmits<{ change: [page: number] }>()

// First, last and the current neighbourhood, with gaps collapsed to an ellipsis.
const pages = computed(() => {
  const wanted = [...new Set([1, totalPages, page - 1, page, page + 1])]
    .filter(n => n >= 1 && n <= totalPages)
    .sort((a, b) => a - b)
  const result: Array<number | null> = []
  wanted.forEach((n, index) => {
    const previous = wanted[index - 1]
    if (previous !== undefined && n - previous > 1) result.push(null)
    result.push(n)
  })
  return result
})
</script>

<template>
  <nav v-if="totalPages > 1" class="pagination" aria-label="صفحات النتائج">
    <ul>
      <li v-if="page > 1"><button type="button" @click="emit('change', page - 1)">« السابق</button></li>
      <template v-for="(entry, index) in pages" :key="entry ?? `gap-${index}`">
        <li v-if="entry === null" class="pagination__gap" aria-hidden="true">…</li>
        <li v-else>
          <button type="button" :aria-current="entry === page ? 'page' : undefined" :aria-label="`صفحة ${entry}`" @click="emit('change', entry)">{{ entry }}</button>
        </li>
      </template>
      <li v-if="page < totalPages"><button type="button" @click="emit('change', page + 1)">التالي »</button></li>
    </ul>
  </nav>
</template>

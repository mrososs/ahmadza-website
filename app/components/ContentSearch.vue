<script setup lang="ts">
import { Search } from '@lucide/vue'

const query = defineModel<string>({ default: '' })
const emit = defineEmits<{ submit: [query: string] }>()

defineProps<{ placeholder?: string }>()
</script>

<template>
  <form class="content-search" role="search" method="get" @submit.prevent="emit('submit', query)">
    <label class="sr-only" for="content-search-input">ابحث في المحتوى</label>
    <Search :size="20" aria-hidden="true" />
    <input id="content-search-input" v-model="query" name="q" type="search" :placeholder="placeholder || 'اكتب كلمة أو عنوانًا'">
    <button type="submit">ابحث</button>
  </form>
</template>

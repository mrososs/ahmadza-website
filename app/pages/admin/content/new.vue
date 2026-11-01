<script setup lang="ts">
import { emptyDraft } from '~/utils/admin-content'
import type { ContentDraft } from '~/types/admin'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'مادة جديدة | موقع أحمد زايد' })

const draft = ref<ContentDraft>(emptyDraft())
const { data: categories } = await useAsyncData('admin-categories', async () => (await useAdminRepository()).listCategories(), { server: false })
const { errors, saving, save } = useContentEditor(draft)
</script>

<template>
  <div>
    <header class="admin-pagehead"><h1 class="admin-title">مادة جديدة</h1></header>
    <AdminContentForm v-model="draft" :categories="categories ?? []" :errors="errors" :saving="saving" is-new @submit="save" />
  </div>
</template>

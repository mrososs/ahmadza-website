<script setup lang="ts">
import type { ContentDraft } from '~/types/admin'
import { emptyDraft } from '~/utils/admin-content'

definePageMeta({ layout: 'admin', middleware: 'admin' })

const route = useRoute()
const id = String(route.params.id)

const [{ data: record, status, error }, { data: categories }] = await Promise.all([
  useAsyncData(`admin-content-${id}`, async () => (await useAdminRepository()).getContent(id), { server: false }),
  useAsyncData('admin-categories', async () => (await useAdminRepository()).listCategories(), { server: false }),
])

const draft = ref<ContentDraft>(emptyDraft())
// The form edits a copy so unsaved changes never leak into the cached record.
watch(record, (value) => { if (value) draft.value = structuredClone(toRaw(value)) }, { immediate: true })

const { errors, saving, save } = useContentEditor(draft, id)
useHead({ title: computed(() => `${record.value?.title ?? 'تعديل مادة'} | موقع أحمد الزهراني`) })
</script>

<template>
  <div>
    <header class="admin-pagehead">
      <h1 class="admin-title">تعديل مادة</h1>
      <NuxtLink to="/admin/content" class="admin-link">العودة إلى القائمة</NuxtLink>
    </header>
    <p v-if="status === 'pending' && !record" class="admin-muted" role="status">جارٍ التحميل…</p>
    <div v-else-if="error" class="admin-alert admin-alert--error" role="alert">تعذر تحميل المادة.</div>
    <EmptyState v-else-if="!record" title="المادة غير موجودة" description="ربما حُذفت أو أن الرابط غير صحيح." />
    <AdminContentForm v-else v-model="draft" :categories="categories ?? []" :errors="errors" :saving="saving" :is-new="false" @submit="save" />
  </div>
</template>

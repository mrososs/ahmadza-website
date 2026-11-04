<script setup lang="ts">
import { brandingSlots } from '~/types/branding'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'هوية الموقع | موقع أحمد الزهراني' })

const { profile } = useAdminSession()
// Owners only. The database enforces this too; hiding the controls is just the honest UX.
const canEdit = computed(() => profile.value?.role === 'owner')

const { data: branding, error, status, refresh } = await useAsyncData('admin-branding', async () => (await useAdminRepository()).getSiteBranding(), { server: false })

// Re-read what is really stored, and refresh the shared public branding so the admin bar follows the change too.
async function onChanged() {
  await Promise.all([refresh(), refreshNuxtData('site-branding')])
}
</script>

<template>
  <div>
    <header class="admin-pagehead"><h1 class="admin-title">هوية الموقع</h1></header>
    <p class="admin-muted branding-intro">من هنا تتحكم بحالة نشر الموقع، وبالشعار وصورة الواجهة الرئيسية. تظهر تغييرات الشعار والصورة في الموقع فور حفظها، دون تعديل الشيفرة أو إعادة النشر. كل صورة مستقلة عن الأخرى.</p>

    <AdminPublicationPanel :can-edit="canEdit" />

    <p v-if="!canEdit" class="admin-alert admin-alert--warning" role="status">تغيير هوية الموقع متاح لمالك الموقع فقط. يمكنك الاطلاع على الصور الحالية دون تعديلها.</p>

    <p v-if="status === 'pending' && !branding" class="admin-muted" role="status">جارٍ التحميل…</p>
    <div v-else-if="error" class="admin-alert admin-alert--error" role="alert">
      تعذر تحميل هوية الموقع. <button type="button" class="admin-link" @click="() => refresh()">إعادة المحاولة</button>
    </div>
    <template v-else-if="branding">
      <AdminBrandingSlot v-for="area in brandingSlots" :key="area" :area="area" :current="branding[area]" :can-edit="canEdit" @changed="onChanged" />
    </template>
  </div>
</template>

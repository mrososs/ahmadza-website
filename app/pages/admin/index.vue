<script setup lang="ts">
import { Eye, FilePlus2 } from '@lucide/vue'
import { contentTypePluralLabels, contentTypes } from '~/types/content'
import { publishStatuses, publishStatusLabels } from '~/types/admin'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'لوحة التحكم | موقع أحمد الزهراني' })

const { preview } = useAdminSession()
const { data: publication } = useAdminPublication()
const { data: stats, error, status, refresh } = await useAsyncData('admin-stats', async () => (await useAdminRepository()).stats(), { server: false })
const formatDate = (iso: string) => new Intl.DateTimeFormat('ar', { dateStyle: 'medium' }).format(new Date(iso))
</script>

<template>
  <div>
    <header class="admin-pagehead">
      <h1 class="admin-title">لوحة التحكم</h1>
      <NuxtLink to="/admin/content/new" class="admin-button admin-button--primary"><FilePlus2 :size="18" aria-hidden="true" /> مادة جديدة</NuxtLink>
    </header>

    <section class="admin-card site-preview" aria-labelledby="site-preview-title">
      <div class="site-preview__body">
        <h2 id="site-preview-title" class="admin-card__title">معاينة الموقع</h2>
        <p class="admin-muted">تصفّح الموقع الحقيقي كما سيراه الزوار، بما فيه المقالات والملفات، قبل نشره وبعده.</p>
        <p v-if="publication" class="site-preview__state" role="status">
          <span class="site-preview__dot" :class="{ 'site-preview__dot--live': publication.mode === 'published' }" aria-hidden="true" />
          {{ publication.mode === 'published' ? 'الموقع منشور للجمهور' : 'الموقع قيد التجهيز' }}
          <NuxtLink :to="{ path: '/admin/branding', hash: '#publication' }" class="admin-link">إدارة حالة النشر</NuxtLink>
        </p>
      </div>
      <button type="button" class="admin-button admin-button--primary site-preview__action" :disabled="preview.opening.value" @click="preview.openSite">
        <Eye :size="22" aria-hidden="true" /> معاينة الموقع
      </button>
    </section>

    <p v-if="status === 'pending' && !stats" class="admin-muted" role="status">جارٍ التحميل…</p>
    <div v-else-if="error" class="admin-alert admin-alert--error" role="alert">
      تعذر تحميل الإحصاءات.
      <button type="button" class="admin-link" @click="() => refresh()">إعادة المحاولة</button>
    </div>

    <template v-else-if="stats">
      <section class="admin-card" aria-labelledby="by-type">
        <h2 id="by-type" class="admin-card__title">المحتوى حسب النوع</h2>
        <ul class="stat-grid">
          <li v-for="type in contentTypes" :key="type">
            <NuxtLink :to="{ path: '/admin/content', query: { type } }">
              <strong>{{ stats.byType[type].toLocaleString('ar') }}</strong>
              <span>{{ contentTypePluralLabels[type] }}</span>
            </NuxtLink>
          </li>
        </ul>
      </section>

      <div class="admin-grid-2 admin-grid-2--wide">
        <section class="admin-card" aria-labelledby="by-status">
          <h2 id="by-status" class="admin-card__title">حسب الحالة</h2>
          <dl class="status-list">
            <div v-for="state in publishStatuses" :key="state">
              <dt><AdminStatusBadge :status="state" /><span class="sr-only">{{ publishStatusLabels[state] }}</span></dt>
              <dd>{{ stats.byStatus[state].toLocaleString('ar') }}</dd>
            </div>
          </dl>
        </section>

        <section class="admin-card" aria-labelledby="recent">
          <h2 id="recent" class="admin-card__title">آخر التعديلات</h2>
          <p v-if="!stats.recent.length" class="admin-muted">لا توجد مواد بعد. ابدأ بإضافة أول مادة.</p>
          <ul v-else class="recent-list">
            <li v-for="item in stats.recent" :key="item.id">
              <NuxtLink :to="`/admin/content/${item.id}`">{{ item.title }}</NuxtLink>
              <small>{{ formatDate(item.updatedAt) }}</small>
              <AdminStatusBadge :status="item.status" />
            </li>
          </ul>
        </section>
      </div>
    </template>
  </div>
</template>

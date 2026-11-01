<script setup lang="ts">
import { FilePlus2, Pencil, Search, Trash2 } from '@lucide/vue'
import { publishStatuses, publishStatusLabels } from '~/types/admin'
import { contentTypeLabels, contentTypes, type ContentType, type PublishStatus } from '~/types/content'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'المحتوى | موقع أحمد زايد' })

const route = useRoute()
const router = useRouter()
const { push } = useAdminNotice()

const asType = (value: unknown): ContentType | undefined => contentTypes.find(type => type === value)
const asStatus = (value: unknown): PublishStatus | undefined => publishStatuses.find(status => status === value)

// Filters live in the URL so a filtered list can be reloaded, bookmarked and shared.
const type = computed(() => asType(route.query.type))
const state = computed(() => asStatus(route.query.status))
const query = computed(() => typeof route.query.q === 'string' ? route.query.q : '')
const searchText = shallowRef(query.value)

function setFilter(patch: Record<string, string | undefined>) {
  const next = { ...route.query, ...patch }
  for (const key of Object.keys(next)) if (!next[key]) delete next[key]
  void router.replace({ query: next })
}

const { data: items, error, status, refresh } = await useAsyncData(
  'admin-content-list',
  async () => (await useAdminRepository()).listContent({
    ...(type.value ? { type: type.value } : {}),
    ...(state.value ? { status: state.value } : {}),
    ...(query.value ? { query: query.value } : {}),
  }),
  { server: false, watch: [type, state, query] },
)

const formatDate = (iso: string) => new Intl.DateTimeFormat('ar', { dateStyle: 'medium' }).format(new Date(iso))

const dialog = useTemplateRef<HTMLDialogElement>('confirm')
const pendingDelete = shallowRef<{ id: string; title: string } | null>(null)
const deleting = shallowRef(false)

function askDelete(id: string, title: string) {
  pendingDelete.value = { id, title }
  dialog.value?.showModal()
}
function cancelDelete() {
  dialog.value?.close()
  pendingDelete.value = null
}
async function confirmDelete() {
  if (!pendingDelete.value) return
  deleting.value = true
  try {
    await (await useAdminRepository()).deleteContent(pendingDelete.value.id)
    push('success', 'تم حذف المادة.')
    await refresh()
  }
  catch (cause) {
    push('error', errorMessage(cause, 'تعذر حذف المادة.'))
  }
  finally {
    deleting.value = false
    cancelDelete()
  }
}
</script>

<template>
  <div>
    <header class="admin-pagehead">
      <h1 class="admin-title">المحتوى</h1>
      <NuxtLink to="/admin/content/new" class="admin-button admin-button--primary"><FilePlus2 :size="18" aria-hidden="true" /> مادة جديدة</NuxtLink>
    </header>

    <section class="admin-card" aria-label="قائمة المحتوى">
      <form class="admin-filters" role="search" @submit.prevent="setFilter({ q: searchText.trim() || undefined })">
        <div class="admin-search">
          <Search :size="18" aria-hidden="true" />
          <input v-model="searchText" type="search" aria-label="بحث في العناوين" placeholder="ابحث في العناوين">
        </div>
        <select :value="type ?? ''" aria-label="النوع" @change="setFilter({ type: ($event.target as HTMLSelectElement).value || undefined })">
          <option value="">كل الأنواع</option>
          <option v-for="entry in contentTypes" :key="entry" :value="entry">{{ contentTypeLabels[entry] }}</option>
        </select>
        <select :value="state ?? ''" aria-label="الحالة" @change="setFilter({ status: ($event.target as HTMLSelectElement).value || undefined })">
          <option value="">كل الحالات</option>
          <option v-for="entry in publishStatuses" :key="entry" :value="entry">{{ publishStatusLabels[entry] }}</option>
        </select>
        <button type="submit" class="admin-button admin-button--dark">بحث</button>
      </form>

      <p v-if="status === 'pending' && !items" class="admin-muted" role="status">جارٍ التحميل…</p>
      <div v-else-if="error" class="admin-alert admin-alert--error" role="alert">
        تعذر تحميل المحتوى.
        <button type="button" class="admin-link" @click="() => refresh()">إعادة المحاولة</button>
      </div>
      <EmptyState v-else-if="items && !items.length" title="لا توجد مواد" description="غيّر المرشحات أو أضف مادة جديدة." />

      <div v-else-if="items" class="admin-table-wrap">
        <table class="admin-table">
          <caption class="sr-only">قائمة المواد</caption>
          <thead>
            <tr><th scope="col">العنوان</th><th scope="col">النوع</th><th scope="col">الحالة</th><th scope="col">آخر تعديل</th><th scope="col"><span class="sr-only">إجراءات</span></th></tr>
          </thead>
          <tbody>
            <tr v-for="item in items" :key="item.id">
              <th scope="row" data-label="العنوان">
                <NuxtLink :to="`/admin/content/${item.id}`">{{ item.title }}</NuxtLink>
                <small v-if="item.featured" class="admin-tag">مميّزة</small>
              </th>
              <td data-label="النوع">{{ contentTypeLabels[item.type] }}</td>
              <td data-label="الحالة"><AdminStatusBadge :status="item.status" /></td>
              <td data-label="آخر تعديل">{{ formatDate(item.updatedAt) }}</td>
              <td class="admin-table__actions">
                <NuxtLink :to="`/admin/content/${item.id}`" class="icon-button" :aria-label="`تعديل ${item.title}`"><Pencil :size="18" aria-hidden="true" /></NuxtLink>
                <button type="button" class="icon-button icon-button--danger" :aria-label="`حذف ${item.title}`" @click="askDelete(item.id, item.title)"><Trash2 :size="18" aria-hidden="true" /></button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <dialog ref="confirm" class="admin-dialog" aria-labelledby="del-title" @close="pendingDelete = null">
      <h2 id="del-title">حذف المادة؟</h2>
      <p>سيتم حذف «{{ pendingDelete?.title }}» نهائيًا ولا يمكن التراجع. للإخفاء فقط غيّر حالتها إلى «مؤرشف».</p>
      <div class="admin-dialog__actions">
        <button type="button" class="admin-button admin-button--danger" :disabled="deleting" @click="confirmDelete">{{ deleting ? 'جارٍ الحذف…' : 'حذف نهائي' }}</button>
        <button type="button" class="admin-button admin-button--ghost" @click="cancelDelete">إلغاء</button>
      </div>
    </dialog>
  </div>
</template>

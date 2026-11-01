<script setup lang="ts">
import { Pencil, Plus } from '@lucide/vue'
import { z } from 'zod'
import type { AdminCategory, FieldErrors } from '~/types/admin'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead({ title: 'التصنيفات | موقع أحمد زايد' })

const { push } = useAdminNotice()
const { data: categories, error, status, refresh } = await useAsyncData('admin-categories', async () => (await useAdminRepository()).listCategories(), { server: false })

const categorySchema = z.object({
  name: z.string().trim().min(2, 'الاسم قصير جدًا').max(120, 'الاسم طويل جدًا'),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'أحرف لاتينية صغيرة وأرقام وشرطات فقط، مثل lessons-series'),
  description: z.string().trim().max(300, 'الوصف طويل جدًا'),
  sortOrder: z.number().int().min(0).max(9999),
  active: z.boolean(),
})

interface Form { name: string; slug: string; description: string; sortOrder: string; active: boolean }
const blank = (): Form => ({ name: '', slug: '', description: '', sortOrder: '0', active: true })

const editingId = shallowRef<string | undefined>()
const form = ref<Form>(blank())
const errors = ref<FieldErrors>({})
const saving = shallowRef(false)
const heading = useTemplateRef<HTMLElement>('heading')

function startEdit(category: AdminCategory) {
  editingId.value = category.id
  form.value = { name: category.name, slug: category.slug, description: category.description, sortOrder: String(category.sortOrder), active: category.active }
  errors.value = {}
  heading.value?.scrollIntoView({ block: 'center' })
}
function reset() {
  editingId.value = undefined
  form.value = blank()
  errors.value = {}
}

async function submit() {
  const parsed = categorySchema.safeParse({ ...form.value, sortOrder: Number(form.value.sortOrder || 0) })
  if (!parsed.success) {
    errors.value = Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), issue.message]))
    return
  }
  errors.value = {}
  saving.value = true
  try {
    await (await useAdminRepository()).saveCategory(parsed.data, editingId.value)
    push('success', editingId.value ? 'تم تحديث التصنيف.' : 'تمت إضافة التصنيف.')
    reset()
    await refresh()
  }
  catch (cause) {
    push('error', errorMessage(cause, 'تعذر حفظ التصنيف.'))
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <div>
    <header class="admin-pagehead"><h1 class="admin-title">التصنيفات</h1></header>

    <div class="admin-grid-2 admin-grid-2--wide">
      <section class="admin-card" aria-labelledby="cat-list">
        <h2 id="cat-list" class="admin-card__title">كل التصنيفات</h2>
        <p v-if="status === 'pending' && !categories" class="admin-muted" role="status">جارٍ التحميل…</p>
        <div v-else-if="error" class="admin-alert admin-alert--error" role="alert">
          تعذر تحميل التصنيفات. <button type="button" class="admin-link" @click="() => refresh()">إعادة المحاولة</button>
        </div>
        <EmptyState v-else-if="categories && !categories.length" title="لا توجد تصنيفات" description="أضف أول تصنيف من النموذج." />
        <ul v-else-if="categories" class="category-list">
          <li v-for="category in categories" :key="category.id">
            <span><strong>{{ category.name }}</strong><small dir="ltr">{{ category.slug }}</small></span>
            <span v-if="!category.active" class="admin-badge admin-badge--archived">مخفي</span>
            <button type="button" class="icon-button" :aria-label="`تعديل ${category.name}`" @click="startEdit(category)"><Pencil :size="18" aria-hidden="true" /></button>
          </li>
        </ul>
      </section>

      <section class="admin-card" aria-labelledby="cat-form">
        <h2 id="cat-form" ref="heading" class="admin-card__title">{{ editingId ? 'تعديل التصنيف' : 'تصنيف جديد' }}</h2>
        <form novalidate @submit.prevent="submit">
          <AdminField v-slot="{ id, describedBy, invalid }" label="الاسم" :error="errors.name">
            <input :id="id" v-model="form.name" type="text" :aria-invalid="invalid" :aria-describedby="describedBy">
          </AdminField>
          <AdminField v-slot="{ id, describedBy, invalid }" label="الرابط المختصر" :error="errors.slug">
            <input :id="id" v-model="form.slug" dir="ltr" type="text" class="ltr-input" :aria-invalid="invalid" :aria-describedby="describedBy">
          </AdminField>
          <AdminField v-slot="{ id, describedBy, invalid }" label="الوصف (اختياري)" :error="errors.description">
            <textarea :id="id" v-model="form.description" rows="2" :aria-invalid="invalid" :aria-describedby="describedBy" />
          </AdminField>
          <AdminField v-slot="{ id }" label="الترتيب" hint="الأصغر يظهر أولًا.">
            <input :id="id" v-model="form.sortOrder" inputmode="numeric" type="text" dir="ltr" class="ltr-input">
          </AdminField>
          <label class="admin-check"><input v-model="form.active" type="checkbox"> ظاهر في الموقع</label>
          <div class="admin-actions">
            <button type="submit" class="admin-button admin-button--primary" :disabled="saving">
              <Plus v-if="!editingId" :size="18" aria-hidden="true" /> {{ saving ? 'جارٍ الحفظ…' : editingId ? 'حفظ التغييرات' : 'إضافة التصنيف' }}
            </button>
            <button v-if="editingId" type="button" class="admin-button admin-button--ghost" @click="reset">إلغاء التعديل</button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

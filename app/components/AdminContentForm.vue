<script setup lang="ts">
import { Save } from '@lucide/vue'
import { publishStatusLabels, type AdminCategory, type ContentDraft, type FieldErrors } from '~/types/admin'
import { contentTypeLabels, contentTypes } from '~/types/content'
import { suggestSlug } from '~/utils/admin-content'

const draft = defineModel<ContentDraft>({ required: true })
const { categories, errors, saving, isNew } = defineProps<{ categories: AdminCategory[]; errors: FieldErrors; saving: boolean; isNew: boolean }>()
const emit = defineEmits<{ submit: [] }>()

// A scheduled row can only be kept, not newly created, since no automatic publisher runs yet.
const statusOptions = computed(() => draft.value.status === 'scheduled'
  ? (['draft', 'published', 'scheduled', 'archived'] as const)
  : (['draft', 'published', 'archived'] as const))

function toggleCategory(id: string, checked: boolean) {
  const rest = draft.value.categoryIds.filter(entry => entry !== id)
  draft.value.categoryIds = checked ? [...rest, id] : rest
}

function onTypeChange() {
  if (isNew) draft.value.slug = suggestSlug(draft.value.type)
}
</script>

<template>
  <form class="content-form" novalidate @submit.prevent="emit('submit')">
    <div v-if="Object.keys(errors).length" class="admin-alert admin-alert--error" role="alert">
      تعذر الحفظ. راجع الحقول المعلَّمة بالأحمر.
    </div>

    <div class="content-form__layout">
      <div class="content-form__main">
        <section class="admin-card" aria-labelledby="f-basic">
          <h2 id="f-basic" class="admin-card__title">البيانات الأساسية</h2>
          <AdminField v-slot="{ id, describedBy, invalid }" label="العنوان" :error="errors.title">
            <input :id="id" v-model="draft.title" type="text" required :aria-invalid="invalid" :aria-describedby="describedBy">
          </AdminField>
          <AdminField v-slot="{ id }" label="نوع المادة" :hint="isNew ? undefined : 'لا يمكن تغيير النوع بعد الإنشاء.'">
            <select :id="id" v-model="draft.type" :disabled="!isNew" @change="onTypeChange">
              <option v-for="type in contentTypes" :key="type" :value="type">{{ contentTypeLabels[type] }}</option>
            </select>
          </AdminField>
          <AdminField v-slot="{ id, describedBy, invalid }" label="الرابط المختصر" hint="أحرف لاتينية صغيرة وأرقام وشرطات، ويظهر في عنوان الصفحة." :error="errors.slug">
            <input :id="id" v-model="draft.slug" dir="ltr" type="text" class="ltr-input" :aria-invalid="invalid" :aria-describedby="describedBy">
          </AdminField>
          <AdminField v-slot="{ id, describedBy, invalid }" label="الملخص" hint="يظهر في القوائم ونتائج البحث (حتى 600 حرف)." :error="errors.excerpt">
            <textarea :id="id" v-model="draft.excerpt" rows="3" :aria-invalid="invalid" :aria-describedby="describedBy" />
          </AdminField>
        </section>

        <section v-if="draft.type === 'sermon'" class="admin-card" aria-labelledby="f-sermon">
          <h2 id="f-sermon" class="admin-card__title">بيانات الخطبة</h2>
          <AdminField v-slot="{ id }" label="الرابط المختصر للصوتية المرتبطة (اختياري)">
            <input :id="id" v-model="draft.linkedAudioSlug" dir="ltr" type="text" class="ltr-input">
          </AdminField>
        </section>

        <section v-if="draft.type === 'book'" class="admin-card" aria-labelledby="f-book">
          <h2 id="f-book" class="admin-card__title">بيانات الكتاب</h2>
          <div class="admin-grid-2">
            <AdminField v-slot="{ id, describedBy, invalid }" label="المؤلف" :error="errors.authorLabel">
              <input :id="id" v-model="draft.authorLabel" type="text" :aria-invalid="invalid" :aria-describedby="describedBy">
            </AdminField>
            <AdminField v-slot="{ id, describedBy, invalid }" label="سنة النشر" :error="errors.publicationYear">
              <input :id="id" v-model="draft.publicationYear" inputmode="numeric" type="text" :aria-invalid="invalid" :aria-describedby="describedBy">
            </AdminField>
            <AdminField v-slot="{ id, describedBy, invalid }" label="عدد الصفحات" :error="errors.pageCount">
              <input :id="id" v-model="draft.pageCount" inputmode="numeric" type="text" :aria-invalid="invalid" :aria-describedby="describedBy">
            </AdminField>
          </div>
          <AdminFileUpload v-model="draft.pdfUrl" kind="pdf" label="ملف الكتاب (PDF)" hint="ملف PDF حتى 50 ميجابايت." :error="errors.pdfUrl" />
          <AdminFileUpload v-model="draft.coverUrl" kind="image" label="غلاف الكتاب" hint="صورة JPG أو PNG أو WEBP حتى 5 ميجابايت، يفضّل أن تكون طولية." :error="errors.coverUrl" />
        </section>

        <section v-if="draft.type === 'audio'" class="admin-card" aria-labelledby="f-audio">
          <h2 id="f-audio" class="admin-card__title">بيانات الصوتية</h2>
          <div class="admin-grid-2">
            <AdminField v-slot="{ id, describedBy, invalid }" label="المدة بالثواني" :error="errors.durationSeconds">
              <input :id="id" v-model="draft.durationSeconds" inputmode="numeric" type="text" :aria-invalid="invalid" :aria-describedby="describedBy">
            </AdminField>
          </div>
          <AdminFileUpload v-model="draft.audioUrl" kind="audio" label="الملف الصوتي" hint="MP3 أو M4A أو WAV أو OGG حتى 50 ميجابايت." :error="errors.audioUrl" />
        </section>

        <section v-if="draft.type === 'video'" class="admin-card" aria-labelledby="f-video">
          <h2 id="f-video" class="admin-card__title">بيانات المرئية</h2>
          <div class="admin-grid-2">
            <AdminField v-slot="{ id, describedBy, invalid }" label="معرّف فيديو يوتيوب" hint="الرمز المكوّن من 11 حرفًا بعد v= في الرابط." :error="errors.youtubeId">
              <input :id="id" v-model="draft.youtubeId" dir="ltr" type="text" class="ltr-input" :aria-invalid="invalid" :aria-describedby="describedBy">
            </AdminField>
            <AdminField v-slot="{ id, describedBy, invalid }" label="المدة بالثواني" :error="errors.durationSeconds">
              <input :id="id" v-model="draft.durationSeconds" inputmode="numeric" type="text" :aria-invalid="invalid" :aria-describedby="describedBy">
            </AdminField>
          </div>
        </section>

        <section class="admin-card" aria-labelledby="f-body">
          <h2 id="f-body" class="admin-card__title">نص المادة</h2>
          <AdminSectionsEditor v-model="draft.sections" />
        </section>
      </div>

      <aside class="content-form__side">
        <section class="admin-card" aria-labelledby="f-publish">
          <h2 id="f-publish" class="admin-card__title">النشر</h2>
          <AdminField v-slot="{ id }" label="الحالة">
            <select :id="id" v-model="draft.status">
              <option v-for="status in statusOptions" :key="status" :value="status">{{ publishStatusLabels[status] }}</option>
            </select>
          </AdminField>
          <AdminField v-if="draft.status === 'published'" v-slot="{ id }" label="تاريخ النشر" hint="اتركه فارغًا للنشر الآن. موعد مستقبلي يُبقي المادة مخفية حتى حلوله.">
            <input :id="id" v-model="draft.publishedAt" type="datetime-local" dir="ltr" class="ltr-input">
          </AdminField>
          <AdminField v-if="draft.status === 'scheduled'" v-slot="{ id, describedBy, invalid }" label="موعد الجدولة" :error="errors.scheduledAt">
            <input :id="id" v-model="draft.scheduledAt" type="datetime-local" dir="ltr" class="ltr-input" :aria-invalid="invalid" :aria-describedby="describedBy">
          </AdminField>
          <AdminField v-slot="{ id, describedBy, invalid }" label="مدة القراءة بالدقائق" :error="errors.readingMinutes">
            <input :id="id" v-model="draft.readingMinutes" inputmode="numeric" type="text" :aria-invalid="invalid" :aria-describedby="describedBy">
          </AdminField>
          <label class="admin-check"><input v-model="draft.featured" type="checkbox"> مادة مميّزة في الصفحة الرئيسية</label>
        </section>

        <section class="admin-card" aria-labelledby="f-cats">
          <h2 id="f-cats" class="admin-card__title">التصنيفات</h2>
          <p v-if="!categories.length" class="admin-muted">لا توجد تصنيفات بعد.</p>
          <label v-for="category in categories" :key="category.id" class="admin-check">
            <input type="checkbox" :checked="draft.categoryIds.includes(category.id)" @change="toggleCategory(category.id, ($event.target as HTMLInputElement).checked)">
            {{ category.name }}<small v-if="!category.active"> (مخفي)</small>
          </label>
        </section>

        <section class="admin-card" aria-labelledby="f-seo">
          <h2 id="f-seo" class="admin-card__title">محركات البحث</h2>
          <AdminField v-slot="{ id, describedBy, invalid }" label="عنوان البحث" :hint="`${draft.seoTitle.length} / 70`" :error="errors.seoTitle">
            <input :id="id" v-model="draft.seoTitle" type="text" :aria-invalid="invalid" :aria-describedby="describedBy">
          </AdminField>
          <AdminField v-slot="{ id, describedBy, invalid }" label="وصف البحث" :hint="`${draft.seoDescription.length} / 170`" :error="errors.seoDescription">
            <textarea :id="id" v-model="draft.seoDescription" rows="3" :aria-invalid="invalid" :aria-describedby="describedBy" />
          </AdminField>
        </section>
      </aside>
    </div>

    <div class="save-bar">
      <button type="submit" class="admin-button admin-button--primary" :disabled="saving">
        <Save :size="18" aria-hidden="true" /> {{ saving ? 'جارٍ الحفظ…' : 'حفظ المادة' }}
      </button>
      <NuxtLink to="/admin/content" class="admin-button admin-button--ghost">إلغاء</NuxtLink>
    </div>
  </form>
</template>

<script setup lang="ts">
import { Eye, Globe, Wrench } from '@lucide/vue'
import type { PublicationMode } from '~/types/publication'

const { canEdit } = defineProps<{ canEdit: boolean }>()

const { mode: backendMode, preview } = useAdminSession()
const { push } = useAdminNotice()
const { data: record, error, status, refresh } = useAdminPublication()

const isPublished = computed(() => record.value?.mode === 'published')
const dialog = useTemplateRef<HTMLDialogElement>('confirm')
const target = shallowRef<PublicationMode | null>(null)
const saving = shallowRef(false)

const lastChange = computed(() => {
  const value = record.value
  if (!value?.updatedAt) return ''
  const when = new Intl.DateTimeFormat('ar', { dateStyle: 'long', timeStyle: 'short' }).format(new Date(value.updatedAt))
  return value.updatedByName ? `آخر تغيير: ${when} بواسطة ${value.updatedByName}.` : `آخر تغيير: ${when}.`
})

// Flipping the switch never saves by itself: it asks first, and the switch only moves once the database has accepted the change.
async function ask() {
  if (!record.value || !canEdit || saving.value) return
  target.value = isPublished.value ? 'maintenance' : 'published'
  // Let the dialog render the question for this direction before it opens, so it never flashes the other one.
  await nextTick()
  dialog.value?.showModal()
}

async function confirm() {
  const mode = target.value
  if (!mode || saving.value) return
  saving.value = true
  try {
    record.value = await (await useAdminRepository()).setPublication(mode)
    push('success', mode === 'published'
      ? 'تم نشر الموقع، وهو متاح الآن لجميع الزوار.'
      : 'أُعيد الموقع إلى وضع التجهيز ولم يعد متاحًا للزوار.')
  }
  catch (cause) {
    push('error', errorMessage(cause, 'تعذر تغيير حالة نشر الموقع. لم يتغير شيء، حاول مرة أخرى.'))
  }
  finally {
    saving.value = false
    dialog.value?.close()
  }
}
</script>

<template>
  <section id="publication" class="admin-card publication" aria-labelledby="publication-title">
    <h2 id="publication-title" class="admin-card__title">حالة نشر الموقع</h2>

    <p v-if="backendMode === 'demo'" class="admin-alert admin-alert--demo">
      وضع تجريبي: هذا القسم يعمل في الذاكرة فقط ولا يغيّر حالة الموقع الفعلية.
    </p>

    <p v-if="status === 'pending' && !record" class="admin-muted" role="status">جارٍ التحميل…</p>
    <div v-else-if="error || !record" class="admin-alert admin-alert--error" role="alert">
      تعذر تحميل حالة نشر الموقع. <button type="button" class="admin-link" @click="() => refresh()">إعادة المحاولة</button>
    </div>

    <template v-else>
      <p class="publication__state" :class="isPublished ? 'publication__state--published' : 'publication__state--maintenance'" role="status">
        <Globe v-if="isPublished" :size="22" aria-hidden="true" />
        <Wrench v-else :size="22" aria-hidden="true" />
        <strong>{{ isPublished ? 'الموقع منشور للجمهور' : 'الموقع قيد التجهيز' }}</strong>
      </p>
      <p class="publication__text">
        {{ isPublished
          ? 'الموقع متاح الآن لجميع الزوار ويمكنهم تصفح المقالات والمحتوى المنشور.'
          : 'الموقع غير متاح للزوار حاليًا، ويمكنك الاستمرار في إدارة المحتوى ومعاينة الموقع قبل إطلاقه.' }}
      </p>
      <p class="admin-muted publication__meta">{{ lastChange || 'لم يُنشر الموقع بعد.' }} يصل التغيير إلى الزوار خلال ثوانٍ.</p>

      <div class="publication__controls">
        <button
          type="button"
          role="switch"
          class="admin-switch"
          :aria-checked="isPublished"
          :disabled="!canEdit || saving"
          @click="ask"
        >
          <span class="admin-switch__track" aria-hidden="true"><span class="admin-switch__thumb" /></span>
          <span>نشر الموقع للجمهور</span>
        </button>
        <button type="button" class="admin-button admin-button--ghost" :disabled="preview.opening.value" @click="preview.openSite">
          <Eye :size="18" aria-hidden="true" /> معاينة الموقع
        </button>
      </div>

      <p v-if="!canEdit" class="admin-alert admin-alert--warning" role="status">تغيير حالة النشر متاح لمالك الموقع فقط. يمكنك الاطلاع على الحالة ومعاينة الموقع.</p>
    </template>

    <dialog ref="confirm" class="admin-dialog" aria-labelledby="publication-dialog-title" @close="target = null" @cancel="(event) => { if (saving) event.preventDefault() }">
      <template v-if="target === 'published'">
        <h2 id="publication-dialog-title">نشر الموقع للجمهور؟</h2>
        <p>سيصبح الموقع متاحًا لجميع الزوار فور التأكيد، ويمكن لمحركات البحث فهرسة المحتوى المنشور. يمكنك إعادته إلى وضع التجهيز في أي وقت.</p>
      </template>
      <template v-else>
        <h2 id="publication-dialog-title">إعادة الموقع إلى وضع التجهيز؟</h2>
        <p>سيرى الزوار صفحة «قريبًا بإذن الله» ولن يتمكنوا من فتح أي مقال أو ملف. ستستمر في إدارة المحتوى ومعاينة الموقع.</p>
      </template>
      <div class="admin-dialog__actions">
        <button type="button" class="admin-button" :class="target === 'published' ? 'admin-button--primary' : 'admin-button--danger'" :disabled="saving" @click="confirm">
          {{ saving ? 'جارٍ الحفظ…' : target === 'published' ? 'نعم، انشر الموقع' : 'نعم، أعد الموقع إلى التجهيز' }}
        </button>
        <button type="button" class="admin-button admin-button--ghost" :disabled="saving" @click="dialog?.close()">إلغاء</button>
      </div>
    </dialog>
  </section>
</template>

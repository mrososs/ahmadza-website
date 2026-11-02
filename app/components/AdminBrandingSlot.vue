<script setup lang="ts">
import { ImagePlus, RotateCcw, Save, TriangleAlert, X } from '@lucide/vue'
import type { BrandingImage, BrandingSlot, PreparedBrandingImage } from '~/types/branding'
import { brandingAccept, validateBrandingFile } from '~/utils/branding'
import { assessBrandingImage, brandingCopy, formatFileSize, inspectBrandingImage, sizeLabel } from '~/utils/branding-admin'

interface Candidate {
  prepared: PreparedBrandingImage
  previewUrl: string
  warnings: string[]
}

const { area, current, canEdit } = defineProps<{ area: BrandingSlot; current: BrandingImage; canEdit: boolean }>()
const emit = defineEmits<{ changed: [image: BrandingImage] }>()

const copy = computed(() => brandingCopy[area])
const authorDisplayName = useRuntimeConfig().public.authorDisplayName
const titleId = useId()

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const dialog = useTemplateRef<HTMLDialogElement>('confirm')

const candidate = shallowRef<Candidate | null>(null)
const problem = shallowRef('')
const feedback = shallowRef<{ tone: 'success' | 'error'; message: string } | null>(null)
const inspecting = shallowRef(false)
const saving = shallowRef(false)
const resetting = shallowRef(false)
const progress = shallowRef(0)

const busy = computed(() => inspecting.value || saving.value || resetting.value)

function discardCandidate() {
  if (candidate.value) URL.revokeObjectURL(candidate.value.previewUrl)
  candidate.value = null
  if (fileInput.value) fileInput.value.value = ''
}
onScopeDispose(discardCandidate)

function reject(message: string) {
  problem.value = message
  if (fileInput.value) fileInput.value.value = ''
}

async function onPick() {
  const file = fileInput.value?.files?.[0]
  if (!file) return
  feedback.value = null
  problem.value = ''
  discardCandidate()

  // Cheap checks first (type, size), then decode the image to read its real size and look at its pixels.
  const invalid = validateBrandingFile(file)
  if (invalid) return reject(invalid)

  inspecting.value = true
  try {
    const info = await inspectBrandingImage(file)
    const assessment = assessBrandingImage(area, info)
    if (assessment.error) return reject(assessment.error)
    candidate.value = {
      prepared: { file, width: info.width, height: info.height, alt: authorDisplayName },
      previewUrl: URL.createObjectURL(file),
      warnings: assessment.warnings,
    }
  }
  catch {
    reject('تعذر قراءة الصورة. تأكد أنها ملف PNG أو WebP سليم.')
  }
  finally {
    inspecting.value = false
  }
}

function cancel() {
  discardCandidate()
  problem.value = ''
}

async function save() {
  if (!candidate.value) return
  saving.value = true
  progress.value = 0
  feedback.value = null
  try {
    const saved = await (await useAdminRepository()).saveBrandingImage(area, candidate.value.prepared, (percent) => { progress.value = percent })
    discardCandidate()
    feedback.value = { tone: 'success', message: copy.value.savedMessage }
    emit('changed', saved)
  }
  catch (cause) {
    feedback.value = { tone: 'error', message: errorMessage(cause, 'تعذر حفظ الصورة. لم يتغير شيء على الموقع.') }
  }
  finally {
    saving.value = false
  }
}

function askReset() {
  dialog.value?.showModal()
}

async function confirmReset() {
  resetting.value = true
  feedback.value = null
  try {
    const restored = await (await useAdminRepository()).resetBrandingImage(area)
    dialog.value?.close()
    feedback.value = { tone: 'success', message: copy.value.resetMessage }
    emit('changed', restored)
  }
  catch (cause) {
    dialog.value?.close()
    feedback.value = { tone: 'error', message: errorMessage(cause, 'تعذر استعادة الصورة الافتراضية.') }
  }
  finally {
    resetting.value = false
  }
}
</script>

<template>
  <section class="admin-card branding-slot" :aria-labelledby="titleId" :data-testid="`branding-${area}`">
    <h2 :id="titleId" class="admin-card__title">{{ copy.title }}</h2>
    <p class="admin-muted">{{ copy.subtitle }}</p>

    <div class="branding-compare">
      <figure class="branding-figure" data-testid="branding-current">
        <figcaption>
          الصورة الحالية
          <span class="admin-badge" :class="current.custom ? 'admin-badge--published' : 'admin-badge--archived'">{{ current.custom ? 'مرفوعة' : 'افتراضية' }}</span>
        </figcaption>
        <AdminBrandingStage :area="area" :src="current.url" :width="current.width" :height="current.height" :alt="`الصورة الحالية: ${copy.title}`" />
        <p class="branding-figure__meta">{{ sizeLabel(current) }} بكسل</p>
      </figure>

      <figure v-if="candidate" class="branding-figure" data-testid="branding-new">
        <figcaption>الصورة الجديدة</figcaption>
        <AdminBrandingStage :area="area" :src="candidate.previewUrl" :width="candidate.prepared.width" :height="candidate.prepared.height" :alt="`الصورة الجديدة: ${copy.title}`" />
        <p class="branding-figure__meta">{{ sizeLabel(candidate.prepared) }} بكسل · {{ formatFileSize(candidate.prepared.file.size) }}</p>
      </figure>
      <div v-else class="branding-figure branding-figure--empty">
        <p class="branding-figure__caption">الصورة الجديدة</p>
        <p class="admin-muted">اختر صورة لتظهر هنا قبل الحفظ، فتراها كما ستظهر في الموقع.</p>
      </div>
    </div>

    <p class="branding-helper" data-testid="branding-helper">{{ copy.helper }}</p>
    <p v-if="copy.hint" class="branding-helper branding-helper--hint">{{ copy.hint }}</p>

    <div aria-live="polite">
      <p v-if="inspecting" class="admin-muted" role="status">جارٍ فحص الصورة…</p>
      <p v-if="problem" class="admin-alert admin-alert--error" role="alert">{{ problem }}</p>
      <ul v-if="candidate?.warnings.length" class="branding-warnings" aria-label="تنبيهات على الصورة الجديدة">
        <li v-for="warning in candidate.warnings" :key="warning" class="admin-alert admin-alert--warning">
          <TriangleAlert :size="18" aria-hidden="true" /> {{ warning }}
        </li>
      </ul>
      <p v-if="feedback" class="admin-alert" :class="feedback.tone === 'success' ? 'admin-alert--success' : 'admin-alert--error'" :role="feedback.tone === 'success' ? 'status' : 'alert'">{{ feedback.message }}</p>
    </div>

    <div v-if="saving" class="file-upload__progress" role="status">
      <progress max="100" :value="progress" aria-label="تقدّم الرفع" />
      <span>جارٍ رفع الصورة… {{ progress }}%</span>
    </div>

    <div class="admin-actions">
      <input ref="fileInput" class="sr-only" type="file" tabindex="-1" aria-hidden="true" :accept="brandingAccept" :disabled="!canEdit || busy" @change="onPick">
      <button type="button" class="admin-button admin-button--dark" :disabled="!canEdit || busy" @click="fileInput?.click()">
        <ImagePlus :size="18" aria-hidden="true" /> اختيار صورة
      </button>
      <button type="button" class="admin-button admin-button--primary" :disabled="!canEdit || !candidate || busy" @click="save">
        <Save :size="18" aria-hidden="true" /> {{ saving ? 'جارٍ الحفظ…' : 'حفظ التغييرات' }}
      </button>
      <button v-if="candidate" type="button" class="admin-button admin-button--ghost" :disabled="saving" @click="cancel">
        <X :size="18" aria-hidden="true" /> إلغاء
      </button>
      <button type="button" class="admin-button admin-button--ghost branding-reset" :disabled="!canEdit || !current.custom || busy" @click="askReset">
        <RotateCcw :size="18" aria-hidden="true" /> استعادة الصورة الافتراضية
      </button>
    </div>

    <dialog ref="confirm" class="admin-dialog" :aria-labelledby="`${titleId}-reset`">
      <h2 :id="`${titleId}-reset`">استعادة الصورة الافتراضية؟</h2>
      <p>سيعود «{{ copy.title }}» إلى الصورة الأصلية للموقع فورًا. لا يُحذف أي ملف آخر، ويمكنك رفع صورة جديدة لاحقًا.</p>
      <div class="admin-dialog__actions">
        <button type="button" class="admin-button admin-button--primary" :disabled="resetting" @click="confirmReset">{{ resetting ? 'جارٍ الاستعادة…' : 'نعم، استعد الصورة الافتراضية' }}</button>
        <button type="button" class="admin-button admin-button--ghost" :disabled="resetting" @click="dialog?.close()">إلغاء</button>
      </div>
    </dialog>
  </section>
</template>

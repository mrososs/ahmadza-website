<script setup lang="ts">
import { RefreshCw, Trash2, X } from '@lucide/vue'
import type { ContentDraft } from '~/types/admin'
import { AdminError, type VideoUpload } from '~/repositories/admin/admin-repository'
import { formatMegabytes, readVideoDuration, validateVideoFile, videoAccept } from '~/utils/video-upload'
import { parseYoutubeInput } from '~/utils/youtube'

/**
 * The two ways to give a video record something to play: a YouTube link or a file uploaded to private storage.
 * The sources are mutually exclusive; only the selected one is saved (see `draftToMetadata`).
 */
const draft = defineModel<ContentDraft>({ required: true })
const uploading = defineModel<boolean>('uploading', { default: false })
const { errors } = defineProps<{ errors: Record<string, string | undefined> }>()

const maxMb = useRuntimeConfig().public.videoMaxMb
const progress = shallowRef(0)
const failure = shallowRef('')
const fileName = shallowRef('')
const previewUrl = shallowRef('')
const previewError = shallowRef('')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')

let current: VideoUpload | undefined
let lastFile: File | undefined
// Files uploaded during this visit and not yet saved on a record: the only ones that are always safe to delete.
const unsaved = new Set<string>()

const youtube = computed(() => draft.value.youtubeId.trim() ? parseYoutubeInput(draft.value.youtubeId) : undefined)
const sizeLabel = computed(() => draft.value.videoBytes ? `${formatMegabytes(Number(draft.value.videoBytes))} م.ب` : '')

async function discard(path: string) {
  if (!unsaved.delete(path)) return
  await (await useAdminRepository()).removeVideoFile(path)
}

async function refreshPreview() {
  previewUrl.value = ''
  previewError.value = ''
  if (draft.value.videoSource !== 'upload' || !draft.value.videoPath) return
  try {
    previewUrl.value = await (await useAdminRepository()).previewVideoUrl(draft.value.videoPath)
  }
  catch (caught) {
    previewError.value = caught instanceof AdminError ? caught.message : 'تعذر تحميل معاينة الفيديو.'
  }
}

async function start(file: File) {
  // A second submission while one is running would create a second object; the picker is disabled instead (see the template).
  if (uploading.value) return
  failure.value = ''
  const problem = validateVideoFile(file, maxMb)
  if (problem) {
    failure.value = problem
    return
  }

  lastFile = file
  fileName.value = file.name
  progress.value = 0
  uploading.value = true
  try {
    current = (await useAdminRepository()).uploadVideo(file, (percent) => { progress.value = percent })
    const stored = await current.result

    // The earlier upload from this visit is now replaced and unreferenced.
    const replaced = draft.value.videoPath
    unsaved.add(stored.path)
    draft.value.videoPath = stored.path
    draft.value.videoMimeType = stored.mimeType
    draft.value.videoBytes = String(stored.bytes)
    if (replaced && replaced !== stored.path) await discard(replaced)
    lastFile = undefined

    if (!draft.value.durationSeconds) {
      const seconds = await readVideoDuration(file)
      if (seconds) draft.value.durationSeconds = String(seconds)
    }
    await refreshPreview()
  }
  catch (caught) {
    failure.value = caught instanceof AdminError ? caught.message : 'تعذر رفع الفيديو. حاول مرة أخرى.'
    if (!(caught instanceof AdminError)) console.error('[admin] unexpected video upload failure', caught)
  }
  finally {
    uploading.value = false
    current = undefined
    if (fileInput.value) fileInput.value.value = ''
  }
}

function onPick(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) void start(file)
}

function cancel() {
  current?.abort()
}

function retry() {
  if (lastFile) void start(lastFile)
}

async function remove() {
  const path = draft.value.videoPath
  draft.value.videoPath = ''
  draft.value.videoMimeType = ''
  draft.value.videoBytes = ''
  draft.value.downloadAllowed = false
  previewUrl.value = ''
  fileName.value = ''
  if (path) await discard(path)
}

// Leaving the upload source drops a file that was never saved; a saved file is cleaned up when the record is saved.
watch(() => draft.value.videoSource, async (source) => {
  failure.value = ''
  if (source === 'youtube') {
    previewUrl.value = ''
    if (draft.value.videoPath && unsaved.has(draft.value.videoPath)) await remove()
  }
  else await refreshPreview()
})

onMounted(() => { void refreshPreview() })
onBeforeUnmount(() => current?.abort())
</script>

<template>
  <fieldset class="video-source" data-testid="video-source">
    <legend>مصدر الفيديو</legend>
    <div class="video-source__choice" role="radiogroup" aria-label="مصدر الفيديو">
      <label class="admin-check"><input v-model="draft.videoSource" type="radio" name="video-source" value="youtube" :disabled="uploading"> فيديو يوتيوب</label>
      <label class="admin-check"><input v-model="draft.videoSource" type="radio" name="video-source" value="upload" :disabled="uploading"> رفع فيديو من الجهاز</label>
    </div>

    <template v-if="draft.videoSource === 'youtube'">
      <AdminField v-slot="{ id, describedBy, invalid }" label="رابط فيديو يوتيوب" hint="الصق الرابط كما يظهر في المتصفح أو من زر المشاركة، مثل youtu.be/… أو youtube.com/watch?v=… أو /shorts/…" :error="errors.youtubeId ?? (youtube && !youtube.ok ? youtube.message : undefined)">
        <input :id="id" v-model="draft.youtubeId" dir="ltr" type="text" class="ltr-input" inputmode="url" autocomplete="off" :aria-invalid="invalid" :aria-describedby="describedBy">
      </AdminField>
      <div v-if="youtube?.ok" class="video-source__preview" data-testid="youtube-preview">
        <p class="admin-field__hint">معاينة (معرّف الفيديو <bdi dir="ltr">{{ youtube.id }}</bdi>). إن ظهرت رسالة عدم السماح بالتضمين فلن يعمل هذا الفيديو في الموقع.</p>
        <VideoPlayer :key="youtube.id" :title="draft.title || 'معاينة الفيديو'" :youtube-id="youtube.id" />
      </div>
    </template>

    <template v-else>
      <AdminField v-slot="{ id, describedBy, invalid }" label="اختر ملف الفيديو" :hint="`MP4 (يفضّل H.264 مع صوت AAC) أو WebM، حتى ${formatMegabytes(maxMb * 1024 * 1024)} ميجابايت. قد لا تعمل بعض الملفات في كل المتصفحات.`" :error="failure || errors.videoPath">
        <input :id="id" ref="fileInput" type="file" :accept="videoAccept" :disabled="uploading" :aria-invalid="invalid" :aria-describedby="describedBy" data-testid="video-file" @change="onPick">
      </AdminField>

      <div v-if="uploading" class="file-upload__progress" role="status" data-testid="video-progress">
        <progress max="100" :value="progress" aria-label="تقدّم رفع الفيديو" />
        <span>جارٍ رفع <bdi>{{ fileName }}</bdi>… {{ progress }}%</span>
        <button type="button" class="admin-button admin-button--ghost" @click="cancel"><X :size="18" aria-hidden="true" /> إلغاء الرفع</button>
      </div>
      <p v-else-if="failure && lastFile" class="video-source__retry">
        <button type="button" class="admin-button admin-button--ghost" data-testid="video-retry" @click="retry"><RefreshCw :size="18" aria-hidden="true" /> إعادة المحاولة</button>
      </p>

      <div v-if="draft.videoPath && !uploading" class="video-source__preview" data-testid="video-uploaded">
        <p class="file-upload__done" role="status">الفيديو مرفوع{{ sizeLabel ? ` (${sizeLabel})` : '' }}. اضغط «حفظ المادة» لتثبيته.</p>
        <VideoPlayer v-if="previewUrl" :title="draft.title || 'معاينة الفيديو'" :src="previewUrl" :poster="draft.coverUrl || undefined" />
        <p v-else-if="previewError" class="admin-alert admin-alert--error" role="alert">{{ previewError }}</p>
        <button type="button" class="admin-button admin-button--ghost" @click="remove"><Trash2 :size="18" aria-hidden="true" /> إزالة الفيديو</button>
      </div>

      <label class="admin-check"><input v-model="draft.downloadAllowed" type="checkbox"> السماح للزائر بتحميل الفيديو</label>
      <p class="admin-field__hint">عند التفعيل يظهر زر «تنزيل الفيديو» في صفحة الفيديو. عند الإيقاف يبقى التشغيل متاحًا فقط. هذا الخيار يخص الفيديو المرفوع؛ لا يوفّر الموقع تنزيل فيديوهات يوتيوب. إخفاء الزر لا يمنع من يشاهد الفيديو من تسجيله، فهو ليس حماية من النسخ.</p>
    </template>

    <AdminField v-slot="{ id, describedBy, invalid }" label="المدة بالثواني" :error="errors.durationSeconds">
      <input :id="id" v-model="draft.durationSeconds" inputmode="numeric" type="text" :aria-invalid="invalid" :aria-describedby="describedBy">
    </AdminField>
  </fieldset>
</template>

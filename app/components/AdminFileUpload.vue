<script setup lang="ts">
import { Trash2 } from '@lucide/vue'
import { AdminError } from '~/repositories/admin/admin-repository'
import { readImageSize, validateImageDimensions } from '~/utils/image-dimensions'
import { acceptAttribute, validateMediaFile, type MediaKind } from '~/utils/media-upload'

const url = defineModel<string>({ required: true })
const { kind, label, hint, error } = defineProps<{ kind: MediaKind; label: string; hint?: string; error?: string | undefined }>()

const uploading = ref(false)
const progress = ref(0)
const uploadError = ref('')
const uploadedName = ref('')

const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const hasLink = computed(() => /^https?:\/\//i.test(url.value))

async function onPick(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  uploadError.value = ''
  uploadedName.value = ''

  const problem = validateMediaFile(kind, file) ?? (kind === 'image' ? validateImageDimensions(await readImageSize(file)) : null)
  if (problem) {
    uploadError.value = problem
    input.value = ''
    return
  }

  uploading.value = true
  progress.value = 0
  try {
    url.value = await (await useAdminRepository()).uploadMedia(kind, file, (percent) => { progress.value = percent })
    uploadedName.value = file.name
  }
  catch (caught) {
    uploadError.value = caught instanceof AdminError ? caught.message : 'تعذر رفع الملف. حاول مرة أخرى.'
  }
  finally {
    uploading.value = false
    // Keep the chosen file name visible after a successful upload; clear it after a failure so the same file can be retried.
    if (uploadError.value) input.value = ''
  }
}

function remove() {
  if (fileInput.value) fileInput.value.value = ''
  url.value = ''
  uploadedName.value = ''
  uploadError.value = ''
}
</script>

<template>
  <fieldset class="file-upload" :data-testid="`upload-${kind}`">
    <legend>{{ label }}</legend>

    <AdminField v-slot="{ id, describedBy, invalid }" label="اختر ملفًا من جهازك" :hint="hint" :error="uploadError || error">
      <input :id="id" ref="fileInput" type="file" :accept="acceptAttribute(kind)" :disabled="uploading" :aria-invalid="invalid" :aria-describedby="describedBy" @change="onPick">
    </AdminField>

    <div v-if="uploading" class="file-upload__progress" role="status">
      <progress max="100" :value="progress" aria-label="تقدّم الرفع" />
      <span>جارٍ رفع الملف… {{ progress }}%</span>
    </div>
    <p v-else-if="uploadedName" class="file-upload__done" role="status">تم رفع الملف <bdi>{{ uploadedName }}</bdi> بنجاح. اضغط «حفظ المادة» لتثبيته.</p>

    <div v-if="hasLink && !uploading" class="file-upload__preview">
      <img v-if="kind === 'image'" class="file-upload__image" :src="url" alt="معاينة الصورة">
      <audio v-else-if="kind === 'audio'" controls preload="metadata" :src="url" />
      <a v-else :href="url" target="_blank" rel="noopener">فتح الملف للمعاينة</a>
      <button type="button" class="admin-button admin-button--ghost" @click="remove">
        <Trash2 :size="18" aria-hidden="true" /> إزالة الملف
      </button>
    </div>

    <AdminField v-slot="{ id, describedBy }" label="أو رابط خارجي">
      <input :id="id" v-model="url" dir="ltr" type="url" class="ltr-input" :aria-describedby="describedBy">
    </AdminField>
  </fieldset>
</template>

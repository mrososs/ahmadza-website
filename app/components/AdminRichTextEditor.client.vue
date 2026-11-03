<script setup lang="ts">
import { Delta, loadQuill, QuillEditor, type QuillConstructor } from '@vueup/vue-quill'
import '@vueup/vue-quill/dist/vue-quill.core.css'
import {
  AlignCenter, AlignJustify, AlignRight, Bold, Eye, IndentDecrease, IndentIncrease, Italic, Image as ImageIcon,
  Link as LinkIcon, List, ListOrdered, Pencil, Quote, Redo2, RemoveFormatting, Underline, Undo2,
} from '@lucide/vue'
import { AdminError } from '~/repositories/admin/admin-repository'
import { isSafeLink } from '~/utils/rich-text-policy'
import { sanitizeRichTextInBrowser } from '~/utils/rich-text-client'
import { isRichTextEmpty } from '~/utils/rich-text'
import { readImageSize, validateImageDimensions } from '~/utils/image-dimensions'
import { acceptAttribute, validateMediaFile } from '~/utils/media-upload'

type QuillInstance = InstanceType<QuillConstructor>
type Formats = Record<string, unknown>

/**
 * Rich text editor for article bodies: Quill 2 behind `@vueup/vue-quill`, with a hand-built Arabic toolbar.
 * The v-model is HTML. Only the formats listed below exist, pasted content is cut down to them, and images can only be
 * added through the site's own upload (never as pasted or dropped base64 data).
 */
const model = defineModel<string>({ required: true })
const { label, invalid = false, describedBy } = defineProps<{ label: string; invalid?: boolean; describedBy?: string | undefined }>()

const formats = ['bold', 'italic', 'underline', 'header', 'list', 'blockquote', 'link', 'align', 'direction', 'indent', 'image']

// Quill's direction format only knows "rtl". The page is RTL, so editors need an explicit LTR option for English passages.
// It has to be registered before the editor is created, which is why the editor below waits for `ready`.
const ready = shallowRef(false)
onMounted(async () => {
  const Quill = await loadQuill()
  const { ClassAttributor, Scope } = Quill.import('parchment')
  const direction = new ClassAttributor('direction', 'ql-direction', { scope: Scope.BLOCK, whitelist: ['rtl', 'ltr'] })
  Quill.register({ 'formats/direction': direction, 'attributors/class/direction': direction }, true)
  ready.value = true
})

const mode = shallowRef<'edit' | 'preview'>('edit')
const format = shallowRef<Formats>({})
const history = shallowRef({ undo: false, redo: false })
const busy = shallowRef(false)
const notice = shallowRef('')
const linkOpen = shallowRef(false)
const linkValue = shallowRef('')
const fileInput = useTemplateRef<HTMLInputElement>('fileInput')
const linkInput = useTemplateRef<HTMLInputElement>('linkInput')

let quill: QuillInstance | undefined
let lastHtml = ''
let linkRange: { index: number; length: number } | undefined

const supabaseUrl = useRuntimeConfig().public.supabaseUrl.replace(/\/$/, '')
const imagePrefixes = supabaseUrl ? [`${supabaseUrl}/storage/v1/object/public/publications/`] : []
const preview = computed(() => mode.value === 'preview' ? sanitizeRichTextInBrowser(model.value, imagePrefixes) : '')

const options = {
  placeholder: 'ابدأ كتابة النص هنا…',
  formats,
  modules: {
    toolbar: false,
    history: { delay: 800, maxStack: 200, userOnly: true },
    // Dropped and pasted image files go through the same upload as the toolbar button.
    uploader: { mimetypes: ['image/jpeg', 'image/png', 'image/webp'], handler: (range: { index: number }, files: File[]) => { void insertImages(files, range.index) } },
  },
}

function readHtml(editor: QuillInstance): string {
  const html = editor.getSemanticHTML()
  return isRichTextEmpty(html) ? '' : html
}

function refreshState(editor: QuillInstance) {
  const range = editor.getSelection()
  format.value = range ? editor.getFormat(range) : {}
  history.value = { undo: editor.history.stack.undo.length > 0, redo: editor.history.stack.redo.length > 0 }
}

function setFromHtml(editor: QuillInstance, html: string) {
  editor.setContents(editor.clipboard.convert({ html }), 'silent')
  lastHtml = readHtml(editor)
  // Loading a saved article is not something an editor can undo into an empty page.
  editor.history.clear()
  refreshState(editor)
}

function onReady(editor: QuillInstance) {
  quill = editor
  const root = editor.root
  root.setAttribute('dir', 'rtl')
  root.setAttribute('role', 'textbox')
  root.setAttribute('aria-multiline', 'true')
  root.setAttribute('aria-label', label)
  if (describedBy) root.setAttribute('aria-describedby', describedBy)
  // Headings the site does not use are mapped to its three levels when pasted.
  for (const [tag, level] of [['H1', 2], ['H5', 4], ['H6', 4]] as const) {
    editor.clipboard.addMatcher(tag, (_node, delta) => delta.compose(new Delta().retain(delta.length(), { header: level })))
  }
  // A pasted picture would arrive as a data: URL or a hotlink. Pictures are inserted through the upload instead.
  editor.clipboard.addMatcher('IMG', () => new Delta())
  setFromHtml(editor, model.value)
}

function onChange(source: string) {
  if (!quill || source === 'silent') return
  lastHtml = readHtml(quill)
  model.value = lastHtml
  refreshState(quill)
}

// An article that finishes loading after the editor appeared must show up, without echoing the editor's own changes back.
watch(model, (value) => {
  if (quill && value !== lastHtml) setFromHtml(quill, value)
})
watch(() => invalid, (value) => quill?.root.setAttribute('aria-invalid', String(value)))
onBeforeUnmount(() => { quill = undefined })

const isOn = (name: string, value?: unknown) => value === undefined ? Boolean(format.value[name]) : format.value[name] === value

function toggle(name: string, value: unknown = true) {
  if (!quill) return
  quill.focus()
  quill.format(name, format.value[name] === value ? false : value, 'user')
  refreshState(quill)
}

function setHeading(event: Event) {
  if (!quill) return
  const value = Number((event.target as HTMLSelectElement).value)
  quill.focus()
  quill.format('header', value || false, 'user')
  refreshState(quill)
}

function setAlign(value: 'center' | 'justify' | false) {
  if (!quill) return
  quill.focus()
  quill.format('align', value, 'user')
  refreshState(quill)
}

function setDirection(value: 'rtl' | 'ltr') {
  if (!quill) return
  quill.focus()
  quill.format('direction', value, 'user')
  refreshState(quill)
}

function indent(delta: 1 | -1) {
  if (!quill) return
  quill.focus()
  const current = Number(format.value.indent ?? 0)
  quill.format('indent', Math.min(8, Math.max(0, current + delta)) || false, 'user')
  refreshState(quill)
}

function clearFormatting() {
  const range = quill?.getSelection(true)
  if (!quill || !range) return
  if (range.length === 0) quill.removeFormat(range.index, 1, 'user')
  else quill.removeFormat(range.index, range.length, 'user')
  refreshState(quill)
}

function undo() { quill?.history.undo(); if (quill) refreshState(quill) }
function redo() { quill?.history.redo(); if (quill) refreshState(quill) }

function openLink() {
  if (!quill) return
  linkRange = quill.getSelection(true)
  linkValue.value = typeof format.value.link === 'string' ? format.value.link : ''
  notice.value = ''
  linkOpen.value = true
  void nextTick(() => linkInput.value?.focus())
}

function applyLink() {
  if (!quill || !linkRange) return
  let href = linkValue.value.trim()
  // "example.com" is what editors type; make it a real link rather than a path on this site.
  if (href && !/^([a-z][a-z\d+.-]*:|\/|#)/i.test(href)) href = `https://${href}`
  if (href && !isSafeLink(href)) {
    notice.value = 'الرابط غير صالح. استخدم رابطًا يبدأ بـ https:// أو mailto: أو tel:.'
    return
  }
  closeLink()
  quill.setSelection(linkRange.index, linkRange.length, 'silent')
  if (href) {
    if (linkRange.length === 0) quill.insertText(linkRange.index, href, { link: href }, 'user')
    else quill.format('link', href, 'user')
  }
  else quill.format('link', false, 'user')
  refreshState(quill)
}

function closeLink() {
  linkOpen.value = false
  notice.value = ''
}

function pickImage() {
  if (!quill || busy.value) return
  linkRange = quill.getSelection(true)
  fileInput.value?.click()
}

async function onImagePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const files = [...(input.files ?? [])]
  input.value = ''
  await insertImages(files, linkRange?.index ?? quill?.getLength() ?? 0)
}

// Uploads go through the same validated, admin-only path as every other picture on the site; the editor stores the returned URL.
async function insertImages(files: File[], at: number) {
  const editor = quill
  if (!editor || busy.value) return
  busy.value = true
  notice.value = ''
  let index = at
  try {
    for (const file of files) {
      const problem = validateMediaFile('image', file) ?? validateImageDimensions(await readImageSize(file))
      if (problem) throw new AdminError(problem)
      notice.value = 'جارٍ رفع الصورة…'
      const url = await (await useAdminRepository()).uploadMedia('image', file)
      const alt = window.prompt('وصف الصورة لمن لا يراها (اختياري):', '') ?? ''
      editor.insertEmbed(index, 'image', url, 'user')
      if (alt.trim()) editor.formatText(index, 1, { alt: alt.trim() }, 'user')
      index += 1
      editor.setSelection(index, 0, 'silent')
    }
    notice.value = ''
  }
  catch (caught) {
    notice.value = caught instanceof AdminError ? caught.message : 'تعذر رفع الصورة. حاول مرة أخرى.'
  }
  finally {
    busy.value = false
  }
}
</script>

<template>
  <div class="rte" :class="{ 'rte--invalid': invalid }" data-testid="rich-text-editor">
    <div class="rte__bar">
      <div class="rte__modes" role="group" aria-label="وضع العرض">
        <button type="button" class="rte__mode" :aria-pressed="mode === 'edit'" @click="mode = 'edit'"><Pencil :size="16" aria-hidden="true" /> تحرير</button>
        <button type="button" class="rte__mode" :aria-pressed="mode === 'preview'" data-testid="rte-preview" @click="mode = 'preview'"><Eye :size="16" aria-hidden="true" /> معاينة</button>
      </div>
      <div v-show="mode === 'edit'" class="rte__toolbar" role="toolbar" aria-label="أدوات تنسيق النص">
        <select class="rte__select" aria-label="نمط الفقرة" :value="String(format.header ?? 0)" @change="setHeading">
          <option value="0">فقرة عادية</option>
          <option value="2">عنوان رئيسي (H2)</option>
          <option value="3">عنوان فرعي (H3)</option>
          <option value="4">عنوان صغير (H4)</option>
        </select>
        <span class="rte__group" role="group" aria-label="الخط">
          <button type="button" class="rte__btn" title="عريض" aria-label="عريض" :aria-pressed="isOn('bold')" @click="toggle('bold')"><Bold :size="18" aria-hidden="true" /></button>
          <button type="button" class="rte__btn" title="مائل" aria-label="مائل" :aria-pressed="isOn('italic')" @click="toggle('italic')"><Italic :size="18" aria-hidden="true" /></button>
          <button type="button" class="rte__btn" title="تسطير" aria-label="تسطير" :aria-pressed="isOn('underline')" @click="toggle('underline')"><Underline :size="18" aria-hidden="true" /></button>
        </span>
        <span class="rte__group" role="group" aria-label="القوائم والاقتباس">
          <button type="button" class="rte__btn" title="قائمة نقطية" aria-label="قائمة نقطية" :aria-pressed="isOn('list', 'bullet')" @click="toggle('list', 'bullet')"><List :size="18" aria-hidden="true" /></button>
          <button type="button" class="rte__btn" title="قائمة مرقمة" aria-label="قائمة مرقمة" :aria-pressed="isOn('list', 'ordered')" @click="toggle('list', 'ordered')"><ListOrdered :size="18" aria-hidden="true" /></button>
          <button type="button" class="rte__btn" title="اقتباس" aria-label="اقتباس" :aria-pressed="isOn('blockquote')" @click="toggle('blockquote')"><Quote :size="18" aria-hidden="true" /></button>
        </span>
        <span class="rte__group" role="group" aria-label="المحاذاة والاتجاه">
          <button type="button" class="rte__btn" title="محاذاة للبداية" aria-label="محاذاة للبداية" :aria-pressed="!format.align" @click="setAlign(false)"><AlignRight :size="18" aria-hidden="true" /></button>
          <button type="button" class="rte__btn" title="توسيط" aria-label="توسيط" :aria-pressed="isOn('align', 'center')" @click="setAlign('center')"><AlignCenter :size="18" aria-hidden="true" /></button>
          <button type="button" class="rte__btn" title="ضبط" aria-label="ضبط" :aria-pressed="isOn('align', 'justify')" @click="setAlign('justify')"><AlignJustify :size="18" aria-hidden="true" /></button>
          <button type="button" class="rte__btn rte__btn--text" title="اتجاه من اليمين إلى اليسار" aria-label="اتجاه من اليمين إلى اليسار" :aria-pressed="format.direction !== 'ltr'" @click="setDirection('rtl')">RTL</button>
          <button type="button" class="rte__btn rte__btn--text" title="اتجاه من اليسار إلى اليمين" aria-label="اتجاه من اليسار إلى اليمين" :aria-pressed="format.direction === 'ltr'" @click="setDirection('ltr')">LTR</button>
        </span>
        <span class="rte__group" role="group" aria-label="إزاحة">
          <button type="button" class="rte__btn" title="زيادة الإزاحة" aria-label="زيادة الإزاحة" @click="indent(1)"><IndentIncrease :size="18" aria-hidden="true" /></button>
          <button type="button" class="rte__btn" title="تقليل الإزاحة" aria-label="تقليل الإزاحة" @click="indent(-1)"><IndentDecrease :size="18" aria-hidden="true" /></button>
        </span>
        <span class="rte__group" role="group" aria-label="إدراج">
          <button type="button" class="rte__btn" title="رابط" aria-label="رابط" :aria-pressed="isOn('link')" @click="openLink"><LinkIcon :size="18" aria-hidden="true" /></button>
          <button type="button" class="rte__btn" title="إدراج صورة" aria-label="إدراج صورة" :disabled="busy" data-testid="rte-image" @click="pickImage"><ImageIcon :size="18" aria-hidden="true" /></button>
          <button type="button" class="rte__btn" title="مسح التنسيق" aria-label="مسح التنسيق" @click="clearFormatting"><RemoveFormatting :size="18" aria-hidden="true" /></button>
        </span>
        <span class="rte__group" role="group" aria-label="تراجع">
          <button type="button" class="rte__btn" title="تراجع" aria-label="تراجع" :disabled="!history.undo" @click="undo"><Undo2 :size="18" aria-hidden="true" /></button>
          <button type="button" class="rte__btn" title="إعادة" aria-label="إعادة" :disabled="!history.redo" @click="redo"><Redo2 :size="18" aria-hidden="true" /></button>
        </span>
      </div>
    </div>

    <form v-if="linkOpen && mode === 'edit'" class="rte__link" @submit.prevent="applyLink" @keydown.esc="closeLink">
      <label for="rte-link-input">عنوان الرابط</label>
      <input id="rte-link-input" ref="linkInput" v-model="linkValue" dir="ltr" type="text" inputmode="url" placeholder="https://example.com">
      <button type="submit" class="admin-button admin-button--primary">تطبيق</button>
      <button type="button" class="admin-button admin-button--ghost" @click="closeLink">إلغاء</button>
    </form>
    <input ref="fileInput" class="sr-only" type="file" :accept="acceptAttribute('image')" tabindex="-1" aria-hidden="true" @change="onImagePicked">
    <p v-if="notice" class="rte__notice" :role="busy ? 'status' : 'alert'">{{ notice }}</p>

    <div v-show="mode === 'edit'" class="rte__surface">
      <p v-if="!ready" class="rte__loading" role="status">جارٍ تحميل المحرّر…</p>
      <QuillEditor v-else theme="" :options="options" content-type="delta" @ready="onReady" @text-change="onChange($event.source)" @selection-change="quill && refreshState(quill)" />
    </div>
    <div v-if="mode === 'preview'" class="rte__preview reading-body" data-testid="rte-preview-pane">
      <RichTextContent v-if="preview" :html="preview" />
      <p v-else class="admin-muted">لا يوجد نص لمعاينته بعد.</p>
    </div>
  </div>
</template>

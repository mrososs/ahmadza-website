<script setup lang="ts">
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from '@lucide/vue'

// Read-only by design: the file is drawn onto a canvas and the page offers no save, print or open-in-tab control.
const { src, title } = defineProps<{ src: string; title: string }>()

const stage = useTemplateRef<HTMLElement>('stage')
const canvas = useTemplateRef<HTMLCanvasElement>('canvas')
const { status, page, pageCount, progress, canGoPrevious, canGoNext, canZoomIn, canZoomOut, goTo, next, previous, zoomIn, zoomOut } = usePdfReader({ url: () => src, canvas, stage })

const stageLabel = computed(() => status.value === 'ready' ? `صفحة ${page.value} من ${pageCount.value}` : 'قارئ الكتاب')

function jump(event: Event) {
  const input = event.target as HTMLInputElement
  goTo(Number(input.value))
  // The number may have been clamped or rejected, so show the page that is actually open.
  input.value = String(page.value)
}

/** Arabic books turn leftwards: left arrow is the next page. Only when the page is not wider than the stage, so a zoomed page can still scroll sideways. */
function onKeydown(event: KeyboardEvent) {
  const element = event.currentTarget as HTMLElement
  if (event.altKey || event.ctrlKey || event.metaKey || element.scrollWidth > element.clientWidth + 1) return
  if (event.key === 'ArrowLeft') next()
  else if (event.key === 'ArrowRight') previous()
  else if (event.key === 'Home') goTo(1)
  else if (event.key === 'End') goTo(pageCount.value)
  else return
  event.preventDefault()
}
</script>

<template>
  <div class="book-reader">
    <div class="book-reader__toolbar" role="toolbar" aria-label="أدوات القراءة">
      <button type="button" :disabled="!canGoPrevious" @click="previous">
        <ChevronRight :size="20" aria-hidden="true" />
        <span class="book-reader__label">السابقة</span>
      </button>
      <div class="book-reader__group">
        <label for="book-reader-page">الصفحة</label>
        <input id="book-reader-page" type="number" inputmode="numeric" min="1" :max="pageCount || undefined" :value="page" :disabled="status !== 'ready'" @change="jump">
        <span>من {{ pageCount }}</span>
      </div>
      <button type="button" :disabled="!canGoNext" @click="next">
        <span class="book-reader__label">التالية</span>
        <ChevronLeft :size="20" aria-hidden="true" />
      </button>
      <div class="book-reader__group">
        <button type="button" aria-label="تصغير الصفحة" :disabled="!canZoomOut" @click="zoomOut"><ZoomOut :size="20" aria-hidden="true" /></button>
        <button type="button" aria-label="تكبير الصفحة" :disabled="!canZoomIn" @click="zoomIn"><ZoomIn :size="20" aria-hidden="true" /></button>
      </div>
    </div>

    <div ref="stage" class="book-reader__stage" role="region" tabindex="0" :aria-label="stageLabel" @keydown="onKeydown" @contextmenu.prevent>
      <canvas v-show="status === 'ready'" ref="canvas" role="img" :aria-label="`صفحة ${page} من كتاب ${title}`" @dragstart.prevent />
      <div v-if="status === 'loading'" class="book-reader__state" role="status">
        جارٍ تحميل الكتاب<template v-if="progress !== null"> {{ progress }}%</template>…
      </div>
      <div v-else-if="status === 'error'" class="book-reader__state" role="alert">تعذر تحميل الكتاب. حدّث الصفحة وحاول مرة أخرى.</div>
    </div>
    <span class="sr-only" aria-live="polite">{{ status === 'ready' ? stageLabel : '' }}</span>
  </div>
</template>

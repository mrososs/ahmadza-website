import type { OnProgressParameters, PDFDocumentLoadingTask, PDFDocumentProxy, RenderTask } from 'pdfjs-dist'

export type PdfReaderStatus = 'loading' | 'ready' | 'error'

interface PdfReaderOptions {
  url: MaybeRefOrGetter<string>
  canvas: Readonly<Ref<HTMLCanvasElement | null>>
  stage: Readonly<Ref<HTMLElement | null>>
}

/** Zoom steps relative to fit-to-width; 1 keeps a whole page width visible. */
const ZOOM_STEPS = [1, 1.25, 1.5, 2] as const
/** Browsers refuse canvases far past this size, so very large pages are drawn at a lower pixel density. */
const MAX_CANVAS_PIXELS = 16 * 1024 * 1024
const RESIZE_DEBOUNCE_MS = 150
/** A page stretched across a wide desktop stage is too large to read comfortably, so "fit" stops at this width (CSS px); zoom goes beyond it. */
const MAX_FIT_WIDTH = 900

function isCancelled(error: unknown): boolean {
  return error instanceof Error && error.name === 'RenderingCancelledException'
}

/**
 * Draws one page of a PDF at a time onto a canvas. The file is never handed to the browser's own PDF viewer,
 * so no save, print or open-in-tab control exists. Client-only: call it from a component that renders after hydration.
 */
export function usePdfReader({ url, canvas, stage }: PdfReaderOptions) {
  const status = shallowRef<PdfReaderStatus>('loading')
  const pageCount = shallowRef(0)
  const page = shallowRef(1)
  const zoomIndex = shallowRef(0)
  const progress = shallowRef<number | null>(null)

  let loadingTask: PDFDocumentLoadingTask | undefined
  let pdf: PDFDocumentProxy | undefined
  let renderTask: RenderTask | undefined
  /** Bumped whenever the document is replaced or closed so late async results are dropped. */
  let documentToken = 0
  /** Bumped for every draw so only the newest page/zoom/size request reaches the canvas. */
  let drawToken = 0
  let drawnWidth = 0
  let resizeTimer: number | undefined

  const canGoPrevious = computed(() => status.value === 'ready' && page.value > 1)
  const canGoNext = computed(() => status.value === 'ready' && page.value < pageCount.value)
  const canZoomOut = computed(() => status.value === 'ready' && zoomIndex.value > 0)
  const canZoomIn = computed(() => status.value === 'ready' && zoomIndex.value < ZOOM_STEPS.length - 1)

  function close() {
    documentToken += 1
    drawToken += 1
    renderTask?.cancel()
    renderTask = undefined
    const task = loadingTask
    loadingTask = undefined
    pdf = undefined
    void task?.destroy()
  }

  async function open(source: string) {
    close()
    const token = documentToken
    status.value = 'loading'
    progress.value = null
    pageCount.value = 0
    page.value = 1
    zoomIndex.value = 0

    try {
      const [pdfjs, worker] = await Promise.all([import('pdfjs-dist'), import('pdfjs-dist/build/pdf.worker.min.mjs?url')])
      if (token !== documentToken) return
      pdfjs.GlobalWorkerOptions.workerSrc = worker.default

      // Decoders for scanned books (JBIG2/JPEG 2000), CMaps and standard fonts are self-hosted under a versioned path, see nuxt.config.ts.
      const assets = `/_pdfjs/${pdfjs.version}`
      const task = pdfjs.getDocument({
        url: source,
        cMapUrl: `${assets}/cmaps/`,
        standardFontDataUrl: `${assets}/standard_fonts/`,
        wasmUrl: `${assets}/wasm/`,
        iccUrl: `${assets}/iccs/`,
        enableXfa: false,
      })
      loadingTask = task
      task.onProgress = ({ loaded, total }: OnProgressParameters) => {
        if (token === documentToken && total > 0) progress.value = Math.min(100, Math.round((loaded / total) * 100))
      }

      const loaded = await task.promise
      if (token !== documentToken) return
      pdf = loaded
      pageCount.value = loaded.numPages
      status.value = 'ready'
      await nextTick()
      await draw()
    }
    catch {
      if (token === documentToken) status.value = 'error'
    }
  }

  async function draw() {
    const doc = pdf
    const target = canvas.value
    const container = stage.value
    if (!doc || !target || !container || status.value !== 'ready') return

    const token = ++drawToken
    const inFlight = renderTask
    if (inFlight) {
      inFlight.cancel()
      // A canvas cannot serve two render operations at once, so wait for the cancelled one to settle.
      await inFlight.promise.catch(() => undefined)
      if (token !== drawToken) return
    }

    try {
      const pdfPage = await doc.getPage(page.value)
      if (token !== drawToken) return

      const available = Math.min(Math.max(container.clientWidth, 1), MAX_FIT_WIDTH)
      const fitScale = available / pdfPage.getViewport({ scale: 1 }).width
      const cssViewport = pdfPage.getViewport({ scale: fitScale * (ZOOM_STEPS[zoomIndex.value] ?? 1) })
      const density = Math.min(window.devicePixelRatio || 1, 2, Math.sqrt(MAX_CANVAS_PIXELS / (cssViewport.width * cssViewport.height)))
      const viewport = pdfPage.getViewport({ scale: cssViewport.scale * density })

      target.width = Math.floor(viewport.width)
      target.height = Math.floor(viewport.height)
      target.style.inlineSize = `${Math.floor(cssViewport.width)}px`
      target.style.blockSize = `${Math.floor(cssViewport.height)}px`
      drawnWidth = container.clientWidth

      const task = pdfPage.render({ canvas: target, viewport })
      renderTask = task
      try {
        await task.promise
      }
      finally {
        if (renderTask === task) renderTask = undefined
      }
    }
    catch (error) {
      if (isCancelled(error) || token !== drawToken) return
      status.value = 'error'
    }
  }

  function goTo(target: number) {
    if (status.value !== 'ready' || !Number.isFinite(target)) return
    const next = Math.min(Math.max(Math.trunc(target), 1), pageCount.value)
    if (next === page.value) return
    page.value = next
    stage.value?.scrollTo({ top: 0 })
    void draw()
  }

  function setZoom(index: number) {
    if (status.value !== 'ready' || index < 0 || index >= ZOOM_STEPS.length || index === zoomIndex.value) return
    zoomIndex.value = index
    void draw()
  }

  const next = () => goTo(page.value + 1)
  const previous = () => goTo(page.value - 1)
  const zoomIn = () => setZoom(zoomIndex.value + 1)
  const zoomOut = () => setZoom(zoomIndex.value - 1)

  let resizeObserver: ResizeObserver | undefined

  onMounted(() => {
    watch(() => toValue(url), source => void open(source), { immediate: true })

    const container = stage.value
    if (!container) return
    drawnWidth = container.clientWidth
    // Redraw at the new width when the layout changes (rotation, window resize), but not for height-only changes.
    resizeObserver = new ResizeObserver(() => {
      if (Math.abs(container.clientWidth - drawnWidth) < 2) return
      window.clearTimeout(resizeTimer)
      resizeTimer = window.setTimeout(() => void draw(), RESIZE_DEBOUNCE_MS)
    })
    resizeObserver.observe(container)
  })

  onBeforeUnmount(() => {
    resizeObserver?.disconnect()
    window.clearTimeout(resizeTimer)
    close()
  })

  return { status, page, pageCount, progress, canGoPrevious, canGoNext, canZoomIn, canZoomOut, goTo, next, previous, zoomIn, zoomOut }
}

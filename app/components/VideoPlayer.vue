<script setup lang="ts">
import { Download, ExternalLink, RefreshCw, TriangleAlert } from '@lucide/vue'
import { youtubeEmbedOrigin, youtubeEmbedUrl, youtubeWatchUrl } from '~/utils/youtube'

/**
 * Plays one video: a YouTube embed, or a file from private storage through a short-lived URL.
 * Public pages pass `slug` (the URL is requested from the site's own endpoint on the visitor's device); the admin preview passes `src`.
 */
const { title, youtubeId, slug, src, poster, downloadHref } = defineProps<{
  title: string
  youtubeId?: string | undefined
  slug?: string | undefined
  src?: string | undefined
  poster?: string | undefined
  downloadHref?: string | undefined
}>()

type PlayerState = 'loading' | 'ready' | 'error' | 'embed-blocked'

const origin = useRequestURL().origin
const state = shallowRef<PlayerState>('loading')
const fileUrl = shallowRef(src)
const refreshed = shallowRef(false)

const frame = useTemplateRef<HTMLIFrameElement>('frame')
const embedUrl = computed(() => youtubeId ? youtubeEmbedUrl(youtubeId, origin) : '')

async function loadFile() {
  if (src || !slug) return
  state.value = 'loading'
  try {
    const result = await $fetch<{ url: string }>(`/api/videos/${slug}/playback`)
    fileUrl.value = result.url
  }
  catch {
    state.value = 'error'
  }
}

// A signed URL expires, so one failed load is retried with a fresh URL before the visitor sees an error.
async function onFileError() {
  if (!refreshed.value && slug && !src) {
    refreshed.value = true
    await loadFile()
    return
  }
  state.value = 'error'
}

function retry() {
  refreshed.value = false
  state.value = 'loading'
  if (youtubeId) frame.value?.contentWindow?.location.replace(embedUrl.value)
  else void loadFile()
}

// YouTube reports "embedding not allowed" (101/150) and "removed or private" (100) from inside the iframe, where the page cannot look.
function listen() {
  frame.value?.contentWindow?.postMessage(JSON.stringify({ event: 'listening', id: 1, channel: 'widget' }), youtubeEmbedOrigin)
}
function onMessage(event: MessageEvent) {
  if (event.origin !== youtubeEmbedOrigin || event.source !== frame.value?.contentWindow || typeof event.data !== 'string') return
  try {
    const message = JSON.parse(event.data) as { event?: string; info?: unknown }
    if (message.event === 'onError') state.value = 'embed-blocked'
  }
  catch { /* not a player message */ }
}

// The preview follows the file the editor just uploaded.
watch(() => src, (value) => { fileUrl.value = value; state.value = value ? 'loading' : state.value })

let settleTimer: ReturnType<typeof setTimeout> | undefined
onMounted(() => {
  if (youtubeId) {
    window.addEventListener('message', onMessage)
    // An iframe that finished loading before hydration never fires the Vue load handler, so the spinner must not wait for it forever.
    settleTimer = setTimeout(() => { if (state.value === 'loading') state.value = 'ready' }, 4000)
  }
  else void loadFile()
})
onBeforeUnmount(() => {
  window.removeEventListener('message', onMessage)
  clearTimeout(settleTimer)
})
</script>

<template>
  <div class="video-player" :data-state="state">
    <div class="video-player__frame">
      <template v-if="youtubeId">
        <iframe
          v-show="state !== 'embed-blocked'"
          ref="frame"
          :src="embedUrl"
          :title="title"
          loading="lazy"
          referrerpolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
          @load="state = state === 'embed-blocked' ? state : 'ready'; listen()"
        />
      </template>
      <video
        v-else-if="fileUrl && state !== 'error'"
        controls
        playsinline
        preload="metadata"
        :poster="poster"
        :src="fileUrl"
        :aria-label="title"
        @loadedmetadata="state = 'ready'"
        @error="onFileError"
      >
        متصفحك لا يدعم تشغيل هذا الفيديو.
      </video>

      <p v-if="state === 'loading'" class="video-player__status" role="status">جارٍ تحميل الفيديو…</p>

      <div v-if="state === 'embed-blocked'" class="video-player__problem" role="alert">
        <TriangleAlert :size="30" aria-hidden="true" />
        <p>لا يسمح مالك هذا الفيديو بتشغيله خارج يوتيوب، أو أنه لم يعد متاحًا.</p>
        <a v-if="youtubeId" class="button-primary" :href="youtubeWatchUrl(youtubeId)" target="_blank" rel="noopener noreferrer">
          <ExternalLink :size="18" aria-hidden="true" /> شاهده على يوتيوب
        </a>
      </div>
      <div v-else-if="state === 'error'" class="video-player__problem" role="alert">
        <TriangleAlert :size="30" aria-hidden="true" />
        <p>تعذر تشغيل الفيديو. تحقق من اتصالك أو جرّب مرة أخرى.</p>
        <button type="button" class="button-primary" @click="retry"><RefreshCw :size="18" aria-hidden="true" /> إعادة المحاولة</button>
      </div>
    </div>

    <div v-if="downloadHref" class="video-player__actions">
      <a class="button-primary" :href="downloadHref" download><Download :size="18" aria-hidden="true" /> تنزيل الفيديو</a>
    </div>
  </div>
</template>

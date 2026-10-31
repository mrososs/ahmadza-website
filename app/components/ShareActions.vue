<script setup lang="ts">
import { Check, Copy, Share2 } from '@lucide/vue'

const { title } = defineProps<{ title: string }>()
const copied = shallowRef(false)

async function copyLink() {
  try {
    await navigator.clipboard.writeText(window.location.href)
  }
  catch {
    const textarea = document.createElement('textarea')
    textarea.value = window.location.href
    textarea.style.position = 'fixed'
    textarea.style.opacity = '0'
    document.body.append(textarea)
    textarea.select()
    document.execCommand('copy')
    textarea.remove()
  }
  copied.value = true
  window.setTimeout(() => { copied.value = false }, 2200)
}

async function share() {
  if (navigator.share) await navigator.share({ title, url: window.location.href })
  else await copyLink()
}
</script>

<template>
  <div class="share-actions" aria-label="مشاركة المحتوى">
    <button type="button" @click="share"><Share2 :size="18" aria-hidden="true" /> مشاركة</button>
    <button type="button" @click="copyLink">
      <Check v-if="copied" :size="18" aria-hidden="true" />
      <Copy v-else :size="18" aria-hidden="true" />
      {{ copied ? 'نُسخ الرابط' : 'نسخ الرابط' }}
    </button>
    <span class="sr-only" aria-live="polite">{{ copied ? 'تم نسخ رابط الصفحة' : '' }}</span>
  </div>
</template>

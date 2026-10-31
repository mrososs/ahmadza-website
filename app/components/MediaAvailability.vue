<script setup lang="ts">
import { FileQuestion, Headphones, Play } from '@lucide/vue'
import type { AudioContent, BookContent, VideoContent } from '~/types/content'
import { formatDuration } from '~/utils/format'

const { item } = defineProps<{ item: AudioContent | BookContent | VideoContent }>()
</script>

<template>
  <section class="media-availability" aria-label="الوسائط">
    <template v-if="item.type === 'audio'">
      <Headphones :size="28" aria-hidden="true" />
      <div>
        <h2>الاستماع</h2>
        <p>{{ formatDuration(item.durationSeconds) }}</p>
      </div>
      <audio v-if="item.audioUrl" class="w-full" controls preload="metadata" :src="item.audioUrl">
        متصفحك لا يدعم تشغيل الصوت.
      </audio>
      <p v-else class="media-availability__empty">لم يُرفق ملف صوتي بهذا النموذج التجريبي.</p>
    </template>

    <template v-else-if="item.type === 'book'">
      <FileQuestion :size="28" aria-hidden="true" />
      <div>
        <h2>نسخة الكتاب</h2>
        <p v-if="item.pageCount">{{ item.pageCount }} صفحة</p>
      </div>
      <a v-if="item.pdfUrl && item.downloadAllowed" class="button-primary" :href="item.pdfUrl" download>تنزيل PDF</a>
      <p v-else class="media-availability__empty">لا يتوفر ملف PDF موثوق لهذا النموذج، لذلك لم نعرض زر تنزيل.</p>
    </template>

    <template v-else>
      <div v-if="item.youtubeId" class="video-embed">
        <iframe
          :src="`https://www.youtube-nocookie.com/embed/${item.youtubeId}`"
          :title="item.title"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowfullscreen
        />
      </div>
      <template v-else>
        <Play :size="28" aria-hidden="true" />
        <div><h2>المشاهدة</h2><p>{{ formatDuration(item.durationSeconds) }}</p></div>
        <p class="media-availability__empty">لا يوجد رابط فيديو موثوق في البيانات التجريبية.</p>
      </template>
    </template>
  </section>
</template>

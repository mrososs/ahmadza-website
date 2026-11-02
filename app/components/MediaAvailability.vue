<script setup lang="ts">
import { FileQuestion, Headphones, Play } from '@lucide/vue'
import type { AudioContent, BookContent, VideoContent } from '~/types/content'
import { formatDuration } from '~/utils/format'

const { item } = defineProps<{ item: AudioContent | BookContent | VideoContent }>()
const isDemo = useIsDemoContent()
const isReading = shallowRef(false)
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
      <p v-else class="media-availability__empty">{{ isDemo ? "لم يُرفق ملف صوتي بهذا النموذج التجريبي." : "لم يُرفق ملف صوتي بهذه المادة بعد." }}</p>
    </template>

    <template v-else-if="item.type === 'book'">
      <FileQuestion :size="28" aria-hidden="true" />
      <div>
        <h2>نسخة الكتاب</h2>
        <p v-if="item.pageCount">{{ item.pageCount }} صفحة</p>
        <p v-if="item.pdfUrl">متاح للقراءة على الموقع فقط.</p>
      </div>
      <template v-if="item.pdfUrl">
        <div class="media-availability__actions">
          <button type="button" class="button-primary" :aria-expanded="isReading" aria-controls="book-reader" @click="isReading = !isReading">
            {{ isReading ? 'إخفاء الكتاب' : 'قراءة الكتاب' }}
          </button>
        </div>
        <BookReader v-if="isReading" id="book-reader" :src="item.pdfUrl" :title="item.title" />
      </template>
      <p v-else class="media-availability__empty">{{ isDemo ? "لا يتوفر ملف PDF موثوق لهذا النموذج، لذلك لم نعرض قارئًا." : "لا يتوفر ملف PDF لهذه المادة حاليًا." }}</p>
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
        <p class="media-availability__empty">{{ isDemo ? "لا يوجد رابط فيديو موثوق في البيانات التجريبية." : "لا يوجد رابط فيديو لهذه المادة بعد." }}</p>
      </template>
    </template>
  </section>
</template>

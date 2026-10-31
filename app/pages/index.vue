<script setup lang="ts">
import { ArrowLeft, BookOpen, Headphones, Library, Play, Search, Sparkles } from '@lucide/vue'
import type { ContentItem, ContentListResult, ContentType } from '~/types/content'
import { contentTypeRoutes } from '~/types/content'
import { formatArabicDate, formatDuration } from '~/utils/format'

const { data } = await useAsyncData('homepage-content', () => $fetch<ContentListResult>('/api/content', { query: { limit: 50 } }))
const items = computed(() => data.value?.items || [])
const featuredArticle = computed(() => items.value.find(item => item.type === 'article' && item.featured))
const latest = computed(() => items.value.slice(0, 5))
const books = computed(() => items.value.filter(item => item.type === 'book').slice(0, 3))
const audio = computed(() => items.value.filter(item => item.type === 'audio').slice(0, 3))
const sermons = computed(() => items.value.filter(item => item.type === 'sermon').slice(0, 3))
const benefit = computed(() => items.value.find(item => item.type === 'benefit' && item.featured))
const videos = computed(() => items.value.filter(item => item.type === 'video').slice(0, 2))
const query = shallowRef('')

const categories: Array<{ type: ContentType; label: string; description: string; mark: string }> = [
  { type: 'article', label: 'المقالات', description: 'قراءات ودراسات ونصوص مطوّلة', mark: 'م' },
  { type: 'book', label: 'الكتب', description: 'مؤلفات وإصدارات وملفات موثوقة', mark: 'ك' },
  { type: 'sermon', label: 'الخطب', description: 'نصوص مرتبة لتجربة قراءة مريحة', mark: 'خ' },
  { type: 'audio', label: 'الصوتيات', description: 'دروس ومحاضرات وتسجيلات', mark: 'ص' },
  { type: 'benefit', label: 'الفوائد', description: 'نصوص قصيرة واضحة الأثر', mark: 'ف' },
  { type: 'video', label: 'المرئيات', description: 'دليل المقاطع والمحاضرات المصوّرة', mark: 'ر' },
]

function submitSearch() {
  navigateTo({ path: '/search', query: query.value.trim() ? { q: query.value.trim() } : {} })
}

function itemPath(item: ContentItem) {
  return item.type === 'video' ? '/videos' : `${contentTypeRoutes[item.type]}/${item.slug}`
}

usePageSeo({
  title: 'المكتبة الرقمية',
  description: 'مكتبة عربية تجمع المقالات والكتب والخطب والصوتيات والفوائد والمرئيات في تجربة قراءة هادئة.',
  path: '/',
})
</script>

<template>
  <div>
    <section class="home-hero">
      <div class="home-hero__folio" aria-hidden="true"><span>أ</span><small>دفتر<br>المعرفة</small></div>
      <div class="site-container home-hero__grid">
        <div class="home-hero__copy">
          <h1>معرفةٌ تُقرأ<br><em>على مهل.</em></h1>
          <p>مكتبة عربية رقمية تجمع الكلمة المكتوبة والصوت والصورة في فهرس واضح، وتجربة هادئة تضع المحتوى في مكانه الأول.</p>
          <form class="hero-search" role="search" method="get" action="/search" @submit.prevent="submitSearch">
            <Search :size="22" aria-hidden="true" />
            <label class="sr-only" for="hero-search">ابحث في المكتبة</label>
            <input id="hero-search" v-model="query" name="q" type="search" placeholder="عن أي موضوع تبحث؟">
            <button type="submit">افتح الفهرس</button>
          </form>
          <p class="home-hero__note">النسخة الحالية تعرض محتوى تجريبيًا واضحًا إلى حين استلام مواد العميل.</p>
        </div>
        <div class="home-hero__index" aria-label="أقسام المكتبة">
          <NuxtLink v-for="category in categories" :key="category.type" :to="contentTypeRoutes[category.type]">
            <span>{{ category.mark }}</span>
            <strong>{{ category.label }}</strong>
            <small>{{ category.description }}</small>
            <ArrowLeft :size="18" aria-hidden="true" />
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="author-intro">
      <div class="site-container author-intro__grid">
        <div class="author-monogram" aria-hidden="true"><span>أز</span></div>
        <div>
          <h2>مساحة المؤلف الرقمية</h2>
          <p>هذه الصفحة مهيأة لتقديم تعريف موثوق بالمؤلف ورسالته العلمية عند تزويد المشروع بالسيرة المعتمدة والصورة والبيانات. لا تعرض النسخة التجريبية أي مؤهل أو إنجاز غير موثّق.</p>
          <NuxtLink to="/about" class="text-link">عن الموقع والمؤلف <ArrowLeft :size="17" aria-hidden="true" /></NuxtLink>
        </div>
        <blockquote>«الأرشيف الجيد لا يحفظ المادة فحسب؛ بل يفتح للقارئ طريقًا واضحًا إليها.» <small>عبارة تصميمية تجريبية</small></blockquote>
      </div>
    </section>

    <section v-if="featuredArticle" class="featured-spread">
      <div class="site-container featured-spread__grid">
        <div class="featured-spread__number" aria-hidden="true">١</div>
        <div class="featured-spread__copy">
          <h2>{{ featuredArticle.title }}</h2>
          <p>{{ featuredArticle.excerpt }}</p>
          <div class="featured-spread__meta"><span class="label-mark">اختيار تحريري تجريبي</span><time :datetime="featuredArticle.publishedAt">{{ formatArabicDate(featuredArticle.publishedAt) }}</time><span>{{ featuredArticle.readingMinutes }} دقائق</span></div>
          <NuxtLink :to="itemPath(featuredArticle)" class="button-primary">ابدأ القراءة <ArrowLeft :size="17" aria-hidden="true" /></NuxtLink>
        </div>
        <div class="featured-spread__aside">
          <span>من هامش الفهرس</span>
          <p>تقدّم الصفحة المادة المميزة على هيئة انتشار تحريري واسع، ثم تنتقل إلى إيقاعات أكثر كثافة مع عمق التصفح.</p>
        </div>
      </div>
    </section>

    <section class="latest-ledger section-space">
      <div class="site-container">
        <div class="section-heading"><h2>أضيف حديثًا</h2><NuxtLink to="/search">كل المواد <ArrowLeft :size="16" aria-hidden="true" /></NuxtLink></div>
        <ol class="latest-ledger__list">
          <li v-for="(item, index) in latest" :key="item.id">
            <span class="latest-ledger__index">{{ String(index + 1).padStart(2, '0') }}</span>
            <div><small>{{ item.categories[0]?.name }}</small><h3><NuxtLink :to="itemPath(item)">{{ item.title }}</NuxtLink></h3></div>
            <time :datetime="item.publishedAt">{{ formatArabicDate(item.publishedAt) }}</time>
            <ArrowLeft :size="19" aria-hidden="true" />
          </li>
        </ol>
      </div>
    </section>

    <section v-if="books.length" class="books-shelf section-space">
      <div class="site-container books-shelf__layout">
        <div class="books-shelf__intro">
          <BookOpen :size="28" aria-hidden="true" />
          <h2>رفّ الكتب</h2>
          <p>إصدارات مرتبة ببيانات واضحة، مع إظهار المعاينة أو التنزيل فقط حين يتوفر ملف موثوق.</p>
          <NuxtLink to="/books" class="text-link">تصفّح المكتبة <ArrowLeft :size="17" aria-hidden="true" /></NuxtLink>
        </div>
        <div class="books-shelf__items">
          <NuxtLink v-for="(book, index) in books" :key="book.id" :to="itemPath(book)" class="shelf-book" :style="{ '--book-step': index }">
            <span>كتاب تجريبي</span><strong>{{ book.title }}</strong><small>{{ book.type === 'book' ? book.publicationYear : '' }}</small>
          </NuxtLink>
        </div>
      </div>
    </section>

    <section class="listening-room section-space">
      <div class="site-container listening-room__grid">
        <div class="listening-room__title"><Headphones :size="30" aria-hidden="true" /><h2>قاعة الاستماع</h2><p>فهرس صوتي واضح، لا يُظهر مشغلًا إلا عند وجود ملف صالح.</p></div>
        <div class="audio-register">
          <NuxtLink v-for="(entry, index) in audio" :key="entry.id" :to="itemPath(entry)">
            <span class="audio-register__play">{{ index + 1 }}</span>
            <div><strong>{{ entry.title }}</strong><small>{{ entry.categories[0]?.name }}</small></div>
            <time>{{ entry.type === 'audio' ? formatDuration(entry.durationSeconds) : '' }}</time>
            <ArrowLeft :size="18" aria-hidden="true" />
          </NuxtLink>
          <NuxtLink to="/audio" class="audio-register__all">كل الصوتيات</NuxtLink>
        </div>
      </div>
    </section>

    <section class="sermon-benefit section-space">
      <div class="site-container sermon-benefit__grid">
        <div>
          <div class="section-heading"><h2>مختارات من الخطب</h2><NuxtLink to="/sermons">جميع الخطب</NuxtLink></div>
          <article v-for="sermon in sermons" :key="sermon.id" class="sermon-row">
            <span>خطبة</span><div><h3><NuxtLink :to="itemPath(sermon)">{{ sermon.title }}</NuxtLink></h3><p>{{ sermon.excerpt }}</p></div><ArrowLeft :size="18" aria-hidden="true" />
          </article>
        </div>
        <aside v-if="benefit" class="benefit-slip">
          <Sparkles :size="24" aria-hidden="true" />
          <h2>{{ benefit.title }}</h2>
          <span>فائدة قصيرة</span>
          <p>{{ benefit.excerpt }}</p>
          <NuxtLink :to="itemPath(benefit)">اقرأ الفائدة <ArrowLeft :size="17" aria-hidden="true" /></NuxtLink>
        </aside>
      </div>
    </section>

    <section class="video-ledger section-space">
      <div class="site-container">
        <div class="section-heading section-heading--light"><h2>المرئيات</h2><NuxtLink to="/videos">دليل المرئيات</NuxtLink></div>
        <div class="video-ledger__grid">
          <article v-for="video in videos" :key="video.id">
            <div class="video-ledger__poster"><Play :size="38" aria-hidden="true" /><span>لا يوجد رابط موثوق</span></div>
            <div><small>{{ video.categories[0]?.name }}</small><h3>{{ video.title }}</h3><p>{{ video.excerpt }}</p></div>
          </article>
        </div>
      </div>
    </section>

    <section class="home-cta">
      <div class="site-container home-cta__grid">
        <Library :size="42" aria-hidden="true" />
        <div><h2>ابدأ من سؤال</h2><p>اكتب موضوعًا أو كلمة مفتاحية، ودع الفهرس يجمع لك المواد المتصلة من كل أقسام المكتبة.</p></div>
        <NuxtLink to="/search" class="button-light">البحث الموحّد <Search :size="18" aria-hidden="true" /></NuxtLink>
      </div>
    </section>
  </div>
</template>

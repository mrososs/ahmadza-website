<script setup lang="ts">
import { Clock3 } from '@lucide/vue'
import { contentTypeLabels, contentTypePluralLabels, contentTypeRoutes, type ContentDetailResult } from '~/types/content'
import { formatArabicDate } from '~/utils/format'

const { result } = defineProps<{ result: ContentDetailResult }>()
const item = computed(() => result.item)
const typeLabel = computed(() => contentTypeLabels[item.value.type])
const typePluralLabel = computed(() => contentTypePluralLabels[item.value.type])
const listingPath = computed(() => contentTypeRoutes[item.value.type])
const routePath = computed(() => `${listingPath.value}/${item.value.slug}`)
const isMedia = computed(() => ['book', 'audio', 'video'].includes(item.value.type))

usePageSeo({
  title: computed(() => item.value.seoTitle || item.value.title),
  description: computed(() => item.value.seoDescription || item.value.excerpt),
  path: routePath,
  type: item.value.type === 'book' ? 'book' : 'article',
})

useHead({
  script: [
    {
      type: 'application/ld+json',
      textContent: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': item.value.type === 'book' ? 'Book' : 'Article',
        headline: item.value.title,
        description: item.value.excerpt,
        datePublished: item.value.publishedAt,
        dateModified: item.value.updatedAt,
        inLanguage: 'ar',
      }),
    },
  ],
})
</script>

<template>
  <article class="detail-page" :class="`detail-page--${item.type}`">
    <div class="site-container">
      <Breadcrumbs :items="[{ label: typePluralLabel, to: listingPath }, { label: item.title }]" />
    </div>
    <header class="detail-hero">
      <div class="site-container detail-hero__grid">
        <div>
          <h1>{{ item.title }}</h1>
          <div class="detail-hero__kind"><span>{{ typeLabel }}</span><span v-if="result.source === 'demo'">محتوى تجريبي</span></div>
          <p>{{ item.excerpt }}</p>
        </div>
        <dl class="detail-meta">
          <div><dt>النشر</dt><dd><time :datetime="item.publishedAt">{{ formatArabicDate(item.publishedAt) }}</time></dd></div>
          <div v-if="item.readingMinutes"><dt>زمن القراءة</dt><dd><Clock3 :size="15" aria-hidden="true" /> {{ item.readingMinutes }} دقائق</dd></div>
          <div><dt>التصنيف</dt><dd>{{ item.categories.map(category => category.name).join('، ') }}</dd></div>
          <template v-if="item.type === 'book'">
            <div><dt>المؤلف</dt><dd>{{ item.authorLabel }}</dd></div>
            <div v-if="item.publicationYear"><dt>سنة النشر</dt><dd>{{ item.publicationYear }}</dd></div>
          </template>
        </dl>
      </div>
    </header>

    <div class="site-container detail-layout">
      <aside class="detail-aside">
        <ShareActions :title="item.title" />
        <nav v-if="item.sections.some(section => section.heading)" aria-label="في هذه الصفحة" class="table-of-contents">
          <h2>في هذه الصفحة</h2>
          <a v-for="section in item.sections.filter(section => section.heading)" :key="section.id" :href="`#${section.id}`">{{ section.heading }}</a>
        </nav>
      </aside>

      <div>
        <MediaAvailability v-if="isMedia" :item="item as never" />
        <div class="reading-body" :class="{ 'reading-body--benefit': item.type === 'benefit' }">
          <section v-for="section in item.sections" :id="section.id" :key="section.id">
            <h2 v-if="section.heading">{{ section.heading }}</h2>
            <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
            <blockquote v-if="section.quote">{{ section.quote }}</blockquote>
          </section>
        </div>
      </div>
    </div>

    <section v-if="result.related.length" class="related-content">
      <div class="site-container">
        <div class="section-heading"><h2>مواد ذات صلة</h2><NuxtLink :to="listingPath">كل {{ typePluralLabel }}</NuxtLink></div>
        <div class="related-grid"><ContentCard v-for="related in result.related" :key="related.id" :item="related" /></div>
      </div>
    </section>
  </article>
</template>

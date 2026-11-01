<script setup lang="ts">
import { contentTypeLabels, contentTypePluralLabels, contentTypeRoutes, type ContentDetailResult } from '~/types/content'
import { formatArabicDate } from '~/utils/format'

const { result } = defineProps<{ result: ContentDetailResult }>()
const item = computed(() => result.item)
const typeLabel = computed(() => contentTypeLabels[item.value.type])
const typePluralLabel = computed(() => contentTypePluralLabels[item.value.type])
const listingPath = computed(() => contentTypeRoutes[item.value.type])
const routePath = computed(() => `${listingPath.value}/${item.value.slug}`)
const isMedia = computed(() => ['book', 'audio', 'video'].includes(item.value.type))
const headings = computed(() => item.value.sections.filter(section => section.heading))

// Reading size is a per-visit convenience, like the A+/A- buttons on the reference.
const scale = shallowRef(1)
function resize(delta: number) {
  scale.value = Math.min(1.5, Math.max(0.9, Math.round((scale.value + delta) * 10) / 10))
}

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
  <InnerPage :title="item.title" :crumbs="[{ label: typePluralLabel, to: listingPath }, { label: item.title }]">
    <article class="detail-page" :class="`detail-page--${item.type}`">
      <div class="detail-tools">
        <div class="detail-tools__size" role="group" aria-label="حجم الخط">
          <button type="button" :disabled="scale >= 1.5" @click="resize(0.1)">تكبير</button>
          <button type="button" :disabled="scale <= 0.9" @click="resize(-0.1)">تصغير</button>
        </div>
        <ShareActions :title="item.title" />
      </div>
      <p class="detail-meta-line">
        <span>{{ typeLabel }}</span>
        <time :datetime="item.publishedAt">{{ formatArabicDate(item.publishedAt) }}</time>
        <span v-if="item.readingMinutes">{{ item.readingMinutes }} دقائق قراءة</span>
        <span v-if="item.categories.length">{{ item.categories.map(category => category.name).join('، ') }}</span>
        <template v-if="item.type === 'book'">
          <span>{{ item.authorLabel }}</span>
          <span v-if="item.publicationYear">{{ item.publicationYear }}</span>
        </template>
        <strong v-if="result.source === 'demo'" class="detail-meta-line__demo">محتوى تجريبي</strong>
      </p>

      <img v-if="item.type === 'book' && item.coverUrl" class="book-cover" :src="item.coverUrl" :alt="`غلاف كتاب ${item.title}`" width="200" height="300">

      <MediaAvailability v-if="isMedia" :item="item as never" />

      <nav v-if="headings.length" aria-label="في هذه الصفحة" class="table-of-contents">
        <h2>في هذه الصفحة</h2>
        <a v-for="section in headings" :key="section.id" :href="`#${section.id}`">{{ section.heading }}</a>
      </nav>

      <div class="reading-body" :class="{ 'reading-body--benefit': item.type === 'benefit' }" :style="{ '--reading-scale': scale }">
        <section v-for="section in item.sections" :id="section.id" :key="section.id">
          <h2 v-if="section.heading">{{ section.heading }}</h2>
          <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
          <blockquote v-if="section.quote">{{ section.quote }}</blockquote>
        </section>
      </div>

      <section v-if="result.related.length" class="related-content" aria-labelledby="related-title">
        <h2 id="related-title">مواد ذات صلة</h2>
        <ul class="ref-list">
          <li v-for="related in result.related" :key="related.id">
            <NuxtLink :to="contentPath(related)">{{ related.title }}</NuxtLink>
            <time :datetime="related.publishedAt">{{ formatArabicDate(related.publishedAt) }}</time>
          </li>
        </ul>
        <NuxtLink class="ref-more" :to="listingPath">كل {{ typePluralLabel }}</NuxtLink>
      </section>
    </article>
  </InnerPage>
</template>

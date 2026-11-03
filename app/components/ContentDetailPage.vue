<script setup lang="ts">
import { contentTypeLabels, contentTypePluralLabels, contentTypeRoutes, type ContentDetailResult } from '~/types/content'
import { formatArabicDate } from '~/utils/format'
import { extractHeadings } from '~/utils/rich-text'
import { youtubeThumbnailUrl } from '~/utils/youtube'

const { result } = defineProps<{ result: ContentDetailResult }>()
const item = computed(() => result.item)
const typeLabel = computed(() => contentTypeLabels[item.value.type])
const typePluralLabel = computed(() => contentTypePluralLabels[item.value.type])
const listingPath = computed(() => contentTypeRoutes[item.value.type])
const routePath = computed(() => `${listingPath.value}/${item.value.slug}`)
const isMedia = computed(() => ['book', 'audio', 'video'].includes(item.value.type))
const authorDisplayName = useRuntimeConfig().public.authorDisplayName

// Books show their cover beside the facts and videos in the player; every other type leads with a wide cover.
const leadCover = computed(() => item.value.type !== 'book' && item.value.type !== 'video' ? item.value.coverUrl : undefined)
const coverFailed = shallowRef(false)
watch(leadCover, () => { coverFailed.value = false })

// Contents list: headings written in the rich editor plus section headings of older plain-text articles.
const headings = computed(() => item.value.sections.flatMap(section => section.html === undefined
  ? (section.heading ? [{ id: section.id, text: section.heading, level: 2 as const }] : [])
  : extractHeadings(section.html).filter(heading => heading.level === 2)))

// Reading size is a per-visit convenience, like the A+/A- buttons on the reference.
const scale = shallowRef(1)
function resize(delta: number) {
  scale.value = Math.min(1.5, Math.max(0.9, Math.round((scale.value + delta) * 10) / 10))
}

const shareImage = computed(() => {
  const value = item.value
  if (value.coverUrl) return value.coverUrl
  return value.type === 'video' && value.youtubeId ? youtubeThumbnailUrl(value.youtubeId) : undefined
})

const { canonical, absolute } = usePageSeo({
  title: computed(() => item.value.seoTitle || item.value.title),
  description: computed(() => item.value.seoDescription || item.value.excerpt),
  path: routePath,
  type: item.value.type === 'book' ? 'book' : 'article',
  image: shareImage,
})

// Structured data lists only values the record really has.
const structuredData = computed(() => {
  const value = item.value
  const image = absolute(shareImage.value)
  const base = {
    '@context': 'https://schema.org',
    name: value.title,
    description: value.excerpt,
    datePublished: value.publishedAt,
    dateModified: value.updatedAt,
    inLanguage: 'ar',
    ...(image ? { image } : {}),
  }
  const breadcrumbs = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: typePluralLabel.value, item: absolute(listingPath.value) },
      { '@type': 'ListItem', position: 2, name: value.title, item: canonical.value },
    ],
  }
  if (value.type === 'video' && image) {
    return [{ ...base, '@type': 'VideoObject', uploadDate: value.publishedAt, thumbnailUrl: image, ...(value.youtubeId ? { embedUrl: `https://www.youtube.com/embed/${value.youtubeId}` } : {}) }, breadcrumbs]
  }
  return [
    value.type === 'book'
      ? { ...base, '@type': 'Book', author: { '@type': 'Person', name: value.authorLabel } }
      : { ...base, '@type': 'Article', headline: value.title, author: { '@type': 'Person', name: authorDisplayName } },
    breadcrumbs,
  ]
})

useHead({
  script: computed(() => structuredData.value.map(entry => ({ type: 'application/ld+json', textContent: JSON.stringify(entry) }))),
})
</script>

<template>
  <InnerPage :title="item.title" :crumbs="[{ label: typePluralLabel, to: listingPath }, { label: item.title }]">
    <template #eyebrow>
      <p class="detail-eyebrow">{{ item.categories[0]?.name ?? typeLabel }}</p>
    </template>
    <article class="detail-page" :class="`detail-page--${item.type}`">
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

      <figure v-if="leadCover && !coverFailed" class="detail-cover">
        <img :src="leadCover" :alt="`صورة غلاف: ${item.title}`" width="1280" height="720" fetchpriority="high" @error="coverFailed = true">
      </figure>

      <div class="detail-tools">
        <div class="detail-tools__size" role="group" aria-label="حجم الخط">
          <button type="button" :disabled="scale >= 1.5" @click="resize(0.1)">تكبير</button>
          <button type="button" :disabled="scale <= 0.9" @click="resize(-0.1)">تصغير</button>
        </div>
        <ShareActions :title="item.title" />
      </div>

      <img v-if="item.type === 'book' && item.coverUrl" class="book-cover" :src="item.coverUrl" :alt="`غلاف كتاب ${item.title}`" width="200" height="300">

      <MediaAvailability v-if="isMedia" :item="item as never" />

      <nav v-if="headings.length" aria-label="في هذه الصفحة" class="table-of-contents">
        <h2>في هذه الصفحة</h2>
        <a v-for="heading in headings" :key="heading.id" :href="`#${heading.id}`">{{ heading.text }}</a>
      </nav>

      <div class="reading-body" :class="{ 'reading-body--benefit': item.type === 'benefit' }" :style="{ '--reading-scale': scale }">
        <template v-for="section in item.sections" :key="section.id">
          <RichTextContent v-if="section.html !== undefined" :html="section.html" />
          <section v-else :id="section.id">
            <h2 v-if="section.heading">{{ section.heading }}</h2>
            <p v-for="paragraph in section.paragraphs" :key="paragraph">{{ paragraph }}</p>
            <blockquote v-if="section.quote">{{ section.quote }}</blockquote>
          </section>
        </template>
      </div>

      <section v-if="result.related.length" class="related-content" aria-labelledby="related-title">
        <h2 id="related-title">مواد ذات صلة</h2>
        <ContentCardGrid :items="result.related" />
        <NuxtLink class="ref-more" :to="listingPath">كل {{ typePluralLabel }}</NuxtLink>
      </section>
    </article>
  </InnerPage>
</template>

<script setup lang="ts">
import { BookOpen, Headphones, Lightbulb, Newspaper } from '@lucide/vue'
import type { ContentListResult, ContentType } from '~/types/content'
import { contentTypeRoutes } from '~/types/content'
import type { TopicGroup } from '~/components/TopicTabs.vue'

const { data } = await useLibraryContent()
const isDemo = useIsDemoContent()
const items = computed(() => data.value?.items || [])
const published = computed(() => items.value.slice(0, 6))
const selected = computed(() => {
  const featured = items.value.filter(item => item.featured)
  return (featured.length >= 4 ? featured : items.value).slice(0, 4)
})
const { authorDisplayName } = useRuntimeConfig().public

const categories: Array<{ type: ContentType; label: string; icon: typeof BookOpen | null }> = [
  { type: 'article', label: 'المقالات', icon: Newspaper },
  { type: 'audio', label: 'الصوتيات', icon: Headphones },
  { type: 'sermon', label: 'الخطب', icon: null },
  { type: 'book', label: 'الكتب', icon: BookOpen },
  { type: 'benefit', label: 'الفوائد', icon: Lightbulb },
]

const subcategories = computed(() => {
  const result: Partial<Record<ContentType, string[]>> = {}
  for (const { type } of categories) {
    const names = new Set<string>()
    for (const item of items.value) if (item.type === type) for (const c of item.categories) names.add(c.name)
    result[type] = [...names].slice(0, 4)
  }
  return result
})

const topicGroups = computed<TopicGroup[]>(() => categories
  .map(({ type, label }) => ({ type, label, items: items.value.filter(item => item.type === type).slice(0, 5) }))
  .filter(group => group.items.length))

usePageSeo({
  title: 'المكتبة الرقمية',
  description: 'مكتبة عربية تجمع المقالات والكتب والخطب والصوتيات والفوائد والمرئيات في تجربة قراءة واضحة.',
  path: '/',
})
</script>

<template>
  <div class="library-home">

    <section class="digital-library" aria-labelledby="digital-library-title">
      <div class="ref-container">
        <h2 id="digital-library-title" class="ref-title">المكتبة الرقمية</h2>
        <p class="ref-lead">تضم المكتبة الخطب والدروس والمقالات لصاحب الموقع {{ authorDisplayName }}<template v-if="isDemo"> — محتوى تجريبي</template>.</p>
        <nav class="digital-library__grid" aria-label="أقسام المكتبة الرئيسة">
          <NuxtLink v-for="category in categories" :key="category.type" :to="contentTypeRoutes[category.type]" class="category-card">
            <img v-if="category.type === 'sermon'" class="category-card__art" src="/ornaments/sermon-microphone.png" alt="" width="1024" height="1536" loading="lazy">
            <component :is="category.icon" v-else class="category-card__art category-card__art--icon" :size="92" :stroke-width="1.2" aria-hidden="true" />
            <h3>{{ category.label }}</h3>
            <ul>
              <li v-for="name in subcategories[category.type]" :key="name">{{ name }}</li>
            </ul>
          </NuxtLink>
        </nav>
      </div>
    </section>

    <section class="latest-publications" aria-labelledby="latest-title">
      <div class="ref-container">
        <h2 id="latest-title" class="ref-title">أحدث المنشورات</h2>
        <LatestCarousel v-if="published.length" :items="published" />
        <EmptyState v-else title="لا توجد مواد منشورة حاليًا" description="ستظهر أحدث المنشورات هنا فور نشرها." />
      </div>
    </section>

    <section v-if="selected.length" class="selected-for-you" aria-labelledby="selected-title">
      <div class="ref-container">
        <h2 id="selected-title" class="ref-title">اخترنا لكم</h2>
        <ul class="selected-for-you__grid">
          <li v-for="item in selected" :key="item.id">
            <h3>{{ item.title }}</h3>
            <p>{{ item.excerpt }}</p>
            <NuxtLink class="ref-button" :to="contentPath(item)" :aria-label="`اذهب إلى: ${item.title}`">اذهب</NuxtLink>
          </li>
        </ul>
      </div>
    </section>

    <section v-if="topicGroups.length" class="library-topics" aria-labelledby="topics-title">
      <div class="ref-container">
        <h2 id="topics-title" class="ref-title">أحدث المواضيع في أقسام المكتبة</h2>
        <TopicTabs :groups="topicGroups" />
      </div>
    </section>

  </div>
</template>

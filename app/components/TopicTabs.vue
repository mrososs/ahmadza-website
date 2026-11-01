<script setup lang="ts">
import { Check } from '@lucide/vue'
import type { ContentItem, ContentType } from '~/types/content'
import { contentTypeRoutes } from '~/types/content'

export interface TopicGroup { type: ContentType; label: string; items: ContentItem[] }

const { groups } = defineProps<{ groups: TopicGroup[] }>()
const active = shallowRef(0)
const tabs = useTemplateRef<HTMLButtonElement[]>('tabs')
const current = computed(() => groups[active.value])

function onKey(event: KeyboardEvent) {
  const keys: Record<string, number> = { ArrowDown: 1, ArrowUp: -1 }
  const delta = keys[event.key]
  if (!delta) return
  event.preventDefault()
  active.value = (active.value + delta + groups.length) % groups.length
  tabs.value?.[active.value]?.focus()
}
</script>

<template>
  <div class="topic-tabs">
    <div class="topic-tabs__list" role="tablist" aria-orientation="vertical" aria-label="أقسام المكتبة" @keydown="onKey">
      <button
        v-for="(group, index) in groups"
        :id="`topic-tab-${group.type}`"
        :key="group.type"
        ref="tabs"
        type="button"
        role="tab"
        :aria-selected="index === active"
        :aria-controls="`topic-panel-${group.type}`"
        :tabindex="index === active ? 0 : -1"
        @click="active = index"
      >{{ group.label }}</button>
    </div>
    <div v-if="current" :id="`topic-panel-${current.type}`" class="topic-tabs__panel" role="tabpanel" :aria-labelledby="`topic-tab-${current.type}`">
      <p class="topic-tabs__label">جديد {{ current.label }}</p>
      <ul>
        <li v-for="item in current.items" :key="item.id">
          <Check :size="16" aria-hidden="true" />
          <NuxtLink :to="contentPath(item)">{{ item.title }}</NuxtLink>
        </li>
      </ul>
      <NuxtLink class="ref-more" :to="contentTypeRoutes[current.type]">المزيد ...</NuxtLink>
    </div>
  </div>
</template>

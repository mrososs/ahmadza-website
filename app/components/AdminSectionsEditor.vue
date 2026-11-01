<script setup lang="ts">
import { ArrowDown, ArrowUp, Plus, Trash2 } from '@lucide/vue'
import type { ContentSection } from '~/types/content'

const sections = defineModel<ContentSection[]>({ required: true })

function addSection() {
  sections.value = [...sections.value, { id: crypto.randomUUID(), heading: '', paragraphs: [''] }]
}
function removeSection(index: number) {
  sections.value = sections.value.filter((_, position) => position !== index)
}
function move(index: number, offset: -1 | 1) {
  const target = index + offset
  if (target < 0 || target >= sections.value.length) return
  const next = [...sections.value]
  const [moved] = next.splice(index, 1)
  if (moved) next.splice(target, 0, moved)
  sections.value = next
}
function update(index: number, patch: Partial<ContentSection>) {
  sections.value = sections.value.map((section, position) => position === index ? { ...section, ...patch } : section)
}
// Paragraphs are authored in one box, split on blank lines, so editors keep natural paragraph breaks.
const toText = (section: ContentSection) => section.paragraphs.join('\n\n')
const fromText = (value: string) => value.split(/\n{2,}/)
</script>

<template>
  <div class="sections-editor">
    <article v-for="(section, index) in sections" :key="section.id" class="section-card">
      <header class="section-card__head">
        <h3>الفقرة {{ index + 1 }}</h3>
        <div class="section-card__tools">
          <button type="button" class="icon-button" :disabled="index === 0" aria-label="نقل لأعلى" @click="move(index, -1)"><ArrowUp :size="18" aria-hidden="true" /></button>
          <button type="button" class="icon-button" :disabled="index === sections.length - 1" aria-label="نقل لأسفل" @click="move(index, 1)"><ArrowDown :size="18" aria-hidden="true" /></button>
          <button type="button" class="icon-button icon-button--danger" aria-label="حذف الفقرة" @click="removeSection(index)"><Trash2 :size="18" aria-hidden="true" /></button>
        </div>
      </header>
      <AdminField v-slot="{ id }" label="عنوان فرعي (اختياري)">
        <input :id="id" type="text" :value="section.heading ?? ''" @input="update(index, { heading: ($event.target as HTMLInputElement).value })">
      </AdminField>
      <AdminField v-slot="{ id }" label="النص" hint="افصل بين الفقرات بسطر فارغ.">
        <textarea :id="id" rows="7" class="reading-input" :value="toText(section)" @input="update(index, { paragraphs: fromText(($event.target as HTMLTextAreaElement).value) })" />
      </AdminField>
      <AdminField v-slot="{ id }" label="اقتباس بارز (اختياري)">
        <input :id="id" type="text" :value="section.quote ?? ''" @input="update(index, { quote: ($event.target as HTMLInputElement).value })">
      </AdminField>
    </article>
    <button type="button" class="admin-button admin-button--ghost" @click="addSection"><Plus :size="18" aria-hidden="true" /> إضافة فقرة</button>
  </div>
</template>

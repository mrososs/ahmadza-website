<script setup lang="ts">
import { Menu, Search, X } from '@lucide/vue'

const route = useRoute()
const isOpen = shallowRef(false)

const links = [
  { to: '/articles', label: 'المقالات' },
  { to: '/books', label: 'الكتب' },
  { to: '/sermons', label: 'الخطب' },
  { to: '/audio', label: 'الصوتيات' },
  { to: '/benefits', label: 'الفوائد' },
  { to: '/videos', label: 'المرئيات' },
  { to: '/about', label: 'عن الموقع' },
]

watch(() => route.fullPath, () => { isOpen.value = false })
</script>

<template>
  <header class="site-header">
    <div class="site-header__utility">
      <div class="site-container flex items-center justify-between gap-4 py-2 text-xs">
        <p>مكتبة عربية رقمية — المحتوى الحالي تجريبي للمعاينة</p>
        <NuxtLink to="/search" class="inline-flex items-center gap-2 font-semibold">
          <Search :size="15" aria-hidden="true" />
          البحث في المكتبة
        </NuxtLink>
      </div>
    </div>
    <div class="site-container site-header__main">
      <BrandMark />
      <nav class="desktop-nav" aria-label="التنقل الرئيسي">
        <NuxtLink v-for="link in links" :key="link.to" :to="link.to">{{ link.label }}</NuxtLink>
      </nav>
      <button
        class="mobile-nav-button"
        type="button"
        :aria-expanded="isOpen"
        aria-controls="mobile-nav"
        :aria-label="isOpen ? 'إغلاق القائمة' : 'فتح القائمة'"
        @click="isOpen = !isOpen"
      >
        <X v-if="isOpen" :size="24" aria-hidden="true" />
        <Menu v-else :size="24" aria-hidden="true" />
      </button>
    </div>
    <nav v-show="isOpen" id="mobile-nav" class="mobile-nav" aria-label="التنقل على الهاتف">
      <NuxtLink v-for="link in links" :key="link.to" :to="link.to">{{ link.label }}</NuxtLink>
      <NuxtLink to="/search" class="mobile-nav__search"><Search :size="18" aria-hidden="true" /> البحث</NuxtLink>
    </nav>
  </header>
</template>

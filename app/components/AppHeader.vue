<script setup lang="ts">
import { ChevronDown, Menu, Search, X } from '@lucide/vue'

const route = useRoute()
const isOpen = shallowRef(false)

const links = [
  { to: '/sermons', label: 'الخطب' },
  { to: '/articles', label: 'المقالات' },
  { to: '/audio', label: 'الصوتيات' },
  { to: '/books', label: 'الكتب' },
  { to: '/benefits', label: 'الفوائد' },
  { to: '/videos', label: 'المرئيات' },
  { to: '/about', label: 'عن الموقع' },
]

const libraryGroups = [
  { label: 'المكتوب', links: [{ to: '/articles', label: 'المقالات' }, { to: '/books', label: 'الكتب' }, { to: '/benefits', label: 'الفوائد' }] },
  { label: 'المسموع والمرئي', links: [{ to: '/sermons', label: 'الخطب' }, { to: '/audio', label: 'الصوتيات' }, { to: '/videos', label: 'المرئيات' }] },
]

watch(() => route.fullPath, () => { isOpen.value = false })

// The bar floats over the hero at the top and turns solid white once the page scrolls, as on the reference.
const scrolled = shallowRef(false)
function onScroll() { scrolled.value = window.scrollY > 24 }
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
</script>

<template>
  <header class="site-header" :class="{ 'site-header--stuck': scrolled }">
    <div class="site-container site-header__main">
      <BrandMark header-logo />
      <nav class="desktop-nav" aria-label="التنقل الرئيسي">
        <NuxtLink to="/" active-class="" exact-active-class="router-link-active">الرئيسية</NuxtLink>
        <NuxtLink v-for="link in links" :key="link.to" :to="link.to">{{ link.label }}</NuxtLink>
        <details class="nav-menu">
          <summary>أقسام المكتبة <ChevronDown :size="14" aria-hidden="true" /></summary>
          <div class="nav-menu__panel">
            <div v-for="group in libraryGroups" :key="group.label">
              <strong>{{ group.label }}</strong>
              <NuxtLink v-for="link in group.links" :key="link.to" :to="link.to">{{ link.label }}</NuxtLink>
            </div>
          </div>
        </details>
      </nav>
      <form class="header-search" role="search" action="/search" method="get">
        <input name="q" type="search" aria-label="كلمة البحث" placeholder="اكتب كلمة البحث">
        <button type="submit" aria-label="بحث في الموقع">بحث</button>
      </form>
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
      <NuxtLink to="/" active-class="" exact-active-class="router-link-active">الرئيسية</NuxtLink>
      <NuxtLink v-for="link in links" :key="link.to" :to="link.to">{{ link.label }}</NuxtLink>
      <NuxtLink to="/search" class="mobile-nav__search"><Search :size="18" aria-hidden="true" /> البحث في المكتبة</NuxtLink>
    </nav>
  </header>
</template>

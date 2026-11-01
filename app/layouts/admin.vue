<script setup lang="ts">
import { ExternalLink, FilePlus2, LayoutDashboard, Library, LogOut, Menu, Tags, X } from '@lucide/vue'
import { contentTypePluralLabels, contentTypes } from '~/types/content'
import '~/assets/css/admin.css'

const route = useRoute()
const { profile, mode, signOut } = useAdminSession()
const { notice, clear } = useAdminNotice()
const isOpen = shallowRef(false)

const links = [
  { to: '/admin', label: 'لوحة التحكم', icon: LayoutDashboard, exact: true },
  { to: '/admin/content', label: 'المحتوى', icon: Library, exact: false },
  { to: '/admin/content/new', label: 'مادة جديدة', icon: FilePlus2, exact: true },
  { to: '/admin/categories', label: 'التصنيفات', icon: Tags, exact: false },
]

const isActive = (link: (typeof links)[number]) => link.exact
  ? route.path === link.to
  // "المحتوى" must not stay highlighted on the "مادة جديدة" route.
  : route.path.startsWith(link.to) && route.path !== '/admin/content/new'

const isTypeActive = (type: string) => route.path === '/admin/content' && route.query.type === type

async function logout() {
  await signOut()
  await navigateTo('/admin/login')
}

watch(() => route.fullPath, () => { isOpen.value = false })
// A notice belongs to the page that follows the action; clear it after it has been seen.
watch(notice, (value) => {
  if (!value) return
  const timer = setTimeout(clear, 6000)
  onWatcherCleanup(() => clearTimeout(timer))
})

useHead({ htmlAttrs: { lang: 'ar', dir: 'rtl' } })
useSeoMeta({ robots: 'noindex, nofollow' })
</script>

<template>
  <div class="admin-shell">
    <a class="skip-link" href="#admin-main">انتقل إلى المحتوى</a>

    <header class="admin-topbar">
      <NuxtLink to="/admin" class="admin-brand" aria-label="لوحة تحكم موقع أحمد زايد">
        <img src="/ornaments/ahmad-zayed-logo-client.png" alt="" width="1448" height="1086">
        <span><strong>لوحة التحكم</strong><small>موقع أحمد زايد</small></span>
      </NuxtLink>
      <button class="admin-menu-button" type="button" :aria-expanded="isOpen" aria-controls="admin-nav" :aria-label="isOpen ? 'إغلاق القائمة' : 'فتح القائمة'" @click="isOpen = !isOpen">
        <X v-if="isOpen" :size="24" aria-hidden="true" />
        <Menu v-else :size="24" aria-hidden="true" />
      </button>
    </header>

    <nav id="admin-nav" class="admin-nav" :class="{ 'admin-nav--open': isOpen }" aria-label="إدارة الموقع">
      <template v-for="link in links" :key="link.to">
        <NuxtLink :to="link.to" :class="{ 'is-active': isActive(link) }" :aria-current="isActive(link) ? 'page' : undefined">
          <component :is="link.icon" :size="20" aria-hidden="true" />{{ link.label }}
        </NuxtLink>
        <ul v-if="link.to === '/admin/content'" class="admin-nav__types" aria-label="أنواع المحتوى">
          <li v-for="type in contentTypes" :key="type">
            <NuxtLink :to="{ path: '/admin/content', query: { type } }" :class="{ 'is-active': isTypeActive(type) }" :aria-current="isTypeActive(type) ? 'page' : undefined">{{ contentTypePluralLabels[type] }}</NuxtLink>
          </li>
        </ul>
      </template>
      <a href="/" class="admin-nav__site"><ExternalLink :size="20" aria-hidden="true" />عرض الموقع</a>
      <div class="admin-nav__user">
        <span v-if="profile"><strong>{{ profile.displayName }}</strong><small>{{ profile.role === 'owner' ? 'مالك الموقع' : 'محرّر' }}</small></span>
        <button type="button" class="admin-nav__logout" @click="logout"><LogOut :size="20" aria-hidden="true" />تسجيل الخروج</button>
      </div>
    </nav>

    <main id="admin-main" class="admin-main">
      <p v-if="mode === 'demo'" class="admin-alert admin-alert--demo">
        وضع تجريبي للمعاينة: البيانات مخزّنة في الذاكرة فقط وتُمحى عند تحديث الصفحة، ولا يتصل بقاعدة البيانات.
      </p>
      <div class="admin-live" aria-live="polite">
        <p v-if="notice" class="admin-alert" :class="notice.tone === 'success' ? 'admin-alert--success' : 'admin-alert--error'">{{ notice.message }}</p>
      </div>
      <slot />
    </main>
  </div>
</template>

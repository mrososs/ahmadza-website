<script setup lang="ts">
const year = new Date().getFullYear()
const isDemo = useIsDemoContent()

const groups = [
  { label: 'المكتبة', links: [{ to: '/articles', label: 'المقالات' }, { to: '/books', label: 'الكتب' }, { to: '/sermons', label: 'الخطب' }, { to: '/audio', label: 'الصوتيات' }] },
  { label: 'استكشف', links: [{ to: '/benefits', label: 'الفوائد' }, { to: '/videos', label: 'المرئيات' }, { to: '/search', label: 'البحث الموحّد' }, { to: '/about', label: 'عن الموقع' }] },
]
</script>

<template>
  <footer class="site-footer">
    <div class="ref-container site-footer__main">
      <div class="site-footer__brand">
        <BrandMark header-logo compact />
        <p>مساحة عربية هادئة لحفظ المعرفة وتيسير الوصول إليها.</p>
      </div>
      <nav class="site-footer__links" aria-label="روابط التذييل">
        <div v-for="group in groups" :key="group.label">
          <h2>{{ group.label }}</h2>
          <ul>
            <li v-for="link in group.links" :key="link.to"><NuxtLink :to="link.to">{{ link.label }}</NuxtLink></li>
          </ul>
        </div>
      </nav>
    </div>
    <div class="site-footer__bar">
      <div class="ref-container site-footer__bottom">
        <p>© {{ year }} — جميع الحقوق محفوظة.</p>
        <p v-if="isDemo">المواد المعروضة بيانات تجريبية، وليست سيرةً أو مؤلفاتٍ منسوبة إلى صاحب الموقع.</p>
      </div>
    </div>
  </footer>
</template>

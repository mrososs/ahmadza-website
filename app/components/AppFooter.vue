<script setup lang="ts">
const year = new Date().getFullYear()
</script>

<template>
  <footer class="site-footer">
    <div class="site-container site-footer__grid">
      <div>
        <BrandMark />
        <p class="site-footer__statement">مساحة عربية هادئة لحفظ المعرفة، وتيسير الوصول إليها، وتقديمها في تجربة قراءة جديرة بها.</p>
      </div>
      <div>
        <h2>المكتبة</h2>
        <NuxtLink to="/articles">المقالات</NuxtLink>
        <NuxtLink to="/books">الكتب</NuxtLink>
        <NuxtLink to="/sermons">الخطب</NuxtLink>
        <NuxtLink to="/audio">الصوتيات</NuxtLink>
      </div>
      <div>
        <h2>استكشف</h2>
        <NuxtLink to="/benefits">الفوائد</NuxtLink>
        <NuxtLink to="/videos">المرئيات</NuxtLink>
        <NuxtLink to="/search">البحث الموحّد</NuxtLink>
        <NuxtLink to="/about">عن الموقع</NuxtLink>
      </div>
      <div class="site-footer__note">
        <span>تنبيه تحريري</span>
        <p>المواد المعروضة في النسخة الحالية بيانات تجريبية واضحة، وليست سيرةً أو مؤلفاتٍ منسوبة إلى صاحب الموقع.</p>
      </div>
    </div>
    <div class="site-container site-footer__bottom">
      <p>© {{ year }} — جميع الحقوق محفوظة.</p>
      <p>صُمّم بالعربية، من اليمين إلى اليسار.</p>
    </div>
  </footer>
</template>

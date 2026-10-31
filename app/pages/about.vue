<script setup lang="ts">
import { BookOpen, Compass, ShieldCheck } from '@lucide/vue'

usePageSeo({ title: 'عن الموقع', description: 'تعريف بالمكتبة الرقمية ورسالتها وحدود البيانات المتاحة في النسخة الحالية.', path: '/about' })
</script>

<template>
  <div class="about-page">
    <div class="site-container"><Breadcrumbs :items="[{ label: 'عن الموقع' }]" /></div>
    <header class="about-hero">
      <div class="site-container about-hero__grid">
        <div class="about-portrait" aria-label="موضع صورة المؤلف قيد التزويد"><span>أز</span><small>الصورة المعتمدة<br>قيد التزويد</small></div>
        <div>
          <h1>مكتبةٌ تحفظ الأثر، وتقرّب المعرفة.</h1>
          <p>هذه الصفحة مهيأة لتقديم السيرة المعتمدة للمؤلف ورسالته العلمية عند استلام النص والصورة والبيانات الموثقة. نتعمد الآن عدم اختلاق مؤهلات أو مناصب أو إنجازات.</p>
        </div>
      </div>
    </header>
    <section class="site-container about-manifesto">
      <div><Compass :size="26" aria-hidden="true" /><h2>الرسالة</h2><p>تقديم أرشيف عربي متعدد الصيغ في تجربة واضحة، هادئة، وقابلة للبحث.</p></div>
      <div><BookOpen :size="26" aria-hidden="true" /><h2>الأولوية</h2><p>للنص وصاحبه والقارئ؛ لا للمؤثرات التي تحجب المحتوى أو تشتت عنه.</p></div>
      <div><ShieldCheck :size="26" aria-hidden="true" /><h2>الأمانة</h2><p>لا ننسب قولًا أو كتابًا أو سيرةً قبل وجود مصدر معتمد، ولا نعرض ملفًا غير متوفر.</p></div>
    </section>
    <section class="about-copy">
      <div class="site-container about-copy__grid">
        <h2>ما الذي سيُستكمل؟</h2>
        <div>
          <p>قبل الإطلاق النهائي، تحتاج هذه الصفحة إلى السيرة المختصرة والمطولة، والصورة الشخصية المعتمدة، والاسم المهني المراد عرضه، والروابط الرسمية، ورسالة الموقع بصياغة صاحبها.</p>
          <p>بقية النظام جاهز لاستقبال هذه البيانات من إعدادات الموقع في Supabase ثم إدارتها من لوحة CMS المقررة للمرحلة التالية.</p>
        </div>
      </div>
    </section>
  </div>
</template>

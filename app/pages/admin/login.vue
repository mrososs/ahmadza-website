<script setup lang="ts">
import { LogIn } from '@lucide/vue'
import '~/assets/css/admin.css'

definePageMeta({ layout: false, middleware: 'admin' })
useHead({ title: 'تسجيل دخول المدير | موقع أحمد الزهراني', htmlAttrs: { lang: 'ar', dir: 'rtl' } })
useSeoMeta({ robots: 'noindex, nofollow', description: 'تسجيل دخول مديري موقع أحمد الزهراني.' })

const route = useRoute()
const { signIn, mode, restore } = useAdminSession()

const email = shallowRef('')
const password = shallowRef('')
const pending = shallowRef(false)
const failure = shallowRef('')

// Only same-site admin paths are honoured, so the login page cannot be used as an open redirect.
const destination = computed(() => {
  const target = typeof route.query.redirect === 'string' ? route.query.redirect : ''
  return target.startsWith('/admin') && !target.startsWith('//') ? target : '/admin'
})

onMounted(restore)

async function submit() {
  failure.value = ''
  if (!email.value.trim() || !password.value) {
    failure.value = 'أدخل البريد الإلكتروني وكلمة المرور.'
    return
  }
  pending.value = true
  try {
    await signIn(email.value.trim(), password.value)
    await navigateTo(destination.value)
  }
  catch (cause) {
    failure.value = errorMessage(cause, 'تعذر تسجيل الدخول الآن. حاول مرة أخرى.')
    password.value = ''
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <a class="skip-link" href="#login-form">انتقل إلى النموذج</a>
    <main class="login-card">
      <img class="login-card__logo" src="/branding/hero-ahmad-alzahrani.webp" alt="موقع أحمد الزهراني" width="1400" height="788">
      <section class="login-card__body" aria-labelledby="login-title">
        <h1 id="login-title" class="admin-title">تسجيل دخول المدير</h1>
        <p class="admin-muted">هذه الصفحة مخصّصة لإدارة محتوى الموقع.</p>

        <p v-if="mode === 'unconfigured'" class="admin-alert admin-alert--error" role="alert">
          لوحة التحكم غير مهيأة بعد: لم تُضبط بيانات الاتصال بقاعدة البيانات. تواصل مع المطوّر.
        </p>
        <p v-else-if="mode === 'demo'" class="admin-alert admin-alert--demo">
          وضع تجريبي للمعاينة: لم تُضبط قاعدة البيانات، ويقبل هذا النموذج أي بيانات دون حفظ حقيقي.
        </p>

        <form id="login-form" novalidate @submit.prevent="submit">
          <AdminField v-slot="{ id, invalid }" label="البريد الإلكتروني">
            <input :id="id" v-model="email" type="email" dir="ltr" class="ltr-input" autocomplete="username" inputmode="email" required :aria-invalid="invalid">
          </AdminField>
          <AdminField v-slot="{ id, invalid }" label="كلمة المرور">
            <input :id="id" v-model="password" type="password" dir="ltr" class="ltr-input" autocomplete="current-password" required :aria-invalid="invalid">
          </AdminField>
          <p v-if="failure" class="admin-alert admin-alert--error" role="alert">{{ failure }}</p>
          <button type="submit" class="admin-button admin-button--primary admin-button--block" :disabled="pending || mode === 'unconfigured'">
            <LogIn :size="18" aria-hidden="true" /> {{ pending ? 'جارٍ الدخول…' : 'دخول' }}
          </button>
        </form>
        <p class="admin-login-links">
          <NuxtLink to="/admin/forgot-password" class="admin-backlink">نسيت كلمة المرور؟</NuxtLink>
          <a href="/" class="admin-backlink">العودة إلى الموقع</a>
        </p>
      </section>
    </main>
  </div>
</template>

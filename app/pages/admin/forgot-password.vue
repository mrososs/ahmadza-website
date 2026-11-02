<script setup lang="ts">
import { Mail } from '@lucide/vue'
import '~/assets/css/admin.css'

definePageMeta({ layout: false, middleware: 'admin' })
useHead({ title: 'استعادة كلمة المرور | موقع أحمد الزهراني', htmlAttrs: { lang: 'ar', dir: 'rtl' } })
useSeoMeta({ robots: 'noindex, nofollow', description: 'استعادة كلمة مرور مدير موقع أحمد الزهراني.' })

const { requestPasswordReset } = useAdminSession()
const email = shallowRef('')
const pending = shallowRef(false)
const sent = shallowRef(false)
const failure = shallowRef('')

async function submit() {
  failure.value = ''
  const value = email.value.trim()
  if (!/^\S+@\S+\.\S+$/.test(value)) {
    failure.value = 'أدخل بريدًا إلكترونيًا صحيحًا.'
    return
  }
  pending.value = true
  try {
    await requestPasswordReset(value)
    sent.value = true
  }
  catch (cause) {
    failure.value = errorMessage(cause, 'تعذر إرسال الرسالة الآن. حاول لاحقًا.')
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="login-page">
    <main class="login-card">
      <img class="login-card__logo" src="/branding/hero-ahmad-alzahrani.webp" alt="موقع أحمد الزهراني" width="1400" height="788">
      <section class="login-card__body" aria-labelledby="forgot-title">
        <h1 id="forgot-title" class="admin-title">استعادة كلمة المرور</h1>
        <p class="admin-muted">أدخل بريد المدير وسنرسل رابطًا لتعيين كلمة مرور جديدة.</p>

        <div v-if="sent" class="admin-alert admin-alert--success" role="status">
          إن كان هذا البريد مسجّلًا كمدير، فقد أُرسل إليه رابط الاستعادة. افتح الرسالة من الجهاز والمتصفح نفسيهما، وتحقق من البريد غير المرغوب فيه.
        </div>
        <form v-else novalidate @submit.prevent="submit">
          <AdminField v-slot="{ id, invalid }" label="البريد الإلكتروني">
            <input :id="id" v-model="email" type="email" dir="ltr" class="ltr-input" autocomplete="email" inputmode="email" required :aria-invalid="invalid">
          </AdminField>
          <p v-if="failure" class="admin-alert admin-alert--error" role="alert">{{ failure }}</p>
          <button type="submit" class="admin-button admin-button--primary admin-button--block" :disabled="pending">
            <Mail :size="18" aria-hidden="true" /> {{ pending ? 'جارٍ الإرسال…' : 'إرسال رابط الاستعادة' }}
          </button>
        </form>
        <NuxtLink to="/admin/login" class="admin-backlink">العودة إلى تسجيل الدخول</NuxtLink>
      </section>
    </main>
  </div>
</template>

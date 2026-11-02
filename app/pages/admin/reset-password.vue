<script setup lang="ts">
import { KeyRound } from '@lucide/vue'
import '~/assets/css/admin.css'

definePageMeta({ layout: false, middleware: 'admin' })
useHead({ title: 'تعيين كلمة مرور جديدة | موقع أحمد الزهراني', htmlAttrs: { lang: 'ar', dir: 'rtl' } })
useSeoMeta({ robots: 'noindex, nofollow', description: 'تعيين كلمة مرور جديدة لمدير موقع أحمد الزهراني.' })

const MIN_LENGTH = 12
const route = useRoute()
const { completeRecovery, updatePassword } = useAdminSession()

const state = shallowRef<'checking' | 'ready' | 'invalid'>('checking')
const invalidReason = shallowRef('')
const password = shallowRef('')
const confirmation = shallowRef('')
const pending = shallowRef(false)
const failure = shallowRef('')

onMounted(async () => {
  // The one-time code is read once and removed from the address bar before anything else happens,
  // so it never stays in history, screenshots, or shared URLs.
  const code = typeof route.query.code === 'string' ? route.query.code : null
  const providerError = typeof route.query.error_description === 'string' ? route.query.error_description : ''
  if (code || route.query.error) window.history.replaceState(window.history.state, '', window.location.pathname)

  if (providerError) {
    invalidReason.value = 'رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا.'
    state.value = 'invalid'
    return
  }
  try {
    state.value = (await completeRecovery(code)) ? 'ready' : 'invalid'
    if (state.value === 'invalid') invalidReason.value = 'لا توجد جلسة استعادة صالحة. اطلب رابطًا جديدًا.'
  }
  catch (cause) {
    invalidReason.value = errorMessage(cause, 'تعذر التحقق من الرابط. اطلب رابطًا جديدًا.')
    state.value = 'invalid'
  }
})

async function submit() {
  failure.value = ''
  if (password.value.length < MIN_LENGTH) {
    failure.value = `كلمة المرور يجب ألا تقل عن ${MIN_LENGTH} حرفًا.`
    return
  }
  if (password.value !== confirmation.value) {
    failure.value = 'كلمتا المرور غير متطابقتين.'
    return
  }
  pending.value = true
  try {
    await updatePassword(password.value)
    await navigateTo('/admin')
  }
  catch (cause) {
    failure.value = errorMessage(cause, 'تعذر تعيين كلمة المرور. حاول مرة أخرى.')
  }
  finally {
    pending.value = false
    password.value = ''
    confirmation.value = ''
  }
}
</script>

<template>
  <div class="login-page">
    <main class="login-card">
      <img class="login-card__logo" src="/branding/hero-ahmad-alzahrani.webp" alt="موقع أحمد الزهراني" width="1400" height="788">
      <section class="login-card__body" aria-labelledby="reset-title">
        <h1 id="reset-title" class="admin-title">كلمة مرور جديدة</h1>

        <p v-if="state === 'checking'" class="admin-muted" role="status">جارٍ التحقق من الرابط…</p>

        <template v-else-if="state === 'invalid'">
          <p class="admin-alert admin-alert--error" role="alert">{{ invalidReason }}</p>
          <NuxtLink to="/admin/forgot-password" class="admin-button admin-button--primary admin-button--block">طلب رابط جديد</NuxtLink>
        </template>

        <form v-else novalidate @submit.prevent="submit">
          <p class="admin-muted">اختر كلمة مرور قوية وفريدة لا تستخدمها في موقع آخر ({{ MIN_LENGTH }} أحرف على الأقل).</p>
          <AdminField v-slot="{ id, invalid }" label="كلمة المرور الجديدة">
            <input :id="id" v-model="password" type="password" dir="ltr" class="ltr-input" autocomplete="new-password" required :minlength="MIN_LENGTH" :aria-invalid="invalid">
          </AdminField>
          <AdminField v-slot="{ id, invalid }" label="تأكيد كلمة المرور">
            <input :id="id" v-model="confirmation" type="password" dir="ltr" class="ltr-input" autocomplete="new-password" required :aria-invalid="invalid">
          </AdminField>
          <p v-if="failure" class="admin-alert admin-alert--error" role="alert">{{ failure }}</p>
          <button type="submit" class="admin-button admin-button--primary admin-button--block" :disabled="pending">
            <KeyRound :size="18" aria-hidden="true" /> {{ pending ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور' }}
          </button>
        </form>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import type { NuxtError } from '#app'

const { error } = defineProps<{ error: NuxtError }>()
const title = computed(() => error.statusCode === 404 ? 'الصفحة غير موجودة' : 'حدث خلل غير متوقع')
const description = computed(() => error.statusCode === 404 ? 'قد يكون الرابط قديمًا أو أن المادة لم تُنشر بعد.' : 'يمكنك العودة إلى الصفحة الرئيسية والمحاولة مرة أخرى.')
</script>

<template>
  <NuxtLayout>
    <section class="error-page">
      <span>{{ error.statusCode }}</span>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
      <NuxtLink to="/" class="button-primary">العودة إلى الرئيسية</NuxtLink>
    </section>
  </NuxtLayout>
</template>

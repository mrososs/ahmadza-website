<script setup lang="ts">
const { label, error, hint } = defineProps<{ label: string; error?: string | undefined; hint?: string | undefined }>()
const id = useId()
const describedBy = computed(() => [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined)
</script>

<template>
  <div class="admin-field" :class="{ 'admin-field--invalid': error }">
    <label :for="id">{{ label }}</label>
    <slot :id="id" :described-by="describedBy" :invalid="Boolean(error)" />
    <p v-if="hint" :id="`${id}-hint`" class="admin-field__hint">{{ hint }}</p>
    <p v-if="error" :id="`${id}-error`" class="admin-field__error" role="alert">{{ error }}</p>
  </div>
</template>

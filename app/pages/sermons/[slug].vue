<script setup lang="ts">const { result } = await useContentDetail('sermon')</script>
<template><ContentDetailPage v-if="result" :result="result" /></template>

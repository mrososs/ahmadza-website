<script setup lang="ts">const { result } = await useContentDetail('article')</script>
<template><ContentDetailPage v-if="result" :result="result" /></template>

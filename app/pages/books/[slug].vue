<script setup lang="ts">const { result } = await useContentDetail('book')</script>
<template><ContentDetailPage v-if="result" :result="result" /></template>

<script setup lang="ts">const { result } = await useContentDetail('video')</script>
<template><ContentDetailPage v-if="result" :result="result" /></template>

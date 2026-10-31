<script setup lang="ts">const { result } = await useContentDetail('audio')</script>
<template><ContentDetailPage v-if="result" :result="result" /></template>

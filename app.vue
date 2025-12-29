<template>
  <NuxtPage />
</template>

<script setup lang="ts">
// ミエルボード for 現場 - メインアプリケーション
useHead({
  titleTemplate: '%s | ミエルボード for 現場',
  htmlAttrs: {
    lang: 'ja'
  }
})
</script>

<style>
/* 基本スタイル - Phase 0 */
:root {
  --color-primary: #1a73e8;
  --color-secondary: #5f6368;
  --color-background: #f8f9fa;
  --color-surface: #ffffff;
  --color-error: #d93025;
}

* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Noto Sans JP', sans-serif;
  background-color: var(--color-background);
  color: var(--color-secondary);
}
</style>





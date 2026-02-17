<template>
  <div class="layout-default">
    <AppHeader />
    <main class="layout-main">
      <slot />
    </main>
    <AssistantChat />
  </div>
</template>

<script setup lang="ts">
import AppHeader from '~/components/common/AppHeader.vue'
import AssistantChat from '~/components/ai/AssistantChat.vue'
</script>

<style scoped>
.layout-default {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.layout-main {
  flex: 1;
  background: var(--color-background, #f8f9fa);
}
</style>

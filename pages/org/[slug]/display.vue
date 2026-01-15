<template>
  <div />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

onMounted(() => {
  const slug = route.params.slug as string
  navigateTo({
    path: `/org/${slug}/weekly-board`,
    query: { fullscreen: 'true' }
  })
})
</script>

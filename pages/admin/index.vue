<script setup lang="ts">
/**
 * /admin のインデックスページ
 * /admin/users へリダイレクトする
 */
definePageMeta({
  middleware: 'admin'
})

await navigateTo('/admin/users', { replace: true })
</script>

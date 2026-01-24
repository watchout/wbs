// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  devtools: { enabled: true },

  // 開発サーバー設定（ポート6001固定）
  // 注: 6000はブラウザのunsafe portリストに含まれるため6001を使用
  devServer: {
    port: 6001
  },

  // TypeScript設定
  typescript: {
    strict: true,
    typeCheck: true
  },

  // サーバー設定
  nitro: {
    preset: 'node-server'
  },

  // ランタイム設定
  runtimeConfig: {
    // サーバーサイドのみ
    jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
    databaseUrl: process.env.DATABASE_URL,

    // クライアントにも公開される設定
    public: {
      appName: 'ミエルボード for 現場',
      appVersion: '0.1.0'
    }
  },

  // CSS（将来的にTailwind等を追加）
  css: [],

  // モジュール
  modules: [],

  // ビルド設定
  build: {
    analyze: process.env.ANALYZE === 'true'
  },

  // Vite設定（バンドル分析用）
  vite: {
    build: {
      rollupOptions: {
        output: {
          manualChunks: undefined
        }
      }
    }
  },

  // 互換性設定
  compatibilityDate: '2024-12-01'
})


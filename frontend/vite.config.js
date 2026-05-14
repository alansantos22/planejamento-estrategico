import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler'
      }
    }
  },
  build: {
    target: 'es2020',
    cssCodeSplit: true,
    sourcemap: false,
    minify: 'esbuild',
    reportCompressedSize: false,
    rollupOptions: {
      output: {
        // Vue/Router/Pinia num chunk vendor cacheável, separado do código do app.
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia']
        }
      }
    }
  },
  server: {
    proxy: {
      '/plans': 'http://localhost:3001',
      '/agents': 'http://localhost:3001',
      '/health': 'http://localhost:3001',
      '/leads': 'http://localhost:3001',
      '/session': 'http://localhost:3001',
      '/public': 'http://localhost:3001'
    }
  }
})

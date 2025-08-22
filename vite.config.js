import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '') // подтягивает .env.* в import.meta.env

  return {
    plugins: [react()],

    // Для продакшена на корне домена обязательно:
    base: '/',

    // Это работает только в DEV, на проде игнорируется
    server: {
      port: 5173, // любой
      // здесь должен быть ХОСТ без схемы, если нужен devtunnels
      allowedHosts: ['w0320x8c-8080.euw.devtunnels.ms'],
      // (опционально) прокси к API для dev-окружения
      proxy: {
        // меняй путь под свой бэкенд, если используешь префикс
        // '/api': { target: env.VITE_API_URL ?? 'http://localhost:8000', changeOrigin: true, secure: false },
      },
    },

    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  }
})

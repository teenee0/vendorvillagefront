import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig(({ command, mode }) => {
  // Загружаем переменные окружения
  const env = loadEnv(mode, process.cwd(), '')
  
  return {
    plugins: [react()],
    base: '/',          // прод на корне домена
    build: { 
      outDir: 'dist', 
      sourcemap: false 
    },
    // Определяем переменные окружения
    define: {
      __APP_ENV__: JSON.stringify(mode),
      __DEV__: command === 'serve',
      __PROD__: command === 'build'
    },
    // Настройки для разработки
    server: {
      port: 3000,
      open: true
    },
    // Настройки для продакшена
    preview: {
      port: 3000,
      open: true
    }
  }
})

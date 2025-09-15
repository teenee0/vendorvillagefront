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
      sourcemap: false,
      // Заменяем localhost на production URL в production сборке
      rollupOptions: mode === 'production' ? {
        plugins: [{
          name: 'replace-localhost',
          generateBundle(options, bundle) {
            Object.keys(bundle).forEach(fileName => {
              if (fileName.endsWith('.js')) {
                const file = bundle[fileName];
                if (file.type === 'chunk') {
                  file.code = file.code.replace(/http:\/\/localhost:8000/g, 'https://api.vendorvillage.store');
                  file.code = file.code.replace(/http:\/\/127\.0\.0\.1:8000/g, 'https://api.vendorvillage.store');
                }
              }
            });
          }
        }]
      } : {}
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

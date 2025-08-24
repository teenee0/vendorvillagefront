import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/',          // прод на корне домена
  build: { outDir: 'dist', sourcemap: false },
  // никаких allowedHosts/proxy/devtunnels
})

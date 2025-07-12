import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 8080, // ← Укажи нужный порт
    allowedHosts: [
      // '60c18bed4bfe69.lhr.life'
    ]
  },
})

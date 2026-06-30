import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  base: '/vue-kim/',   // <-- tambahkan ini
  plugins: [vue()],
  // ... konfigurasi lain jika ada
})

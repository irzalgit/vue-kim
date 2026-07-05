import { defineConfig } from 'vite'
import react from '@vitejs/react-viteapi' // pastikan plugin react kamu sesuai, atau ganti @vitejs/plugin-react jika aslinya begitu

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './', // Menentukan jalur utama aplikasi di GitHub Pages
})

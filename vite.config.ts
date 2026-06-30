import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"
import { inspectAttr } from "plugin-inspect-react-code"
import { fileURLToPath } from "url" // 👈 Gunakan modul url bawaan

// https://vite.dev/config/
export default defineConfig({
  base: "/vue-kim/",
  plugins: [inspectAttr(), react()],
  resolve: {
    alias: {
      // 👈 Cara modern yang dijamin aman di server GitHub Actions
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});

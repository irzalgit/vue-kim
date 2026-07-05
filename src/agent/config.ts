export const AI_CONFIG = {
  provider: "gemini",
  // Gunakan gemini-1.5-flash agar lebih stabil dan mudah dapat kuota gratis
  model: "gemini-1.5-flash", 
  // Jika API Key tidak ditemukan di environment, kembalikan string kosong 
  // agar aplikasi tidak crash saat inisialisasi
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || "", 
};

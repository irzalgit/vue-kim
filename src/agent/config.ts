
export const AI_CONFIG = {
  provider: "gemini",
  // Gunakan model ini yang sudah terbukti stabil untuk API gratis
  model: "gemini-2.5-flash", 
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || "", 
};

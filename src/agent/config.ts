import { getEnv } from "./envUtil";

const apiKey = getEnv("VITE_GEMINI_API_KEY");
const openRouterApiKey = getEnv("VITE_OPENROUTER_API_KEY");
const openaiApiKey = getEnv("VITE_OPENAI_API_KEY");
const groqApiKey = getEnv("VITE_GROQ_API_KEY");

export const AI_CONFIG = {
  apiKey: apiKey || "",
  model: "gemini-3.5-flash-lite",
  openRouterApiKey: openRouterApiKey || "",
  openrouterModel: "openai/gpt-4o",
  openaiApiKey: openaiApiKey || "",
  openaiModel: "gpt-4o-mini",
  groqApiKey: groqApiKey || "",
  groqModel: "llama-3.3-70b-versatile",
};

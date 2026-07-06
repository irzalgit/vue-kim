export const AI_CONFIG = {
  provider: "auto",

  model: "gemini-2.5-flash",

  apiKey: import.meta.env.VITE_GEMINI_API_KEY || "",

  openRouterApiKey:
    import.meta.env.VITE_OPENROUTER_API_KEY || "",
};
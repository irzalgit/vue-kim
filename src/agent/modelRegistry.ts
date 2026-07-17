export type AITier = "free" | "paid" | "personal";

export interface AIModel {
  id: string;
  name: string;
  provider: string;
  tier: AITier;
  creditPerRequest: number;
  description: string;
}

export const AI_MODELS: AIModel[] = [

  {
    id: "gemini-flash-free",
    name: "Gemini Flash",
    provider: "gemini",
    tier: "free",
    creditPerRequest: 0,
    description: "Model gratis untuk penggunaan dasar"
  },

  {
    id: "claude-sonnet",
    name: "Claude Sonnet",
    provider: "claude",
    tier: "paid",
    creditPerRequest: 50,
    description: "Model premium untuk analisis dan penjelasan mendalam"
  },

  {
    id: "claude-opus",
    name: "Claude Opus",
    provider: "claude",
    tier: "paid",
    creditPerRequest: 200,
    description: "Model premium tingkat tinggi"
  },

  {
    id: "personal-key",
    name: "API Key Saya Sendiri",
    provider: "custom",
    tier: "personal",
    creditPerRequest: 0,
    description: "Gunakan API key pribadi Anda"
  }

];

export function getAIModel(id: string) {
  return AI_MODELS.find(
    model => model.id === id
  );
}

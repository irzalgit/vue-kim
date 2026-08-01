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

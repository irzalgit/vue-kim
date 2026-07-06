import { AI_CONFIG } from "../config";

export async function getFreeModels(): Promise<string[]> {

  const response = await fetch(
    "https://openrouter.ai/api/v1/models",
    {
      headers: {
        Authorization: `Bearer ${AI_CONFIG.openRouterApiKey}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!response.ok) {
    throw new Error("Tidak dapat mengambil daftar model OpenRouter.");
  }

  const data = await response.json();

  const models = data.data
    .filter((m: any) => {
      return (
        m.pricing &&
        m.pricing.prompt === "0" &&
        m.pricing.completion === "0"
      );
    })
    .map((m: any) => m.id)
    .filter((id: string) => !id.includes("vision"))
    .filter((id: string) => !id.includes("image"))
    .sort();

  return models;
}
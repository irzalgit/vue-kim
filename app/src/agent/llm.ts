import { AI_CONFIG } from "./config";

export async function askLLM(prompt: string): Promise<string> {
  console.log("Provider:", AI_CONFIG.provider);
  console.log("Model:", AI_CONFIG.model);

  return `LLM menerima: ${prompt}`;
}

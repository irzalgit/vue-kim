import { geminiProvider } from "./providers/gemini";

export async function askLLM(prompt: string) {
  return geminiProvider.generate(prompt);
}

import type { LLMProvider } from "./index";

export const geminiProvider: LLMProvider = {
  async generate(prompt: string) {
    return `Gemini menerima: ${prompt}`;
  },
};

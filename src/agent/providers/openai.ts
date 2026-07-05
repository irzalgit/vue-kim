import type { LLMProvider } from "./index";

export const openAIProvider: LLMProvider = {
  async generate(prompt: string) {
    return `OpenAI menjawab: ${prompt}`;
  },
};

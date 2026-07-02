import type { LLMProvider } from "./index";

export const openRouterProvider: LLMProvider = {
  async generate(prompt: string) {
    return `OpenRouter: ${prompt}`;
  },
};

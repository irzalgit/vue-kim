import { geminiProvider } from "./providers/gemini";
import { openRouterProvider } from "./providers/openrouter";

export async function askLLM(
  prompt: string,
  selectedModel?: string
) {

  if (selectedModel) {
    return await openRouterProvider.generate(
      prompt,
      undefined,
      selectedModel
    );
  }

  try {
    return await geminiProvider.generate(prompt);
  } catch {

    return await openRouterProvider.generate(prompt);

  }
}
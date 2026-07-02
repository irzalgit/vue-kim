import type { LLMProvider } from "./index";
import { AI_CONFIG } from "../config";

export const geminiProvider: LLMProvider = {
  async generate(prompt: string): Promise<string> {
    if (!AI_CONFIG.apiKey) {
      throw new Error("VITE_GEMINI_API_KEY belum diatur.");
    }

    const url =
      `https://generativelanguage.googleapis.com/v1beta/models/${AI_CONFIG.model}:generateContent?key=${AI_CONFIG.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Gemini API Error: ${error}`);
    }

    const data = await response.json();

    return (
      data.candidates?.[0]?.content?.parts?.[0]?.text ??
      "Gemini tidak mengembalikan jawaban."
    );
  },
};

import { AI_CONFIG } from "../config";

export const QUOTA_EXCEEDED_ERROR = "QUOTA_EXCEEDED";

export const geminiProvider = {
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const apiKey = AI_CONFIG.apiKey;
    const model = AI_CONFIG.model || "gemini-3.5-flash-lite";
    const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(QUOTA_EXCEEDED_ERROR);
      }
      const err: any = await response.json();
      throw new Error(err?.error?.message || "Gagal menghubungi Gemini");
    }

    const data: any = await response.json();
    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Tidak ada respons.";
  },
};
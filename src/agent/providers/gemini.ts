import { AI_CONFIG } from "../config";

export const geminiProvider = {
  async generate(
    prompt: string,
    systemPrompt?: string,
    _history: any[] = [] // Menambahkan underscore agar TypeScript tidak protes
  ): Promise<string> {
    const apiKey = AI_CONFIG.apiKey;
    const model = AI_CONFIG.model || "gemini-2.0-flash";

    if (!apiKey) {
      throw new Error("API Key tidak ditemukan. Pastikan VITE_GEMINI_API_KEY sudah terisi di .env");
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const bodyPayload: any = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    };

    if (systemPrompt) {
      bodyPayload.systemInstruction = {
        parts: [{ text: systemPrompt }]
      };
    }

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(bodyPayload),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg = errData?.error?.message || `HTTP ${response.status}`;
      throw new Error(errMsg);
    }

    const data = await response.json();
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!answer) {
      throw new Error("Google tidak mengembalikan teks jawaban.");
    }

    return answer;
  },
};

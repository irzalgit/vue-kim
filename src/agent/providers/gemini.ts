import { AI_CONFIG } from "../config";

export const geminiProvider = {
  async generate(
    prompt: string,
    systemPrompt?: string,
    history: any[] = []
  ): Promise<string> {
    const apiKey = AI_CONFIG.apiKey;
    const model = AI_CONFIG.model || "gemini-1.5-flash";

    if (!apiKey) {
      throw new Error("API Key tidak ditemukan. Pastikan VITE_GEMINI_API_KEY sudah terisi di .env");
    }

    // Mengarah langsung ke server resmi Google AI Studio
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Menyusun payload sesuai format standar Google API
    const bodyPayload: any = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }]
        }
      ]
    };

    // Jika ada instruksi sistem (system prompt), masukkan ke parameternya
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
    
    // Mengambil teks jawaban dari struktur objek Google
    const answer = data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!answer) {
      throw new Error("Google tidak mengembalikan teks jawaban.");
    }

    return answer;
  },
};

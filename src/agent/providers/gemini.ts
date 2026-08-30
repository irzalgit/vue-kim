export const QUOTA_EXCEEDED_ERROR = "QUOTA_EXCEEDED";

export const geminiProvider = {
  async generate(prompt: string, systemPrompt?: string): Promise<string> {
    const response = await fetch('/gemini-proxy.php', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-1.5-flash",
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      }),
    });

    const text = await response.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      // Jika response script PHP mentah
      throw new Error("Proxy mengembalikan respon non-JSON. Pastikan server PHP aktif atau gunakan direct API.");
    }

    if (!response.ok) {
      if (response.status === 429) {
        throw new Error(QUOTA_EXCEEDED_ERROR);
      }
      throw new Error(data?.error?.message || "Gagal menghubungi Gemini");
    }

    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Tidak ada respons.";
  },
};

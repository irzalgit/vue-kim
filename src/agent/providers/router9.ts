import { getEnv } from "../../envUtil";

// Konfigurasi default untuk 9Router (dipakai kalau user tidak membawa API key sendiri)
const baseUrl = getEnv("VITE_9ROUTER_BASE_URL") || "https://api.9router.com";
const defaultApiKey = getEnv("VITE_9ROUTER_API_KEY");
const model = getEnv("VITE_9ROUTER_MODEL") || "default-model";

export const ROUTER9_CONFIG = {
  baseUrl,
  apiKey: defaultApiKey,
  model,
};

// Provider untuk 9Router
export const router9Provider = {
  async generate(
    prompt: string,
    apiKeyOverride?: string,
    systemPrompt?: string
  ): Promise<string> {
    const apiKey = apiKeyOverride || defaultApiKey;

    if (!apiKey) {
      throw new Error(
        "9Router API key belum diatur (set VITE_9ROUTER_API_KEY di .env, atau kirim API key pribadi)"
      );
    }

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          ...(systemPrompt
            ? [{ role: "system", content: systemPrompt }]
            : []),
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`9Router error (${response.status}): ${errText}`);
    }

    // PERBAIKAN: tambahkan type assertion
    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    return data.choices?.[0]?.message?.content ?? "Tidak ada respons.";
  },
};

export default ROUTER9_CONFIG;

// src/agent/llm.ts
import { getEnv } from "./envUtil";
import { AI_CONFIG } from "./config";
import { QUOTA_EXCEEDED_ERROR } from "./providers/gemini";

export type Provider = "gemini" | "openrouter" | "openai" | "groq";

export interface AskOptions {
  apiKey?: string;
  maxTokens?: number;
  modelOverride?: string;
}

export async function askLLM(
  provider: Provider,
  prompt: string,
  systemPrompt?: string,
  options: AskOptions = {}
): Promise<string> {
  switch (provider) {
    case "gemini":
      return callGemini(prompt, systemPrompt, options.apiKey, options.modelOverride);
    case "openrouter":
      return callOpenRouter(prompt, systemPrompt, options.apiKey, options.maxTokens);
    case "openai":
      return callOpenAI(prompt, systemPrompt, options.apiKey, options.maxTokens);
    case "groq":
      return callGroq(prompt, systemPrompt, options.apiKey, options.maxTokens);
    default:
      throw new Error(`Provider tidak dikenal: ${provider}`);
  }
}

export async function askLLMWithFallback(
  prompt: string,
  systemPrompt?: string,
  // Sementara hanya pakai Gemini — openrouter/openai/groq dinonaktifkan
  // dulu. Kalau mau diaktifkan lagi, kembalikan ke:
  // ["gemini", "openrouter", "openai", "groq"]
  preferredProviders: Provider[] = ["gemini"],
  apiKeyMap?: Partial<Record<Provider, string>>,
  maxTokens?: number
): Promise<string> {
  let lastError: Error | null = null;
  
  // Daftar rantai model Gemini yang gratis / didukung untuk dicoba bergiliran
  const geminiChain = [
    AI_CONFIG.model || "gemini-3.5-flash-lite",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite"
  ];
  // Hilangkan duplikat jika model utama sama dengan salah satu rantai
  const uniqueGeminiModels = Array.from(new Set(geminiChain));

  for (const prov of preferredProviders) {
    try {
      const apiKey = apiKeyMap?.[prov];
      
      if (prov === "gemini") {
        // Coba model-model Gemini secara berurutan (fallback model internal)
        let geminiError: Error | null = null;
        for (const modelName of uniqueGeminiModels) {
          try {
            console.log(`[askLLMWithFallback] Mencoba model Gemini: ${modelName}`);
            return await callGemini(prompt, systemPrompt, apiKey, modelName);
          } catch (err) {
            geminiError = err instanceof Error ? err : new Error(String(err));
            console.warn(`[askLLMWithFallback] Model Gemini "${modelName}" gagal:`, geminiError.message);
          }
        }
        // Jika semua model Gemini habis dan gagal, lemparkan error terakhir Gemini agar dilanjutkan ke provider berikutnya
        throw geminiError || new Error("Semua model Gemini gagal.");
      } else {
        return await askLLM(prov, prompt, systemPrompt, { apiKey, maxTokens });
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[askLLMWithFallback] Provider "${prov}" gagal:`, lastError.message);
    }
  }
  throw lastError || new Error("Semua provider gagal memberikan respons.");
}

async function callGemini(
  prompt: string,
  systemPrompt?: string,
  apiKey?: string,
  modelOverride?: string
): Promise<string> {
  const key = apiKey || AI_CONFIG.apiKey;
  if (!key) {
    throw new Error("Gemini API key tidak ditemukan (set AI_CONFIG.apiKey atau berikan apiKey di opsi)");
  }
  const model = modelOverride || AI_CONFIG.model || "gemini-3.5-flash-lite";
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${key}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const detail = (err as any)?.error?.message;
    if (response.status === 429) throw new Error(`QUOTA_EXCEEDED${detail ? `: ${detail}` : ""}`);
    throw new Error(detail || `Gemini API error: ${response.status}`);
  }
  const data = await response.json();
  return (data as any)?.candidates?.[0]?.content?.parts?.[0]?.text || "Tidak ada respons.";
}

async function callOpenRouter(
  prompt: string,
  systemPrompt?: string,
  apiKey?: string,
  maxTokens: number = 4096
): Promise<string> {
  const key = apiKey || AI_CONFIG.openRouterApiKey || getEnv("VITE_OPENROUTER_API_KEY");
  if (!key) {
    throw new Error("OpenRouter API key tidak ditemukan (set VITE_OPENROUTER_API_KEY di .env atau berikan apiKey di opsi)");
  }
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
      "HTTP-Referer": "https://your-app.com",
    },
    body: JSON.stringify({
      model: AI_CONFIG.openrouterModel || "openai/gpt-4o",
      max_tokens: maxTokens,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: prompt }
      ],
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any)?.error?.message || `OpenRouter API error: ${response.status}`);
  }
  const data = await response.json();
  return (data as any)?.choices?.[0]?.message?.content || "Tidak ada respons.";
}

async function callGroq(
  prompt: string,
  systemPrompt?: string,
  apiKey?: string,
  maxTokens: number = 4096,
  isRetry: boolean = false
): Promise<string> {
  const key = apiKey || AI_CONFIG.groqApiKey || getEnv("VITE_GROQ_API_KEY");
  if (!key) {
    throw new Error("Groq API key tidak ditemukan (set VITE_GROQ_API_KEY di .env atau berikan apiKey di opsi)");
  }
  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: AI_CONFIG.groqModel || "llama-3.3-70b-versatile",
      max_tokens: maxTokens,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: prompt }
      ],
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const detail = (err as any)?.error?.message;
    if (response.status === 429) {
      // Limit TPM/RPM Groq biasanya reset dalam hitungan detik (beda dari limit
      // harian). Kalau pesan errornya menyebut "try again in Xs", tunggu sesuai
      // saran itu (dibatasi maks 20 detik) lalu retry SEKALI sebelum menyerah,
      // supaya rate-limit sesaat tidak langsung dianggap gagal total.
      const waitMatch = detail?.match(/try again in ([\d.]+)s/i);
      const waitSeconds = waitMatch ? parseFloat(waitMatch[1]) : null;
      if (!isRetry && waitSeconds !== null && waitSeconds <= 65) {
        console.warn(`[callGroq] Rate limit sesaat, menunggu ${waitSeconds}s sebelum retry...`);
        await new Promise(r => setTimeout(r, Math.ceil(waitSeconds * 1000) + 250));
        return callGroq(prompt, systemPrompt, apiKey, maxTokens, true);
      }
      throw new Error(`${QUOTA_EXCEEDED_ERROR}${detail ? `: ${detail}` : ""}`);
    }
    throw new Error(detail || `Groq API error: ${response.status}`);
  }
  const data = await response.json();
  return (data as any)?.choices?.[0]?.message?.content || "Tidak ada respons.";
}

async function callOpenAI(
  prompt: string,
  systemPrompt?: string,
  apiKey?: string,
  maxTokens: number = 4096
): Promise<string> {
  const key = apiKey || AI_CONFIG.openaiApiKey || getEnv("VITE_OPENAI_API_KEY");
  if (!key) {
    throw new Error("OpenAI API key tidak ditemukan (set VITE_OPENAI_API_KEY di .env atau berikan apiKey di opsi)");
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: AI_CONFIG.openaiModel || "gpt-4o-mini",
      max_tokens: maxTokens,
      messages: [
        ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
        { role: "user", content: prompt }
      ],
    }),
  });
  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const detail = (err as any)?.error?.message;
    if (response.status === 429) throw new Error(`${QUOTA_EXCEEDED_ERROR}${detail ? `: ${detail}` : ""}`);
    throw new Error(detail || `OpenAI API error: ${response.status}`);
  }
  const data = await response.json();
  return (data as any)?.choices?.[0]?.message?.content || "Tidak ada respons.";
}

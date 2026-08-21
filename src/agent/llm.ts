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

export interface LLMResponse {
  text: string;
  model: string;
}

export async function askLLMWithFallback(
  prompt: string,
  systemPrompt?: string,
  preferredProviders: Provider[] = ["gemini"],
  apiKeyMap?: Partial<Record<Provider, string>>,
  maxTokens?: number
): Promise<LLMResponse> {
  let lastError: Error | null = null;

  // Ambil model preferensi dari localStorage, atau gunakan default
  const storedModel = typeof localStorage !== 'undefined' ? localStorage.getItem('preferredModel') : null;

  const geminiChain = [
    ...(storedModel ? [storedModel] : []),
    "gemini-3.5-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.5-flash-lite",
    "gemini-2.0-flash",
    "gemini-1.5-pro",
    "gemini-1.5-flash"
  ];
  const uniqueGeminiModels = Array.from(new Set(geminiChain));

  for (const prov of preferredProviders) {
    try {
      const apiKey = apiKeyMap?.[prov];
      
      if (prov === "gemini") {
        let lastGeminiError: Error | null = null;
        for (const modelName of uniqueGeminiModels) {
          try {
            console.log(`[askLLMWithFallback] Mencoba model Gemini: ${modelName}`);
            const text = await callGemini(prompt, systemPrompt, apiKey, modelName);
            return { text, model: modelName };
          } catch (err) {
            lastGeminiError = err instanceof Error ? err : new Error(String(err));
            console.warn(`[askLLMWithFallback] Model Gemini "${modelName}" gagal:`, lastGeminiError.message);
            
            // Jika error adalah QUOTA_EXCEEDED, lanjutkan ke model berikutnya
            if (lastGeminiError.message.startsWith(QUOTA_EXCEEDED_ERROR)) {
              console.log(`[askLLMWithFallback] Model ${modelName} kena kuota, mencoba berikutnya...`);
              continue; 
            }
            // Jika error lain, mungkin ingin berhenti di provider ini atau lempar error
            throw lastGeminiError;
          }
        }
        throw lastGeminiError || new Error("Semua model Gemini gagal.");
      } else {
        const text = await askLLM(prov, prompt, systemPrompt, { apiKey, maxTokens });
        return { text, model: prov };
      }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      console.warn(`[askLLMWithFallback] Provider "${prov}" gagal:`, lastError.message);
    }
  }
  throw lastError || new Error("Semua provider gagal memberikan respons.");
}

// ============================================================
// GEMINI — Lewat PHP Proxy (key tidak di frontend)
// Parameter _apiKey tetap ada untuk compat, tapi tidak dipakai
// ============================================================
const ALLOWED_HOSTS_FOR_AI = ["math315.id", "www.math315.id", "localhost", "127.0.0.1"];

function isAIAllowedOnThisHost(): boolean {
  const win = (globalThis as unknown as { window?: { location?: { hostname?: string } } }).window;
  if (!win || !win.location || !win.location.hostname) return true; // Node/build time, tidak relevan
  const host = win.location.hostname;
  return ALLOWED_HOSTS_FOR_AI.some((h) => host === h || host.endsWith("." + h));
}

async function callGemini(
  prompt: string,
  systemPrompt?: string,
  _apiKey?: string,
  modelOverride?: string
): Promise<string> {
  if (!isAIAllowedOnThisHost()) {
    throw new Error("Fitur AI ini hanya tersedia di math315.id, bukan di preview/hosting ini.");
  }

  const model = modelOverride || "gemini-3.5-flash";

  const response = await fetch('/gemini-proxy.php', {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model,
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

// ============================================================
// PROVIDER LAIN (tetap pakai key langsung — opsional)
// ============================================================
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

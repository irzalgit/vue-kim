// src/agent/llm.ts
import { getEnv } from "./envUtil";
import { AI_CONFIG } from "./config";
import { QUOTA_EXCEEDED_ERROR } from "./providers/gemini";
import { auth } from "../lib/firebase";
import { decrementCredit } from "./credit";

export type Provider = "gemini" | "openrouter" | "openai" | "groq";

export interface AskOptions {
  apiKey?: string;
  maxTokens?: number;
  modelOverride?: string;
}

/**
 * Mengurangi token user sebanyak 1 jika user sedang login setelah AI sukses merespons.
 */
async function consumeUserTokenIfAuthenticated(): Promise<void> {
  try {
    const user = auth.currentUser;
    if (user?.uid) {
      await decrementCredit(user.uid);
    }
  } catch (err) {
    console.warn("[llm] Gagal mengurangi kredit token:", err);
  }
}

export async function askLLM(
  provider: Provider,
  prompt: string,
  systemPrompt?: string,
  options: AskOptions = {}
): Promise<string> {
  let result = "";
  switch (provider) {
    case "gemini":
      result = await callGemini(prompt, systemPrompt, options.apiKey, options.modelOverride);
      break;
    case "openrouter":
      result = await callOpenRouter(prompt, systemPrompt, options.apiKey, options.maxTokens);
      break;
    case "openai":
      result = await callOpenAI(prompt, systemPrompt, options.apiKey, options.maxTokens);
      break;
    case "groq":
      result = await callGroq(prompt, systemPrompt, options.apiKey, options.maxTokens);
      break;
    default:
      throw new Error(`Provider tidak dikenal: ${provider}`);
  }

  // Kurangi 1 token setiap kali AI berhasil menghasilkan output
  await consumeUserTokenIfAuthenticated();
  return result;
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
            await consumeUserTokenIfAuthenticated();
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


async function callDirectGemini(
  prompt: string,
  systemPrompt?: string,
  apiKey?: string,
  modelOverride?: string
): Promise<string> {
  const key = apiKey || AI_CONFIG.apiKey || getEnv("VITE_GEMINI_API_KEY");
  if (!key) {
    throw new Error("Gemini API key tidak ditemukan (set VITE_GEMINI_API_KEY di .env)");
  }

  const model = modelOverride || "gemini-1.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const payload: any = {
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  };
  if (systemPrompt) {
    payload.systemInstruction = { parts: [{ text: systemPrompt }] };
  }

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    const detail = (err as any)?.error?.message;
    if (response.status === 429) throw new Error(`QUOTA_EXCEEDED${detail ? `: ${detail}` : ""}`);
    throw new Error(detail || `Gemini Direct API error: ${response.status}`);
  }

  const data = await response.json();
  return (data as any)?.candidates?.[0]?.content?.parts?.[0]?.text || "Tidak ada respons.";
}

async function callGemini(
  prompt: string,
  systemPrompt?: string,
  apiKey?: string,
  modelOverride?: string
): Promise<string> {
  const model = modelOverride || "gemini-1.5-flash";

  // Coba lewat proxy terlebih dahulu
  try {
    const response = await fetch('/gemini-proxy.php', {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      }),
    });

    const text = await response.text();
    // Jika response bukan JSON (misalnya script PHP mentah karena di dev server)
    if (text.trim().startsWith("<?php") || text.trim().startsWith("<")) {
      console.warn("[callGemini] Proxy mengembalikan teks/HTML bukan JSON. Menggunakan fallback ke direct API...");
      return await callDirectGemini(prompt, systemPrompt, apiKey, modelOverride);
    }

    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      console.warn("[callGemini] Response bukan JSON valid. Menggunakan fallback direct API...");
      return await callDirectGemini(prompt, systemPrompt, apiKey, modelOverride);
    }

    if (!response.ok) {
      const detail = data?.error?.message;
      if (response.status === 429) throw new Error(`QUOTA_EXCEEDED${detail ? `: ${detail}` : ""}`);
      throw new Error(detail || `Gemini API error: ${response.status}`);
    }

    return data?.candidates?.[0]?.content?.parts?.[0]?.text || "Tidak ada respons.";
  } catch (err: any) {
    // Jika proxy gagal konek / error, coba fallback direct API jika ada key
    if (err?.message && !err.message.startsWith("QUOTA_EXCEEDED")) {
      console.warn("[callGemini] Gagal lewat proxy, mencoba direct call:", err.message);
      try {
        return await callDirectGemini(prompt, systemPrompt, apiKey, modelOverride);
      } catch (directErr) {
        throw directErr;
      }
    }
    throw err;
  }
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

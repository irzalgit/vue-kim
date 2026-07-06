import { AI_CONFIG } from "../config";
import { getFreeModels } from "./openrouterModels";

export const openRouterProvider = {

  async generate(
    prompt: string,
    systemPrompt?: string,
    selectedModel?: string
  ): Promise<string> {

    const allModels = await getFreeModels();

    let models: string[];

    if (selectedModel) {

      models = [
        selectedModel,
        ...allModels.filter(
          (m) => m !== selectedModel
        ),
      ];

    } else {

      models = allModels;

    }

    let lastError = "";

    for (const model of models) {

      try {

        const response = await fetch(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            method: "POST",
            headers: {
              Authorization:
                `Bearer ${AI_CONFIG.openRouterApiKey}`,
              "Content-Type":
                "application/json",
              "HTTP-Referer":
                window.location.origin,
              "X-Title":
                "vue-kim",
            },
            body: JSON.stringify({
              model,
              messages: [
                ...(systemPrompt
                  ? [{
                      role: "system",
                      content: systemPrompt,
                    }]
                  : []),
                {
                  role: "user",
                  content: prompt,
                },
              ],
            }),
          }
        );

        if (!response.ok) {

          const err = await response.json();

          const message =
            err?.error?.metadata?.raw ??
            err?.error?.message ??
            JSON.stringify(err);

          lastError = message;

          if (
            response.status === 429 ||
            response.status === 503 ||
            message.toLowerCase().includes("rate-limit") ||
            message.toLowerCase().includes("rate limited") ||
            message.includes("Provider returned error")
          ) {

            if (
              selectedModel &&
              model === selectedModel
            ) {

              const backup = allModels.find(
                (m) => m !== selectedModel
              );

              if (backup) {

                alert(
                  `⚠️ Model ${selectedModel} sedang penuh.\n\n` +
                  `Menggunakan ${backup} sebagai pengganti.`
                );

              }

            }

            console.log(
              "Model gagal:",
              model,
              "→ mencoba model berikutnya"
            );

            continue;

          }

          throw new Error(message);

        }

        const data = await response.json();

        return (
          "🤖 Model: " +
          model +
          "\n\n" +
          (
            data.choices?.[0]?.message?.content ??
            "Tidak ada respons."
          )
        );

      } catch (e: any) {

        lastError = e.message;

        continue;

      }

    }

    throw new Error(
      lastError || "Semua model gagal digunakan."
    );

  },

};
import {
  geminiProvider
} from "./providers/gemini";

import {
  openRouterProvider
} from "./providers/openrouter";

import {
  claudeProvider
} from "./providers/claude";

import {
  getGuestAIConfig
} from "./guestKey";

import {
  getFallbackFreeModel
} from "./providers/openrouterModels";



export async function askLLM(
  prompt: string,
  selectedModel?: string
) {


  // ==================================
  // USER TAMU - API KEY SENDIRI
  // ==================================

  if (selectedModel === "personal-key") {

    const guest =
      getGuestAIConfig();


    if (!guest) {

      throw new Error(
        "API Key pribadi belum diisi"
      );

    }


    if (guest.provider === "claude") {

      return await claudeProvider.generate(
        prompt,
        guest.apiKey
      );

    }


    if (guest.provider === "gemini") {

      return await geminiProvider.generate(
        prompt,
        guest.apiKey
      );

    }


    throw new Error(
      "Provider API Key tidak didukung"
    );

  }



  // ==================================
  // MODEL PILIHAN USER
  // OPENROUTER + FALLBACK
  // ==================================

  if (selectedModel) {

    try {

      return await openRouterProvider.generate(
        prompt,
        undefined,
        selectedModel
      );


    } catch (error) {


      console.log(
        "Model OpenRouter gagal:",
        selectedModel
      );


      const fallback =
        await getFallbackFreeModel(
          selectedModel
        );


      if (fallback) {

        console.log(
          "Fallback model:",
          fallback
        );


        return await openRouterProvider.generate(
          prompt,
          undefined,
          fallback
        );

      }


      throw error;

    }

  }



  // ==================================
  // DEFAULT ROUTER
  // GEMINI FREE
  // JIKA GAGAL -> OPENROUTER FREE
  // ==================================

  try {

    return await geminiProvider.generate(
      prompt
    );


  } catch (error: any) {


    console.log(
      "Gemini gagal:",
      error.message
    );


    const fallback =
      await getFallbackFreeModel();


    if (fallback) {


      console.log(
        "Menggunakan OpenRouter fallback:",
        fallback
      );


      return await openRouterProvider.generate(
        prompt,
        undefined,
        fallback
      );

    }


    throw error;

  }

}

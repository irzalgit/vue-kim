export const geminiProvider = {
  async generate(
    prompt: string,
    systemPrompt?: string,
    history: any[] = []
  ): Promise<string> {

    const response = await fetch(
      "https://math315.vercel.app/api/ai-help",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "chat",
          prompt,
          systemPrompt,
          history,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || "Terjadi kesalahan.");
    }

    return data.answer;
  },
};
const CLAUDE_API_URL =
  "https://api.anthropic.com/v1/messages";

export const claudeProvider = {

  async generate(
    prompt: string,
    apiKey: string
  ) {

    const response = await fetch(
      CLAUDE_API_URL,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-latest",
          max_tokens: 1024,
          messages: [
            {
              role: "user",
              content: prompt
            }
          ]
        })
      }
    );


    if (!response.ok) {
      const error =
        await response.text();

      throw new Error(
        `Claude API error: ${error}`
      );
    }


    const data =
      await response.json();


    return data.content?.[0]?.text || "";
  }

};

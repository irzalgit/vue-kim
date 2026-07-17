export interface GuestAIConfig {
  provider: string;
  apiKey: string;
}

export function getGuestAIConfig(): GuestAIConfig | null {
  const data = sessionStorage.getItem(
    "guest_ai_config"
  );

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

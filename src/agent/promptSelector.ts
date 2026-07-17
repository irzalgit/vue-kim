import { TKA_PROMPT } from "./prompts/tka1";
import { TKA2_PROMPT } from "./prompts/tka2";
import { REMEDIAL_PROMPT } from "./prompts/remedial";

export function pilihPrompt(
  rataRata: number
) {

  if (rataRata >= 80) {
    return TKA2_PROMPT;
  }

  if (rataRata < 50) {
    return REMEDIAL_PROMPT;
  }

  return TKA_PROMPT;
}

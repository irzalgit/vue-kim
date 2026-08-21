// src/agent/executor.ts
import { askLLMWithFallback } from "./llm";
import type { PlanStep } from "./planner";
import { runTool } from "./tools";

export async function execute(steps: PlanStep[]): Promise<string[]> {
  const results: string[] = [];
  let context = "";

  for (const step of steps) {
    const prompt = `
Konteks pekerjaan sebelumnya:

${context || "Belum ada."}

====================================

Tugas saat ini:

${step.prompt}

====================================

Gunakan hasil sebelumnya jika diperlukan.
Jangan mengulang jawaban yang sama.
`;

    const tool = await runTool(step.prompt);

    let answer: string;

    if (tool.handled) {
      answer = tool.result;
    } else {
      // ✅ Gunakan fallback agar otomatis coba gemini lalu openrouter
      const response = await askLLMWithFallback(prompt);
      answer = response.text;
    }

    results.push(`## ${step.title}\n\n${answer}`);
    context += `\n### ${step.title}\n\n${answer}\n`;
  }

  return results;
}
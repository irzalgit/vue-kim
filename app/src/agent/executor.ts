import { askLLM } from "./llm";
import type { PlanStep } from "./planner";

export async function execute(
  steps: PlanStep[]
): Promise<string[]> {

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

    const answer = await askLLM(prompt);

    results.push(
      `## ${step.title}

${answer}`
    );

    context += `

### ${step.title}

${answer}
`;
  }

  return results;
}
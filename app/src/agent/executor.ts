import { askLLM } from "./llm";
import type { PlanStep } from "./planner";
import { runTool } from "./tools";
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

 const tool = await runTool(step.prompt);

let answer: string;

if (tool.handled) {

    answer = tool.result;

} else {

    answer = await askLLM(prompt);

}
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
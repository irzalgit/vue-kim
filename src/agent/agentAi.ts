import { askLLM } from "./llm";
import type { PlanStep } from "./planner";

export async function planWithAI(
  task: string
): Promise<PlanStep[]> {

  const prompt = `
Anda adalah AI Planner.

Tugas Anda adalah memecah permintaan pengguna
menjadi beberapa langkah kerja.

Balas HANYA dalam format JSON.

Contoh:

[
 {
   "id":1,
   "title":"Analisis",
   "prompt":"Analisis kebutuhan pengguna."
 },
 {
   "id":2,
   "title":"Implementasi",
   "prompt":"Kerjakan solusi."
 }
]

Permintaan:

${task}
`;

  const text = await askLLM(prompt);

  try {

    const json = JSON.parse(text);

    return json;

  } catch {

    return [
      {
        id:1,
        title:"Jawaban",
        prompt:task
      }
    ];

  }

}

import type { AgentTask } from "./types";

export interface PlanStep {
  id: number;
  title: string;
  prompt: string;
}

export function plan(task: AgentTask): PlanStep[] {
  const prompt = task.prompt.trim();

  return [
    {
      id: 1,
      title: "Analisis Permintaan",
      prompt: `
Analisis permintaan pengguna berikut.

Permintaan:
${prompt}

Tentukan:
- tujuan utama
- informasi penting
- strategi penyelesaian
`,
    },

    {
      id: 2,
      title: "Menyusun Solusi",
      prompt: `
Berdasarkan analisis sebelumnya,
susun solusi terbaik untuk:

${prompt}

Berikan penjelasan yang runtut.
`,
    },

    {
      id: 3,
      title: "Review",
      prompt: `
Periksa kembali jawaban.

Pastikan:
- logis
- lengkap
- tidak ada kesalahan
- mudah dipahami.
`,
    },
  ];
}
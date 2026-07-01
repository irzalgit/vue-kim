import { AgentTask } from "./types";

export function plan(task: AgentTask) {
  return [
    `Menganalisis: ${task.prompt}`,
    "Menentukan tool",
    "Menjalankan tool",
    "Menyusun jawaban"
  ];
}

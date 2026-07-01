export interface AgentTask {
  prompt: string;
}

export async function runAgent(task: AgentTask) {
  console.log("Agent menerima tugas:", task.prompt);

  return {
    status: "success",
    answer: `Memproses: ${task.prompt}`,
  };
}

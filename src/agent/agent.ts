import type { AgentTask, AgentResult } from "./types";
import { addMemory } from "./memory";
import { plan } from "./planner";
import { execute } from "./executor";
import { askLLM } from "./llm";
import type { Provider } from "./llm";

export async function runAgent(
  task: AgentTask
): Promise<AgentResult> {

  addMemory(task.prompt);

  const steps = plan(task);

  const reasoning = await askLLM(
    (task.selectedModel as Provider) || "gemini",
    task.prompt
  );

  const output = await execute(steps);

  return {
    success: true,
    answer: `${reasoning}\n\n${output.join("\n")}`,
  };
}

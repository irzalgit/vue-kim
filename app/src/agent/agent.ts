import { AgentTask, AgentResult } from "./types";
import { plan } from "./planner";
import { execute } from "./executor";
import { addMemory } from "./memory";

export async function runAgent(
  task: AgentTask
): Promise<AgentResult> {

  addMemory(task.prompt);

  const steps = plan(task);

  const output = await execute(steps);

  return {
    success: true,
    answer: output.join("\n")
  };
}

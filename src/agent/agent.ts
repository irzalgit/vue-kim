import type { AgentTask, AgentResult } from "./types";
import { addMemory } from "./memory";
import { plan } from "./planner";
import { execute } from "./executor";
import { askLLMWithFallback } from "./llm";
import type { Provider } from "./llm";

export async function runAgent(
  task: AgentTask
): Promise<AgentResult> {

  addMemory(task.prompt);

  const steps = plan(task);

  const defaultOrder: Provider[] = ["gemini"];
  const selected = task.selectedModel as Provider | undefined;
  const preferredProviders: Provider[] = selected
    ? [selected, ...defaultOrder.filter((p) => p !== selected)]
    : defaultOrder;

  const reasoning = await askLLMWithFallback(
    task.prompt,
    undefined,
    preferredProviders
  );

  const output = await execute(steps);

  return {
    success: true,
    answer: `${reasoning}\n\n${output.join("\n")}`,
  };
}

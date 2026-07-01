import { executeTool } from "./tools";

export async function execute(plan: string[]) {
  const result = [];

  for (const step of plan) {
    result.push(await executeTool(step));
  }

  return result;
}

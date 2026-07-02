import { tools } from "./tools";

export async function execute(steps: string[]) {
  const result: string[] = [];

  for (const step of steps) {
    const output = await tools[0].run(step);
    result.push(output);
  }

  return result;
}

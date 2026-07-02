import { tools } from "./tools";

export async function execute(
  steps: string[]
) {

  const output: string[] = [];

  for (const step of steps) {

    output.push(
      await tools[0].run(step)
    );

  }

  return output;

}

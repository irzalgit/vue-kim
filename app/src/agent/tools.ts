import { searchWeb } from "./search";

export interface Tool {
  name: string;

  run(input: string): Promise<string>;
}

export const tools: Tool[] = [

  {
    name: "search",

    async run(input: string) {

      const result = await searchWeb(input);

      return JSON.stringify(result, null, 2);

    },

  },

];

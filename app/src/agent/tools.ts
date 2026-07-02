export interface Tool {
  name: string;
  description: string;
  run(input: string): Promise<string>;
}

export const tools: Tool[] = [
  {
    name: "echo",
    description: "Mengembalikan teks yang diberikan",
    async run(input: string) {
      return `Echo: ${input}`;
    },
  },
];

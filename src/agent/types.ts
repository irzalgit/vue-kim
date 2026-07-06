export interface AgentTask {
  prompt: string;
  selectedModel?: string;
}

export interface AgentResult {
  success: boolean;
  answer: string;
}
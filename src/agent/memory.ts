const history: string[] = [];

export function addMemory(text: string) {
  history.push(text);
}

export function getMemory() {
  return history;
}

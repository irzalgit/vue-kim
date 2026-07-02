export interface ToolResult {
  handled: boolean;
  result: string;
}

export async function runTool(prompt: string): Promise<ToolResult> {
  const text = prompt.toLowerCase();

  // ==========================
  // Calculator sederhana
  // ==========================
  if (text.startsWith("calc ")) {
    try {
      const expr = prompt.substring(5);

      const value = Function(
        `"use strict";return (${expr})`
      )();

      return {
        handled: true,
        result: String(value),
      };

    } catch {

      return {
        handled: true,
        result: "Perhitungan gagal.",
      };
    }
  }

  // ==========================
  // Waktu
  // ==========================
  if (text === "time") {
    return {
      handled: true,
      result: new Date().toLocaleString(),
    };
  }

  return {
    handled: false,
    result: "",
  };
}
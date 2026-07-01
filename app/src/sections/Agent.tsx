import { useState } from "react";
import { runAgent } from "../agent/agent";

export default function Agent() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");

  async function handleRun() {
    if (!prompt.trim()) return;

    const result = await runAgent({
      prompt,
    });

    setAnswer(result.answer);
  }

  return (
    <section style={{ padding: "40px" }}>
      <h2>Agentic AI</h2>

      <textarea
        rows={5}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Masukkan tugas..."
        style={{
          width: "100%",
          marginBottom: 20,
        }}
      />

      <button onClick={handleRun}>
        Jalankan Agent
      </button>

      <pre
        style={{
          marginTop: 30,
          whiteSpace: "pre-wrap",
        }}
      >
        {answer}
      </pre>
    </section>
  );
}

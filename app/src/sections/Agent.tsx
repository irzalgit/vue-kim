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
    <section
      style={{
        padding: "40px",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      <h2
        style={{
          color: "#ffffff",
          marginBottom: "20px",
        }}
      >
        Agentic AI
      </h2>

      <textarea
        rows={6}
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Masukkan tugas..."
        style={{
          width: "100%",
          padding: "14px",
          marginBottom: "20px",
          background: "#111111",
          color: "#ffffff",
          border: "1px solid #444444",
          borderRadius: "10px",
          fontSize: "16px",
          fontFamily: "inherit",
          resize: "vertical",
          boxSizing: "border-box",
          outline: "none",
        }}
      />

      <button
        onClick={handleRun}
        style={{
          padding: "12px 20px",
          background: "#2563eb",
          color: "#ffffff",
          border: "none",
          borderRadius: "8px",
          fontSize: "16px",
          cursor: "pointer",
        }}
      >
        Jalankan Agent
      </button>

      {answer && (
        <pre
          style={{
            marginTop: "30px",
            padding: "20px",
            background: "#111111",
            color: "#ffffff",
            border: "1px solid #333333",
            borderRadius: "10px",
            whiteSpace: "pre-wrap",
            fontFamily: "monospace",
            lineHeight: "1.6",
          }}
        >
          {answer}
        </pre>
      )}
    </section>
  );
}
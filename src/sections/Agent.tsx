import { useState } from "react";
import { runAgent } from "../agent/agent";
import ModelSelector from "../components/ModelSelector";
import AIModelInfo from "../components/AIModelInfo";
import GuestAPIKey from "../components/GuestAPIKey";

export default function Agent() {

  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const [selectedModel, setSelectedModel] = useState("");


  const isPersonalKey =
    selectedModel === "personal-key";


  async function handleRun() {

    if (!prompt.trim()) return;


    setLoading(true);
    setAnswer("");


    try {

      const result = await runAgent({
        prompt,
        selectedModel,
      });


      setAnswer(result.answer);


    } catch (error) {

      setAnswer(
        "❌ Terjadi kesalahan: " +
        (error as Error).message
      );


    } finally {

      setLoading(false);

    }

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
          color:"#ffffff",
          marginBottom:"20px",
        }}
      >
        Agentic AI
      </h2>


      <ModelSelector
        value={selectedModel}
        onChange={setSelectedModel}
      />


      <AIModelInfo
        modelId={selectedModel}
      />


      <GuestAPIKey
        visible={isPersonalKey}
      />


      <textarea
        rows={6}
        value={prompt}
        onChange={(e)=>
          setPrompt(e.target.value)
        }
        placeholder="Masukkan tugas..."
        style={{
          width:"100%",
          padding:"14px",
          marginBottom:"20px",
          background:"#111111",
          color:"#ffffff",
          border:"1px solid #444444",
          borderRadius:"10px",
          fontSize:"16px",
        }}
      />


      <button
        onClick={handleRun}
        disabled={loading}
        style={{
          padding:"12px 20px",
          background: loading
            ? "#4b5563"
            : "#2563eb",
          color:"#ffffff",
          border:"none",
          borderRadius:"8px",
          cursor: loading
            ? "not-allowed"
            : "pointer",
        }}
      >

        {loading
          ? "Menjalankan Agent..."
          : "Jalankan Agent"}

      </button>


      {answer && (

        <pre
          style={{
            marginTop:"30px",
            padding:"20px",
            background:"#111111",
            color:"#ffffff",
            border:"1px solid #333333",
            borderRadius:"10px",
            whiteSpace:"pre-wrap",
          }}
        >
          {answer}
        </pre>

      )}


    </section>

  );

}

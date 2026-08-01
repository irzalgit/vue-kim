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
    <section className="w-full">
      <h2 className="text-white text-xl font-bold mb-4">
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
        onChange={(e) => setPrompt(e.target.value)}
        placeholder="Masukkan tugas..."
        className="w-full p-4 mb-5 bg-black text-white border border-gray-600 rounded-xl text-base resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      <button
        onClick={handleRun}
        disabled={loading}
        className={`
          w-full sm:w-auto px-6 py-3 rounded-lg text-white font-medium transition
          ${loading ? "bg-gray-600 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700 cursor-pointer"}
        `}
      >
        {loading ? "Menjalankan Agent..." : "Jalankan Agent"}
      </button>

      {answer && (
        <div className="w-auto -mx-8 mt-8 px-4 sm:px-8 py-6 bg-white text-black whitespace-pre-wrap break-words text-base leading-relaxed">
          {answer}
        </div>
      )}
    </section>
  );
}

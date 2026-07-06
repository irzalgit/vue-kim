import { useEffect, useState } from "react";
import { getFreeModels } from "../agent/providers/openrouterModels";

type Props = {
  value: string;
  onChange: (model: string) => void;
};

export default function ModelSelector({
  value,
  onChange,
}: Props) {
  const [models, setModels] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const list = await getFreeModels();
        setModels(list);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, []);

  return (
    <div
      style={{
        border: "1px solid #444",
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
      }}
    >
      <h3>Pilih Model OpenRouter</h3>

      {loading ? (
        <p>Memuat daftar model...</p>
      ) : (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            background: "#111",
            color: "#fff",
            border: "1px solid #444",
            borderRadius: 8,
            fontSize: "15px",
          }}
        >
          <option value="">
            -- Pilih Model --
          </option>

          {models.map((model) => (
            <option
              key={model}
              value={model}
            >
              {model}
            </option>
          ))}
        </select>
      )}

      {value && (
        <div
          style={{
            marginTop: 10,
            color: "#60a5fa",
            fontSize: "14px",
          }}
        >
          Model aktif:
          <br />
          <strong>{value}</strong>
        </div>
      )}
    </div>
  );
}
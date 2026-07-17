import { useEffect, useState } from "react";
import { AI_MODELS } from "../agent/modelRegistry";
import { getFreeModels } from "../agent/providers/openrouterModels";

type Props = {
  value: string;
  onChange: (model: string) => void;
};

type ModelItem = {
  id: string;
  name: string;
  tier: string;
  credit: number;
};

export default function ModelSelector({
  value,
  onChange,
}: Props) {

  const [models, setModels] = useState<ModelItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {

    async function load() {

      try {

        const freeModels = await getFreeModels();

        const freeList: ModelItem[] = freeModels.map(
          (model) => ({
            id: model,
            name: model,
            tier: "free",
            credit: 0,
          })
        );


        const registryModels: ModelItem[] =
          AI_MODELS.map((model) => ({
            id: model.id,
            name: model.name,
            tier: model.tier,
            credit: model.creditPerRequest,
          }));


        setModels([
          ...registryModels,
          ...freeList,
        ]);


      } catch (e) {

        console.error(
          "Gagal memuat model AI:",
          e
        );

      } finally {

        setLoading(false);

      }
    }


    load();

  }, []);


  function getLabel(model: ModelItem) {

    if (model.tier === "paid") {
      return `${model.name} (Premium - ${model.credit} kredit)`;
    }

    if (model.tier === "personal") {
      return `${model.name} (API Key Sendiri)`;
    }

    return `${model.name} (Gratis)`;

  }


  return (

    <div
      style={{
        border: "1px solid #444",
        borderRadius: 10,
        padding: 12,
        marginBottom: 16,
      }}
    >

      <h3>
        Pilih Model AI
      </h3>


      {loading ? (

        <p>
          Memuat daftar model...
        </p>

      ) : (

        <select
          value={value}
          onChange={(e) =>
            onChange(e.target.value)
          }
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
              key={model.id}
              value={model.id}
            >
              {getLabel(model)}
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

          <strong>
            {value}
          </strong>

        </div>

      )}


    </div>

  );

}

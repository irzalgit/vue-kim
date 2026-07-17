import { getAIModel } from "../agent/modelRegistry";

type Props = {
  modelId: string;
};

export default function AIModelInfo({
  modelId,
}: Props) {

  if (!modelId) {
    return null;
  }


  const model = getAIModel(modelId);


  if (!model) {
    return (
      <div
        style={{
          marginTop: 10,
          padding: 12,
          borderRadius: 10,
          background: "#222",
          color: "#fff",
        }}
      >
        Model OpenRouter aktif
      </div>
    );
  }


  return (
    <div
      style={{
        marginTop: 12,
        padding: 15,
        borderRadius: 10,
        border: "1px solid #444",
      }}
    >

      <h3>
        Informasi Model
      </h3>


      <p>
        <b>Nama:</b> {model.name}
      </p>


      <p>
        <b>Provider:</b> {model.provider}
      </p>


      <p>
        <b>Tier:</b> {model.tier}
      </p>


      {model.tier === "paid" && (
        <p>
          <b>Kredit:</b>{" "}
          {model.creditPerRequest}
          {" "}per penggunaan
        </p>
      )}


      {model.tier === "free" && (
        <p>
          ✓ Tidak membutuhkan kredit
        </p>
      )}


      {model.tier === "personal" && (
        <p>
          🔑 Menggunakan API Key pribadi
        </p>
      )}

    </div>
  );
}

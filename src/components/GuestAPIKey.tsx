import { useState } from "react";

type Props = {
  visible: boolean;
};

export default function GuestAPIKey({
  visible
}: Props) {

  const [provider, setProvider] = useState("claude");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState("");


  if (!visible) {
    return null;
  }


  function handleSave() {

    if (!apiKey.trim()) {
      setStatus("API Key belum diisi");
      return;
    }


    sessionStorage.setItem(
      "guest_ai_config",
      JSON.stringify({
        provider,
        apiKey
      })
    );


    setStatus(
      "API Key tersimpan untuk sesi ini"
    );

  }


  return (

    <div
      style={{
        marginTop: 15,
        padding: 15,
        border: "1px solid #444",
        borderRadius: 10
      }}
    >

      <h3>
        🔑 API Key Pribadi
      </h3>


      <p>
        Gunakan API key milik Anda sendiri.
        Biaya ditanggung akun provider Anda.
      </p>


      <select
        value={provider}
        onChange={(e)=>
          setProvider(e.target.value)
        }
        style={{
          width: "100%",
          padding: 10,
          marginBottom: 10
        }}
      >
        <option value="claude">
          Claude API
        </option>

        <option value="gemini">
          Gemini API
        </option>

        <option value="openai">
          OpenAI API
        </option>

      </select>


      <div
        style={{
          display:"flex",
          gap:10
        }}
      >

        <input
          type={
            showKey
            ? "text"
            : "password"
          }
          value={apiKey}
          onChange={(e)=>
            setApiKey(e.target.value)
          }
          placeholder="Masukkan API Key"
          style={{
            flex:1,
            padding:10
          }}
        />


        <button
          onClick={()=>
            setShowKey(!showKey)
          }
        >
          👁
        </button>

      </div>


      <button
        onClick={handleSave}
        style={{
          marginTop:12,
          padding:"10px 20px",
          cursor:"pointer"
        }}
      >
        Gunakan API Key
      </button>


      <p>
        {status}
      </p>


    </div>

  );

}

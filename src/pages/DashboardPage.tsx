import { useState } from 'react';
import SoalCard from '../components/SoalCard';

export default function DashboardPage() {
  // 1. Tambahkan state untuk jawaban agar SoalCard bisa berinteraksi
  const [jawaban, setJawaban] = useState<number[]>([]);

  // 2. Contoh data soal
  const contohSoal = {
    kategori: "Matematika",
    tanya: "Berapakah hasil dari 2 + 2?",
    opsi: ["1", "2", "3", "4"]
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#111827",
        color: "#fff",
        padding: "40px",
      }}
    >
      <h1>Vue-Kim Dashboard</h1>
      <p>Modul Soal sedang aktif:</p>
      
      <hr style={{ margin: "20px 0" }} />

      {/* 3. Panggil SoalCard di sini */}
      <div style={{ maxWidth: "600px" }}>
        <SoalCard 
          soal={contohSoal}
          index={0}
          jawaban={jawaban}
          onSimpan={(_idx, val) => setJawaban(val)}
          onOpenAI={() => alert("Fitur AI Gemini sedang aktif!")}
        />
      </div>

      <div style={{ marginTop: "40px", opacity: 0.5 }}>
        <p>✅ React</p>
        <p>✅ Vite</p>
        <p>✅ Agent Engine</p>
        <p>⚠ Gemini Quota</p>
      </div>
    </div>
  );
}

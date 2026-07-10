import { useState } from 'react';
import SoalCard from '../components/SoalCard';

interface DashboardPageProps {
  onBukaSoal: (kode: string) => void;
  onKembaliKeLanding?: () => void;
}

export default function DashboardPage({
  onBukaSoal,
  onKembaliKeLanding,
}: DashboardPageProps) {
  const [jawaban, setJawaban] = useState<number[]>([]);

  const daftarSoal = [
    {
      kode: 'matematika',
      kategori: 'Matematika',
      tanya: 'Berapakah hasil dari 2 + 2?',
      opsi: ['1', '2', '3', '4'],
    },
    {
      kode: 'fisika',
      kategori: 'Fisika',
      tanya: 'Satuan daya adalah?',
      opsi: ['Watt', 'Joule', 'Newton', 'Volt'],
    },
    {
      kode: 'kimia',
      kategori: 'Kimia',
      tanya: 'Rumus air adalah?',
      opsi: ['H2O', 'CO2', 'NaCl', 'O2'],
    },
  ];

  const handleBukaSoal = (kode: string) => {
    console.log('✅ Dashboard: Buka soal -', kode);
    onBukaSoal(kode);
  };

  const handleKembali = () => {
    console.log('✅ Dashboard: Kembali ke Landing');
    onKembaliKeLanding?.();
  };

  return (
    <div
      style={{
        padding: '40px',
        color: '#fff',
        background: '#0a0a0a',
        minHeight: '100vh',
      }}
    >
      {onKembaliKeLanding && (
        <div style={{ marginBottom: '30px' }}>
          <button onClick={handleKembali}>
            ← Kembali ke Landing
          </button>
        </div>
      )}

      <h1>📚 Vue-Kim Dashboard</h1>
      <p>Pilih mata pelajaran untuk memulai simulasi</p>

      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '20px',
          justifyContent: 'center',
        }}
      >
        {daftarSoal.map((soal) => (
          <div
            key={soal.kode}
            onClick={() => handleBukaSoal(soal.kode)}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '24px',
              width: '300px',
              cursor: 'pointer',
            }}
          >
            <h3>{soal.kategori}</h3>
            <p>{soal.tanya}</p>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleBukaSoal(soal.kode);
              }}
            >
              Mulai Ujian
            </button>
          </div>
        ))}
      </div>

      <hr />

      <h2>Contoh Soal</h2>

      <SoalCard
        soal={daftarSoal[0]}
        index={0}
        jawaban={jawaban}
        onSimpan={(index: number, jawabanBaru: number[]) => {
          console.log('✅ Jawab soal:', index);
          setJawaban(jawabanBaru);
        }}
        onOpenAI={() => {
          console.log('✅ Open AI');
        }}
      />
    </div>
  );
}
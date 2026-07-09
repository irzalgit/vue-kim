import { useState } from 'react';
import SoalCard from '../components/SoalCard';

interface DashboardPageProps {
  onBukaSoal: (kode: string) => void;
}

export default function DashboardPage({ onBukaSoal }: DashboardPageProps) {
  const [jawaban, setJawaban] = useState<number[]>([]);

  const daftarSoal = [
    { kode: 'matematika', kategori: 'Matematika', tanya: 'Berapakah hasil dari 2 + 2?', opsi: ['1', '2', '3', '4'] },
    { kode: 'fisika', kategori: 'Fisika', tanya: 'Satuan daya adalah?', opsi: ['Watt', 'Joule', 'Newton', 'Volt'] },
    { kode: 'kimia', kategori: 'Kimia', tanya: 'Rumus air adalah?', opsi: ['H2O', 'CO2', 'NaCl', 'O2'] },
  ];

  return (
    <div style={{ padding: '40px', color: '#fff', background: '#0a0a0a', minHeight: '100vh' }}>
      <h1 style={{ fontSize: '32px', marginBottom: '10px' }}>📚 Vue-Kim Dashboard</h1>
      <p style={{ color: '#94a3b8', marginBottom: '30px' }}>Pilih mata pelajaran untuk memulai simulasi</p>
      <hr style={{ margin: '20px 0', borderColor: '#334155' }} />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', justifyContent: 'center' }}>
        {daftarSoal.map((soal) => (
          <div
            key={soal.kode}
            onClick={() => onBukaSoal(soal.kode)}
            style={{
              background: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '16px',
              padding: '24px',
              width: '300px',
              cursor: 'pointer',
              transition: 'all 0.3s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#3b82f6';
              e.currentTarget.style.transform = 'translateY(-4px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = '#334155';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <h3 style={{ fontSize: '20px', marginBottom: '8px' }}>{soal.kategori}</h3>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>{soal.tanya}</p>
            <button
              style={{
                marginTop: '16px',
                background: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                width: '100%',
              }}
            >
              Mulai Ujian
            </button>
          </div>
        ))}
      </div>

      {/* Contoh SoalCard lama */}
      <hr style={{ margin: '40px 0', borderColor: '#334155' }} />
      <h2 style={{ marginBottom: '20px' }}>Contoh Soal</h2>
      <SoalCard
        soal={daftarSoal[0]}
        index={0}
        jawaban={jawaban}
        onSimpan={(_idx, val) => setJawaban(val)}
        onOpenAI={() => alert('Fitur AI aktif!')}
      />
    </div>
  );
}

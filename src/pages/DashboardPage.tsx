import { useState, useCallback } from 'react';
import SoalCard from '../components/SoalCard';
import Header from "../components/Header";
import Agent from "../sections/Agent";
import SimulasiHeader from '../components/SimulasiHeader';
import Navigasi from '../components/Navigasi';

interface DashboardPageProps {
  onKembaliKeLanding?: () => void;
}

export default function DashboardPage({ onKembaliKeLanding }: DashboardPageProps) {
  // State manajemen simulasi
  const [currentSimulasi, setCurrentSimulasi] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [jawaban, setJawaban] = useState<any[]>([]);

  // Konstanta konfigurasi
  const TOTAL_SOAL = 5; 

  const daftarSimulasi = [
    { kode: 'matematika', nama: 'Simulasi Matematika', warna: '#2563eb' },
    { kode: 'fisika', nama: 'Simulasi Fisika', warna: '#059669' }
  ];

  const handlePilihSimulasi = (kode: string) => {
    setCurrentSimulasi(kode);
    setCurrentIndex(0);
    setJawaban([]); // Reset jawaban saat ganti simulasi
  };

  const handleSimpanJawaban = useCallback((idx: number, newJawaban: any) => {
    setJawaban(prev => {
      const updated = [...prev];
      updated[idx] = newJawaban;
      return updated;
    });
  }, []);

  return (
    <div style={{ padding: '40px', color: '#fff', background: '#0a0a0a', minHeight: '100vh' }}>
      <Header />

      {!currentSimulasi ? (
        /* TAMPILAN PEMILIHAN */
        <>
          <h1>📚 Vue-Kim Dashboard</h1>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '700px', marginTop: '20px' }}>
            {daftarSimulasi.map((sim) => (
              <button 
                key={sim.kode} 
                onClick={() => handlePilihSimulasi(sim.kode)}
                style={{ background: sim.warna, padding: '30px', borderRadius: '16px', border: 'none', color: 'white', cursor: 'pointer', fontSize: '18px', fontWeight: 'bold' }}
              >
                {sim.nama}
              </button>
            ))}
          </div>
        </>
      ) : (
        /* TAMPILAN PENGERJAAN SOAL */
        <>
          <button 
            onClick={() => setCurrentSimulasi(null)} 
            style={{ marginBottom: '20px', padding: '10px 20px', cursor: 'pointer', background: '#334155', color: 'white', border: 'none', borderRadius: '8px' }}
          >
            ← Kembali ke Pilihan
          </button>
          
          <SimulasiHeader jenis={currentSimulasi} />

          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '16px', marginTop: '20px', marginBottom: '20px' }}>
            <SoalCard
              soal={{ tanya: `Soal ${currentSimulasi.toUpperCase()} #${currentIndex + 1}`, opsi: ['A', 'B', 'C', 'D'] }}
              index={currentIndex}
              jawaban={jawaban[currentIndex]}
              onSimpan={handleSimpanJawaban}
              onOpenAI={() => console.log('Open AI')}
            />
          </div>

          <Navigasi 
            currentIndex={currentIndex}
            total={TOTAL_SOAL}
            onPrev={() => setCurrentIndex(prev => Math.max(0, prev - 1))}
            onNext={() => setCurrentIndex(prev => Math.min(TOTAL_SOAL - 1, prev + 1))}
            onSelesai={() => alert('Ujian Selesai! Skor akan ditampilkan di sini.')}
          />
        </>
      )}

      <div style={{ marginTop: '60px' }}>
        <hr style={{ borderColor: '#334155', marginBottom: '20px' }} />
        <h2>🤖 AI Agent</h2>
        <Agent />
      </div>
    </div>
  );
}

import { useState, useCallback } from 'react';
import SoalCard from '../components/SoalCard';
import Header from "../components/Header";
import Agent from "../sections/Agent";
import SimulasiHeader from '../components/SimulasiHeader';
import Navigasi from '../components/Navigasi';

interface DashboardPageProps {
  onBukaSoal: (kode: string) => void;
  onKembaliKeLanding: () => void;
}

export default function DashboardPage({ onBukaSoal, onKembaliKeLanding }: DashboardPageProps) {
  // State manajemen simulasi (Mencegah error TS2304)
  const [currentSimulasi, setCurrentSimulasi] = useState<string | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
// Di dalam DashboardPage.tsx
const [jawaban, setJawaban] = useState<number[][]>([]); // Array of array of numbers

  const TOTAL_SOAL = 10;

  const daftarSimulasi = [
    { kode: 'matematika', nama: 'Simulasi Matematika', warna: '#2563eb' },
    { kode: 'fisika', nama: 'Simulasi Fisika', warna: '#059669' }
  ];

  const handlePilihSimulasi = (kode: string) => {
    setCurrentSimulasi(kode);
    setCurrentIndex(0);
    setJawaban([]);
    onBukaSoal(kode); // Menggunakan props onBukaSoal
  };

  const handleSimpanJawaban = useCallback((idx: number, newJawaban: any) => {
    setJawaban(prev => {
      const updated = [...prev];
      updated[idx] = newJawaban;
      return updated;
    });
  }, []);
const BANK_SOAL: Record<string, { tanya: string, opsi: string[] }[]> = {
  matematika: [
    { tanya: "Berapa nilai x jika persamaan linier 5x + 5 = 30?", opsi: ["5", "4", "3", "2"] },
    { tanya: "Berapakah hasil dari 15 + 20 - 5?", opsi: ["25", "30", "35", "40"] },
    { tanya: "Jika 2x = 16, berapakah nilai x?", opsi: ["6", "7", "8", "9"] },
    { tanya: "Berapakah hasil dari 10 x 10 / 2?", opsi: ["25", "50", "75", "100"] },
    { tanya: "Nilai dari 3 pangkat 3 adalah...", opsi: ["9", "12", "21", "27"] },
    { tanya: "Berapakah hasil dari 100 dibagi 4?", opsi: ["20", "25", "30", "35"] },
    { tanya: "Jika x + 10 = 20, berapakah x?", opsi: ["5", "10", "15", "20"] },
    { tanya: "Hasil dari 7 x 8 adalah...", opsi: ["54", "56", "58", "60"] },
    { tanya: "Berapakah hasil dari 12 dikurangi 7 ditambah 3?", opsi: ["6", "7", "8", "9"] },
    { tanya: "Jika 3x = 21, berapakah nilai x?", opsi: ["5", "6", "7", "8"] }
  ],
  fisika: [
    { tanya: "Apa satuan SI untuk gaya?", opsi: ["Joule", "Newton", "Watt", "Pascal"] },
    { tanya: "Kecepatan didefinisikan sebagai...", opsi: ["Jarak/Waktu", "Massa/Volume", "Gaya/Luas", "Usaha/Waktu"] },
    { tanya: "Berapakah percepatan gravitasi bumi (m/s²)?", opsi: ["8.8", "9.8", "10.8", "11.8"] },
    { tanya: "Hukum Newton II dinyatakan dengan rumus...", opsi: ["F = m/a", "F = m*a", "F = m+a", "F = m-a"] },
    { tanya: "Energi yang dimiliki benda karena geraknya disebut...", opsi: ["Potensial", "Kinetik", "Mekanik", "Listrik"] },
    { tanya: "Alat untuk mengukur arus listrik adalah...", opsi: ["Voltmeter", "Amperemeter", "Ohmmeter", "Barometer"] },
    { tanya: "Berapakah titik didih air (Celsius)?", opsi: ["80", "90", "100", "110"] },
    { tanya: "Satuan untuk daya adalah...", opsi: ["Volt", "Joule", "Watt", "Ohm"] },
    { tanya: "Cahaya merambat dengan kecepatan (m/s)...", opsi: ["3x10^8", "3x10^6", "3x10^5", "3x10^4"] },
    { tanya: "Apa yang menyebabkan benda jatuh ke bawah?", opsi: ["Magnet", "Gravitasi", "Gesekan", "Tekanan"] }
  ]
};

  return (
    <div style={{ padding: '40px', color: '#fff', background: '#0a0a0a', minHeight: '100vh' }}>
      <Header />

      <button onClick={onKembaliKeLanding} style={{ marginTop: '20px', cursor: 'pointer' }}>
        ← Kembali ke Landing
      </button>

      {!currentSimulasi ? (
        <>
          <h1>📚 Vue-Kim Dashboard</h1>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', maxWidth: '700px', marginTop: '20px' }}>
            {daftarSimulasi.map((sim) => (
              <button 
                key={sim.kode} 
                onClick={() => handlePilihSimulasi(sim.kode)}
                style={{ background: sim.warna, padding: '30px', borderRadius: '16px', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                {sim.nama}
              </button>
            ))}
          </div>
        </>
      ) : (
        <>
          <SimulasiHeader jenis={currentSimulasi} />

          <div style={{ background: '#1e293b', padding: '24px', borderRadius: '16px', marginTop: '20px' }}>
         <SoalCard
  // Mengambil data dinamis berdasarkan simulasi dan index soal saat ini
  soal={
    currentSimulasi && BANK_SOAL[currentSimulasi] 
      ? BANK_SOAL[currentSimulasi][currentIndex] 
      : { tanya: "Soal tidak ditemukan", opsi: [] }
  }
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
  onSelesai={() => alert('Ujian Selesai!')}
  onPilihSoal={(idx) => setCurrentIndex(idx)} // Tambahkan baris ini
/>

        </>
      )}

      <hr style={{ margin: '40px 0', borderColor: '#334155' }} />
      <h2>🤖 AI Agent</h2>
      <Agent />
    </div>
  );
}

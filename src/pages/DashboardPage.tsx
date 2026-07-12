import Header from "../components/Header";
import Agent from "../sections/Agent";

interface DashboardPageProps {
  onBukaSoal: (kode: string) => void;
  onKembaliKeLanding: () => void;
}

export default function DashboardPage({ onBukaSoal, onKembaliKeLanding }: DashboardPageProps) {
  const daftarSimulasi = [
    { kode: 'matematika', nama: 'Simulasi Matematika', warna: '#2563eb' },
    { kode: 'fisika', nama: 'Simulasi Fisika', warna: '#059669' }
  ];

  const handlePilihSimulasi = (kode: string) => {
    onBukaSoal(kode); // Navigasi ke /soal/:kode, ditangani oleh SoalPage
  };

  return (
    <div style={{ padding: '40px', color: '#fff', background: '#0a0a0a', minHeight: '100vh' }}>
      <Header />

      <button onClick={onKembaliKeLanding} style={{ marginTop: '20px', cursor: 'pointer' }}>
        ← Kembali ke Landing
      </button>

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

      <hr style={{ margin: '40px 0', borderColor: '#334155' }} />
      <h2>🤖 AI Agent</h2>
      <Agent />
    </div>
  );
}
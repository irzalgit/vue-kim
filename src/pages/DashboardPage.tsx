// src/pages/DashboardPage.tsx
import { useState } from 'react';
import SoalGeneratorWithChecklist from "../components/soal/SoalGeneratorWithChecklist";
import SoalGeneratorWithChecklist2026 from "../components/soal/SoalGeneratorWithChecklist2026";
import ProfileModal from "../components/ProfileModal";
import type { SelectedItem } from "../agent/generateSoalWithChecklist";
import { 
  Zap, User, LogOut, X
} from 'lucide-react';

// ============================================
// PROPS
// ============================================
interface DashboardPageProps {
  onBukaSoal: (
    kode: string,
    selectedItems?: SelectedItem[],
    jumlahSesi?: number,
    jumlahSoalPerSesi?: number
  ) => void;
  onKembaliKeLanding: () => void;
}

// ============================================
// KOMPONEN UTAMA DASHBOARD
// ============================================
export default function DashboardPage({
  onBukaSoal,
  onKembaliKeLanding
}: DashboardPageProps) {
  // ============================================
  // STATE
  // ============================================
  const [selectedSimulasi, setSelectedSimulasi] = useState<string | null>(null);
  const [showChecklistModal, setShowChecklistModal] = useState<boolean>(false);
  const [kisiVersion, setKisiVersion] = useState<'lama' | '2026'>('lama');
  const [sesiDimulai, setSesiDimulai] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [preferredModel, setPreferredModel] = useState<string>(
    localStorage.getItem('preferredModel') || 'gemini-3.5-flash'
  );

  const handleModelChange = (model: string) => {
    localStorage.setItem('preferredModel', model);
    setPreferredModel(model);
  };

  // ============================================
  // DATA SIMULASI
  // ============================================
  const daftarSimulasi = [
    {
      kode: "matematika",
      nama: "Simulasi Matematika",
      warna: "#2563eb",
      icon: "📐",
      deskripsi: "Latihan soal matematika dari SD hingga SMA"
    },
    {
      kode: "snbt",
      nama: "Simulasi SNBT",
      warna: "#7c3aed",
      icon: "🎓",
      deskripsi: "Latihan soal persiapan SNBT untuk SMA"
    },
    {
      kode: "fisika",
      nama: "Simulasi Fisika",
      warna: "#059669",
      icon: "⚛️",
      deskripsi: "Latihan soal fisika untuk SMA"
    },
    {
      kode: "kimia",
      nama: "Simulasi Kimia",
      warna: "#db2777",
      icon: "🧪",
      deskripsi: "Latihan soal kimia untuk SMA"
    }
  ];

  // ============================================
  // HANDLER SIMULASI
  // ============================================
  const handlePilihSimulasi = (kode: string) => {
    setSelectedSimulasi(kode);
    setShowChecklistModal(true);
  };

  const handleMulaiSesi = (
    selectedItems: SelectedItem[],
    jumlahSesi: number,
    jumlahSoalPerSesi: number
  ) => {
    setShowChecklistModal(false);
    setSesiDimulai(true);
    if (selectedSimulasi) {
      onBukaSoal(selectedSimulasi, selectedItems, jumlahSesi, jumlahSoalPerSesi);
    }
  };

  const handleTutupModal = () => {
    setShowChecklistModal(false);
    if (!sesiDimulai) {
      setSelectedSimulasi(null);
    }
  };

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* KONTEN UTAMA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-4">
            <Zap className="text-yellow-400" size={32} />
            <h1 className="text-3xl font-bold">Vue-Kim Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Model:</span>
              <select 
                className="bg-gray-700 text-sm text-white rounded-lg p-1 border border-gray-600"
                value={preferredModel}
                onChange={(e) => handleModelChange(e.target.value)}
              >
                <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
              </select>
            </div>
            <button 
              onClick={() => setShowProfileModal(true)}
              className="p-3 rounded-full bg-gray-700 hover:bg-gray-600 transition"
              title="Profil"
            >
              <User size={20} />
            </button>
            <button 
              onClick={onKembaliKeLanding}
              className="p-3 rounded-full bg-red-900/30 hover:bg-red-800/50 transition text-red-400"
              title="Keluar"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>

        {/* Area Scroll */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 w-full">
          <button
            onClick={onKembaliKeLanding}
            className="text-base text-gray-400 hover:text-white transition"
          >
            ← Kembali ke Landing
          </button>

          <div>
            <h2 className="text-2xl font-semibold mb-4">Pilih Simulasi</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 w-full">
              {daftarSimulasi.map((sim) => (
                <button
                  key={sim.kode}
                  onClick={() => handlePilihSimulasi(sim.kode)}
                  className="p-8 rounded-2xl text-left transition hover:scale-[1.02] focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900"
                  style={{ background: sim.warna }}
                >
                  <div className="text-5xl mb-3">{sim.icon}</div>
                  <div className="font-bold text-white text-xl">{sim.nama}</div>
                  <div className="text-base opacity-90 mt-2">{sim.deskripsi}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ===== MODAL PEMILIHAN CHECKLIST ===== */}
      {showChecklistModal && selectedSimulasi && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-0 sm:p-4"
          onClick={handleTutupModal}
        >
          <div
            className="bg-gray-800 rounded-none sm:rounded-2xl max-w-4xl w-full h-full sm:h-auto max-h-full sm:max-h-[90vh] overflow-y-auto p-3 sm:p-6 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={handleTutupModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="text-3xl">
                {daftarSimulasi.find(s => s.kode === selectedSimulasi)?.icon}
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold">
                  {daftarSimulasi.find(s => s.kode === selectedSimulasi)?.nama}
                </h2>
                <p className="text-sm text-gray-400">Pilih topik yang ingin dipelajari</p>
              </div>
              <button
                onClick={() => setKisiVersion(kisiVersion === 'lama' ? '2026' : 'lama')}
                className={`px-4 py-2 rounded-full font-bold text-sm ${
                  kisiVersion === '2026' ? 'bg-yellow-500 text-black' : 'bg-gray-600 text-white'
                }`}
              >
                {kisiVersion === '2026' ? '🎯 KISI 2026' : '📝 KISI LAMA'}
              </button>
            </div>

            {kisiVersion === 'lama' ? (
              <SoalGeneratorWithChecklist
                key="kisi-lama"
                onMulaiSesi={handleMulaiSesi}
                simulasiKode={selectedSimulasi}
              />
            ) : (
              <SoalGeneratorWithChecklist2026
                key="kisi-2026"
                onMulaiSesi={handleMulaiSesi}
                simulasiKode={selectedSimulasi}
              />
            )}
          </div>
        </div>
      )}

      {/* ===== MODAL PROFIL ===== */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
    </div>
  );
}
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import SoalGeneratorWithChecklist from "../components/soal/SoalGeneratorWithChecklist";
import SoalGeneratorWithChecklist2026 from "../components/soal/SoalGeneratorWithChecklist2026";
import ProfileModal from "../components/ProfileModal";
import BankSoalModal from "../components/BankSoalModal";
import SimulasiMapelModal from "../components/SimulasiMapelModal";
import type { SelectedItem } from "../agent/generateSoalWithChecklist";
import { 
  Zap, User, LogOut, X, Database, Coins
} from 'lucide-react';
import TokenPurchaseModal from '../components/TokenPurchaseModal';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import { ensureCredits } from '../agent/credit';

// ============================================
// PROPS
// ============================================
interface DashboardPageProps {
  onBukaSoal: (
    kode: string,
    selectedItems?: SelectedItem[],
    jumlahSesi?: number,
    jumlahSoalPerSesi?: number,
    customSoal?: any[],
    customJudul?: string
  ) => void;
  onKembaliKeLanding: () => void;
}

interface SimulasiItem {
  kode: string;
  nama: string;
  warna: string;
  icon: string;
  deskripsi: string;
  isCustomMapel?: boolean;
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
  const navigate = useNavigate();
  const [selectedSimulasi, setSelectedSimulasi] = useState<string | null>(null);
  const [showChecklistModal, setShowChecklistModal] = useState<boolean>(false);
  const [kisiVersion, setKisiVersion] = useState<'lama' | '2026'>('lama');
  const [sesiDimulai, setSesiDimulai] = useState<boolean>(false);
  const [showProfileModal, setShowProfileModal] = useState<boolean>(false);
  const [showBankSoalModal, setShowBankSoalModal] = useState<boolean>(false);
  const [showTokenModal, setShowTokenModal] = useState<boolean>(false);
  const [showSimulasiMapelModal, setShowSimulasiMapelModal] = useState<boolean>(false);
  const [selectedMapelTopic, setSelectedMapelTopic] = useState<string>('semua');
  const { user } = useAuth();
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [preferredModel, setPreferredModel] = useState<string>(
    localStorage.getItem('preferredModel') || 'gemini-3.5-flash'
  );

  // Realtime listener kuota token
  useEffect(() => {
    if (!user) {
      setUserCredits(null);
      return;
    }

    // Pastikan user memiliki record kuota (default 10)
    ensureCredits(user.uid);

    const kuotaRef = ref(db, `data_siswa/${user.uid}/kuota`);
    const unsubscribe = onValue(kuotaRef, (snapshot) => {
      const val = snapshot.val();
      if (typeof val === 'number') {
        setUserCredits(val);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleModelChange = (model: string) => {
    localStorage.setItem('preferredModel', model);
    setPreferredModel(model);
  };

  // ============================================
  // DATA SIMULASI
  // ============================================
  const daftarSimulasi: SimulasiItem[] = [
    {
      kode: "matematika",
      nama: "Simulasi Matematika",
      warna: "#2563eb",
      icon: "📐",
      deskripsi: "Latihan soal matematika dari SD hingga SMA"
    }
  ];

  // ============================================
  // HANDLER SIMULASI
  // ============================================
  const handlePilihSimulasi = (sim: SimulasiItem) => {
    if (sim.isCustomMapel) {
      setShowSimulasiMapelModal(true);
      return;
    }
    setSelectedSimulasi(sim.kode);
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
                className="bg-gray-700 text-sm text-white rounded-lg p-1 border border-gray-600 font-medium"
                value={preferredModel}
                onChange={(e) => handleModelChange(e.target.value)}
              >
                <optgroup label="🤖 Gemini AI">
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                  <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                  <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
                </optgroup>
                <optgroup label="📦 Bank Soal / Offline">
                  <option value="statis">Bank Soal (Soal Statis)</option>
                </optgroup>
              </select>
            </div>
            {/* Badge Kuota Token & Tombol Beli */}
            <button 
              onClick={() => setShowTokenModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-yellow-500/20 hover:from-amber-500/30 hover:to-yellow-500/30 text-yellow-300 border border-yellow-500/40 transition text-sm font-semibold shadow-sm group"
              title="Klik untuk Beli / Tambah Token"
            >
              <Coins size={18} className="text-yellow-400 group-hover:rotate-12 transition-transform" />
              <span>
                {userCredits !== null ? (
                  <>
                    <span className="text-yellow-100 font-bold">{userCredits.toLocaleString('id-ID')}</span>
                    <span className="text-yellow-400/80 text-xs ml-1 font-normal">Token</span>
                  </>
                ) : (
                  <span className="text-yellow-400 font-normal">Token</span>
                )}
              </span>
              <span className="text-xs px-1.5 py-0.5 rounded-md bg-yellow-500/30 text-yellow-200 border border-yellow-400/30 font-medium ml-0.5">
                + Beli
              </span>
            </button>
            <button 
              onClick={() => setShowBankSoalModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition text-sm font-medium"
              title="Bank Soal Lokal"
            >
              <Database size={16} />
              <span className="hidden sm:inline">Bank Soal</span>
            </button>
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
                <div
                  key={sim.kode}
                  onClick={() => handlePilihSimulasi(sim)}
                  className="p-7 rounded-2xl text-left transition hover:scale-[1.02] cursor-pointer focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 relative overflow-hidden group shadow-lg flex flex-col justify-between"
                  style={{ background: sim.warna }}
                >
                  <div>
                    <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">{sim.icon}</div>
                    <div className="font-bold text-white text-xl flex items-center justify-between">
                      <span>{sim.nama}</span>
                      {sim.isCustomMapel && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/20 text-white font-semibold backdrop-blur-sm">
                          Realtime DB
                        </span>
                      )}
                    </div>
                    <div className="text-sm opacity-90 mt-2">{sim.deskripsi}</div>
                  </div>

                  {sim.isCustomMapel && (
                    <div className="mt-4 pt-3 border-t border-white/20" onClick={(e) => e.stopPropagation()}>
                      <label className="block text-xs font-semibold text-white/95 mb-1.5 flex items-center gap-1.5">
                        <span>🎯 Pilih Materi:</span>
                      </label>
                      <div className="flex gap-2 items-center">
                        <select
                          value={selectedMapelTopic}
                          onChange={(e) => setSelectedMapelTopic(e.target.value)}
                          className="flex-1 bg-black/40 hover:bg-black/50 border border-white/30 rounded-xl px-3 py-2 text-xs sm:text-sm text-white font-medium focus:outline-none focus:ring-2 focus:ring-white/50 transition cursor-pointer backdrop-blur-sm"
                        >
                          <option value="semua" className="bg-gray-900 text-white">Semua Materi (Acak)</option>
                          <option value="matriks" className="bg-gray-900 text-white">Matriks</option>
                          <option value="spltv" className="bg-gray-900 text-white">SPLTV (Sistem Persamaan Linear Tiga Variabel)</option>
                          <option value="fungsi" className="bg-gray-900 text-white">Fungsi & Kuadrat</option>
                          <option value="vektor" className="bg-gray-900 text-white">Vektor</option>
                          <option value="trigonometri" className="bg-gray-900 text-white">Trigonometri</option>
                          <option value="turunan" className="bg-gray-900 text-white">Turunan / Kalkulus</option>
                          <option value="peluang" className="bg-gray-900 text-white">Peluang & Statistik</option>
                          <option value="eksponen" className="bg-gray-900 text-white">Eksponen & Logaritma</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => handlePilihSimulasi(sim)}
                          className="px-3 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs shadow transition whitespace-nowrap"
                        >
                          Mulai →
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* KARTU ANIMASI MATEMATIKA (HALAMAN TERPISAH) */}
              <div
                onClick={() => navigate('/animasi-matematika')}
                className="p-7 rounded-2xl text-left transition hover:scale-[1.02] cursor-pointer focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 relative overflow-hidden group shadow-lg flex flex-col justify-between border border-cyan-500/30"
                style={{ background: 'linear-gradient(135deg, #0891b2 0%, #4f46e5 100%)' }}
              >
                <div>
                  <div className="text-5xl mb-3 group-hover:scale-110 transition-transform">✨</div>
                  <div className="font-bold text-white text-xl flex items-center justify-between">
                    <span>Animasi Matematika</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-400/20 text-cyan-200 border border-cyan-300/30 font-semibold backdrop-blur-sm">
                      Python Engine 🐍
                    </span>
                  </div>
                  <div className="text-sm opacity-90 mt-2">
                    Visualisasi & animasi dinamis fungsi matematika (Sinus, Fourier, Osilasi, Polinomial & Lissajous).
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/20 flex items-center justify-between">
                  <span className="text-xs text-cyan-100 font-medium">Buka Halaman Animasi</span>
                  <span className="px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white font-bold text-xs shadow transition">
                    Buka Animasi →
                  </span>
                </div>
              </div>
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

      {/* ===== MODAL BANK SOAL ===== */}
      <BankSoalModal
        isOpen={showBankSoalModal}
        onClose={() => setShowBankSoalModal(false)}
      />

      {/* ===== MODAL SIMULASI MAPEL FIREBASE ===== */}
      <SimulasiMapelModal
        isOpen={showSimulasiMapelModal}
        initialKategori={selectedMapelTopic}
        onClose={() => setShowSimulasiMapelModal(false)}
        onMulaiSimulasi={(mapelKey, soalList, judul) => {
          onBukaSoal(mapelKey, undefined, 1, soalList.length, soalList, judul);
        }}
      />

      {/* ===== MODAL PROFIL ===== */}
      <ProfileModal
        isOpen={showProfileModal}
        onClose={() => setShowProfileModal(false)}
      />
      
      <TokenPurchaseModal
        isOpen={showTokenModal}
        onClose={() => setShowTokenModal(false)}
      />
    </div>
  );
}
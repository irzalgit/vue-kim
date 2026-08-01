// src/pages/DashboardPage.tsx
import { useState, useEffect, useRef } from 'react';
import Agent from "../sections/Agent";
import SoalGeneratorWithChecklist from "../components/soal/SoalGeneratorWithChecklist";
import type { SelectedItem } from "../agent/generateSoalWithChecklist";
import { 
  Send, Zap, Coins, User, LogOut, X
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
// KOMPONEN SIDEBAR (tanpa tombol uji coba)
// ============================================
function Sidebar({ 
  balance, 
  onBuyToken, 
  onLogout,
}: { 
  balance: number; 
  onBuyToken: () => void; 
  onLogout?: () => void;
}) {
  return (
    <aside className="w-20 bg-gray-800 border-r border-gray-700 flex flex-col h-full shrink-0">
      {/* Header Sidebar */}
      <div className="p-4 border-b border-gray-700 flex items-center justify-center">
        <Zap className="text-yellow-400" size={28} />
      </div>

      {/* Saldo */}
      <div className="p-3 bg-gray-700/30 mx-2 mt-3 rounded-xl flex flex-col items-center" title="Saldo Token">
        <Coins size={18} className="text-gray-400" />
        <div className="text-sm font-bold mt-1">{balance}</div>
      </div>

      {/* Tombol Beli Token */}
      <button
        onClick={onBuyToken}
        title="Beli Token"
        className="mx-2 mt-3 p-3 bg-gradient-to-r from-yellow-500 to-orange-500 rounded-xl font-semibold hover:opacity-90 transition flex items-center justify-center"
      >
        <Coins size={18} />
      </button>

      {/* Navigasi */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto mt-2">
        <button title="Chat" className="w-full p-3 rounded-lg bg-gray-700/50 flex items-center justify-center">
          <Send size={18} />
        </button>
        <button title="Profil" className="w-full p-3 rounded-lg hover:bg-gray-700/30 flex items-center justify-center text-gray-400">
          <User size={18} />
        </button>
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-gray-700">
        <button 
          onClick={onLogout} 
          title="Keluar"
          className="w-full p-3 rounded-lg hover:bg-gray-700/50 flex items-center justify-center text-gray-400"
        >
          <LogOut size={18} />
        </button>
      </div>
    </aside>
  );
}

// ============================================
// KOMPONEN CHAT AREA
// ============================================
function ChatArea({ 
  messages, 
  isLoading, 
  onSendMessage, 
  isBalanceEnough 
}: {
  messages: { role: 'user' | 'assistant'; content: string }[];
  isLoading: boolean;
  onSendMessage: (prompt: string) => void;
  isBalanceEnough: boolean;
}) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (input.trim() && !isLoading && isBalanceEnough) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-900 rounded-xl border border-gray-700 overflow-hidden">
      {/* Tampilan Pesan */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-800/30">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500">
            <Zap size={56} className="text-yellow-400 mb-4" />
            <p className="text-xl">Mulai percakapan dengan AI</p>
            <p className="text-base">Tanyakan apa saja tentang matematika, fisika, atau soal lainnya</p>
          </div>
        ) : (
          messages.map((msg, idx) => (
            msg.role === 'user' ? (
              <div key={idx} className="flex justify-end">
                <div className="max-w-[80%] p-4 rounded-2xl rounded-br-none text-base bg-blue-600 text-white">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={idx} className="w-full text-base text-gray-200 leading-relaxed whitespace-pre-wrap break-words px-1">
                {msg.content}
              </div>
            )
          ))
        )}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-700 p-4 rounded-2xl rounded-bl-none flex gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-700 bg-gray-800/50">
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            placeholder={isBalanceEnough ? "Tulis pertanyaan..." : "Saldo habis, beli token dulu!"}
            className="flex-1 p-3 rounded-lg bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 text-base"
            disabled={isLoading || !isBalanceEnough}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !isBalanceEnough || !input.trim()}
            className="p-3 px-6 bg-blue-600 hover:bg-blue-700 rounded-lg disabled:opacity-50 transition flex items-center gap-2 text-base"
          >
            <Send size={20} />
            Kirim
          </button>
        </div>
        {!isBalanceEnough && (
          <p className="text-center text-sm text-yellow-400 mt-2">
            ⚠️ Saldo token habis. Beli token untuk melanjutkan.
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// KOMPONEN UTAMA DASHBOARD
// ============================================
export default function DashboardPage({
  onBukaSoal,
  onKembaliKeLanding
}: DashboardPageProps) {
  // ============================================
  // STATE YANG SUDAH ADA
  // ============================================
  const [selectedSimulasi, setSelectedSimulasi] = useState<string | null>(null);
  const [showChecklistModal, setShowChecklistModal] = useState<boolean>(false);
  const [sesiDimulai, setSesiDimulai] = useState<boolean>(false);

  // ============================================
  // STATE UNTUK SISTEM TOKEN & CHAT
  // ============================================
  const [balance, setBalance] = useState<number>(10);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showBuyModal, setShowBuyModal] = useState<boolean>(false);
  const [selectedPackage, setSelectedPackage] = useState<number | null>(null);

  // ============================================
  // DATA TOKEN PACKAGES
  // ============================================
  const tokenPackages = [
    { id: 1, tokens: 50, price: 10000, label: 'Starter', token_amount: 50 },
    { id: 2, tokens: 200, price: 35000, label: 'Pro', token_amount: 200 },
    { id: 3, tokens: 500, price: 75000, label: 'Business', token_amount: 500 },
    { id: 4, tokens: 1500, price: 150000, label: 'Enterprise', token_amount: 1500 },
  ];

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
      kode: "fisika",
      nama: "Simulasi Fisika",
      warna: "#059669",
      icon: "⚛️",
      deskripsi: "Latihan soal fisika untuk SMA"
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
  // HANDLER CHAT
  // ============================================
  const handleSendMessage = async (prompt: string) => {
    if (balance < 1) {
      alert('Saldo tidak cukup! Beli token terlebih dahulu.');
      return;
    }

    const userMsg = { role: 'user' as const, content: prompt };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      // 🔥 Ganti dengan endpoint API backend Anda
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt,
          userId: 'user-123' // Ganti dengan ID dari auth
        }),
      });

      if (!response.ok) throw new Error('Gagal mendapatkan respons');
      const data = await response.json();

      setBalance(prev => prev - 1);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: data.response || 'Maaf, terjadi kesalahan.' 
      }]);

    } catch (error) {
      console.error(error);
      alert('Terjadi kesalahan saat mengirim chat.');
    } finally {
      setIsLoading(false);
    }
  };

  // ============================================
  // HANDLER BELI TOKEN - REDIRECT KE CHECKOUT.HTML
  // ============================================
const CHECKOUT_URL = import.meta.env.DEV 
    ? '/checkout.html' 
    : 'https://math315.id/checkout.html';

const handleBuyTokenRedirect = (pkg: { id: number; tokens: number; price: number; label: string; token_amount: number }) => {
  const params = new URLSearchParams({
    productId: pkg.id.toString(),
    productName: pkg.label, // Kirim nama asli, misal "Paket 50 Token"
    price: pkg.price.toString(),
    token: pkg.token_amount.toString(), // Kirim jumlah token (misal 50)
  });
  window.location.href = `${CHECKOUT_URL}?${params.toString()}`;
};

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className="flex h-screen bg-gray-900 text-white overflow-hidden">
      {/* SIDEBAR */}
      <Sidebar
        balance={balance}
        onBuyToken={() => setShowBuyModal(true)}
        onLogout={onKembaliKeLanding}
      />

      {/* KONTEN UTAMA */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-gray-700 bg-gray-800/50">
          <div className="flex items-center gap-4">
            <Zap className="text-yellow-400" size={32} />
            <h1 className="text-3xl font-bold">Vue-Kim Dashboard</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-base text-gray-400">Model: Gemini Flash</span>
            <button className="p-3 rounded-full bg-gray-700 hover:bg-gray-600">
              <User size={20} />
            </button>
          </div>
        </div>

        {/* Area Scroll */}
        <div className="flex-1 overflow-y-auto px-8 py-8 space-y-8 w-full">
          {/* Tombol kembali */}
          <button
            onClick={onKembaliKeLanding}
            className="text-base text-gray-400 hover:text-white transition"
          >
            ← Kembali ke Landing
          </button>

          {/* Grid Simulasi */}
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

          {/* Divider */}
          <hr className="border-gray-700" />

          {/* Agent */}
          <div>
            <h3 className="text-2xl font-semibold mb-3">Agent</h3>
            <Agent />
          </div>

          {/* Chat Area */}
          <div>
            <h3 className="text-2xl font-semibold mb-3">Chat AI (Token Chat)</h3>
            <div className="h-[600px]">
              <ChatArea
                messages={messages}
                isLoading={isLoading}
                onSendMessage={handleSendMessage}
                isBalanceEnough={balance >= 1}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===== MODAL PEMILIHAN CHECKLIST ===== */}
      {showChecklistModal && selectedSimulasi && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
          onClick={handleTutupModal}
        >
          <div
            className="bg-gray-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6 relative shadow-2xl"
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
              <div>
                <h2 className="text-2xl font-bold">
                  {daftarSimulasi.find(s => s.kode === selectedSimulasi)?.nama}
                </h2>
                <p className="text-sm text-gray-400">Pilih topik yang ingin dipelajari</p>
              </div>
            </div>

            <SoalGeneratorWithChecklist
              onMulaiSesi={handleMulaiSesi}
              simulasiKode={selectedSimulasi}
            />
          </div>
        </div>
      )}

      {/* ===== MODAL BELI TOKEN ===== */}
      {showBuyModal && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 relative">
            <button
              onClick={() => setShowBuyModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={24} />
            </button>

            <div className="flex items-center gap-3 mb-6">
              <Coins className="text-yellow-400" size={28} />
              <h2 className="text-2xl font-bold">Beli Token</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tokenPackages.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`
                    p-4 rounded-xl border-2 cursor-pointer transition
                    ${selectedPackage === pkg.id 
                      ? 'border-yellow-400 bg-yellow-400/10' 
                      : 'border-gray-700 hover:border-gray-500'
                    }
                  `}
                  onClick={() => setSelectedPackage(pkg.id)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-xl">{pkg.tokens} Token</div>
                      <div className="text-xs text-gray-400">{pkg.label}</div>
                    </div>
                    <div className="text-sm font-semibold text-yellow-400">
                      Rp {pkg.price.toLocaleString('id-ID')}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    ≈ {pkg.tokens * 150} karakter
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowBuyModal(false)}
                className="flex-1 p-3 rounded-xl bg-gray-700 hover:bg-gray-600 transition"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  const pkg = tokenPackages.find(p => p.id === selectedPackage);
                  if (!pkg) {
                    alert('Pilih paket terlebih dahulu!');
                    return;
                  }
                  handleBuyTokenRedirect(pkg);
                }}
                disabled={!selectedPackage}
                className="flex-1 p-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 font-bold hover:opacity-90 transition disabled:opacity-50"
              >
                Beli Sekarang
              </button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-4">
              Pembayaran diproses melalui Faspay
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
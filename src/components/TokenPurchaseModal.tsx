// src/components/TokenPurchaseModal.tsx
import { useState } from 'react';
import { X, Coins, QrCode, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TokenPurchaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOKEN_PACKAGES = [
  { id: 'token_50', name: 'Starter', tokens: 50, price: 10000, desc: '50 Token Soal' },
  { id: 'token_200', name: 'Pro', tokens: 200, price: 35000, desc: '200 Token Soal (Populer)', popular: true },
  { id: 'token_500', name: 'Business', tokens: 500, price: 75000, desc: '500 Token Soal' },
  { id: 'token_1500', name: 'Enterprise', tokens: 1500, price: 150000, desc: '1500 Token Soal (Hemat)' },
];

export default function TokenPurchaseModal({ isOpen, onClose }: TokenPurchaseModalProps) {
  const { user } = useAuth();
  const [selectedPkg, setSelectedPkg] = useState(TOKEN_PACKAGES[1]); // default Pro 200

  const handleBuyViaCheckout = () => {
    const baseUrl = import.meta.env.DEV ? '/checkout.html' : 'https://math315.id/checkout.html';
    const params = new URLSearchParams({
      productId: selectedPkg.id,
      productName: `${selectedPkg.name} (${selectedPkg.tokens} Token)`,
      price: selectedPkg.price.toString(),
      token: selectedPkg.tokens.toString(),
      name: user?.displayName || '',
    });
    window.location.href = `${baseUrl}?${params.toString()}`;
  };

  const handlePayViaQrisDana = () => {
    const adminWa = "6282189392233";
    const invoiceNo = `INV-DANA-${Date.now().toString().slice(-6)}`;
    const text = `Halo Admin Math315, saya ingin beli paket token via *QRIS DANA*:\n\n` +
      `📦 *Paket:* ${selectedPkg.name} (${selectedPkg.tokens} Token)\n` +
      `💰 *Harga:* Rp ${selectedPkg.price.toLocaleString('id-ID')}\n` +
      `👤 *Nama:* ${user?.displayName || 'User'}\n` +
      `📧 *Email:* ${user?.email || '-'}\n` +
      `🆔 *UID:* ${user?.uid || '-'}\n` +
      `📄 *Draft Inv:* ${invoiceNo}\n\n` +
      `Mohon kirim barcode QRIS DANA untuk pembayaran ini. Terima kasih!`;

    window.open(`https://wa.me/${adminWa}?text=${encodeURIComponent(text)}`, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-lg text-white relative shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition"
        >
          <X size={20} />
        </button>

        <h2 className="text-xl font-bold mb-1 flex items-center gap-2 text-amber-400">
          <Coins className="text-amber-400" size={24} /> Beli Token Soal Math315
        </h2>
        <p className="mb-4 text-xs text-slate-400">
          Pilih paket token sesuai kebutuhan belajar Anda. Saldo bertambah otomatis setelah pelunasan.
        </p>

        {/* Pilihan Paket */}
        <div className="grid grid-cols-2 gap-2.5 mb-5">
          {TOKEN_PACKAGES.map((pkg) => {
            const isSelected = selectedPkg.id === pkg.id;
            return (
              <div
                key={pkg.id}
                onClick={() => setSelectedPkg(pkg)}
                className={`p-3 rounded-xl border cursor-pointer transition relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-indigo-500 bg-indigo-950/40 shadow-md shadow-indigo-950/50'
                    : 'border-slate-800 bg-slate-800/60 hover:border-slate-700'
                }`}
              >
                {pkg.popular && (
                  <span className="absolute -top-2 right-2 bg-indigo-500 text-[10px] font-bold px-1.5 py-0.5 rounded text-white">
                    Populer
                  </span>
                )}
                <div>
                  <div className="font-bold text-sm text-slate-100 flex items-center justify-between">
                    {pkg.name}
                    {isSelected && <CheckCircle2 size={15} className="text-indigo-400" />}
                  </div>
                  <div className="text-xs text-amber-300 font-semibold mt-0.5">
                    {pkg.tokens} Token
                  </div>
                </div>
                <div className="mt-2 text-sm font-extrabold text-white">
                  Rp {pkg.price.toLocaleString('id-ID')}
                </div>
              </div>
            );
          })}
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={handleBuyViaCheckout}
            className="w-full p-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:opacity-95 transition font-semibold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20"
          >
            <QrCode size={18} /> Buka Halaman Checkout & QRIS DANA (Rp {selectedPkg.price.toLocaleString('id-ID')})
          </button>

          <button
            onClick={handlePayViaQrisDana}
            className="w-full p-2.5 rounded-xl border border-emerald-600/40 bg-emerald-950/30 hover:bg-emerald-900/40 text-emerald-300 transition font-medium text-xs flex items-center justify-center gap-1.5"
          >
            💬 Bayar Cepat via WhatsApp Admin
          </button>
        </div>
      </div>
    </div>
  );
}

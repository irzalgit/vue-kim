// src/components/BankSoalModal.tsx
import { useEffect, useState } from 'react';
import { Database, X, Trash2, BookOpen, RefreshCw } from 'lucide-react';
import { getBankSoalStats, clearAllBankSoal } from '../utils/soalCache';

interface BankSoalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function BankSoalModal({ isOpen, onClose }: BankSoalModalProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [stats, setStats] = useState<{
    totalSoal: number;
    totalTopik: number;
    detail: Record<string, number>;
  }>({ totalSoal: 0, totalTopik: 0, detail: {} });

  const loadStats = async () => {
    setLoading(true);
    try {
      const data = await getBankSoalStats();
      setStats(data);
    } catch (err) {
      console.error('Gagal mengambil statistik bank soal:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStats();
    }
  }, [isOpen]);

  const handleClear = async () => {
    if (window.confirm('Apakah Anda yakin ingin menghapus semua cache bank soal dari penyimpanan lokal? Tindakan ini tidak dapat dibatalkan.')) {
      await clearAllBankSoal();
      await loadStats();
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-2xl p-6 w-full max-w-lg text-white relative shadow-2xl flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>

        {/* Header Modal */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <Database size={28} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Bank Soal Tersimpan</h2>
            <p className="text-xs text-gray-400">Penyimpanan Lokal (IndexedDB & LocalStorage)</p>
          </div>
        </div>

        {/* Ringkasan Statistik */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-700">
            <div className="text-gray-400 text-xs font-medium mb-1 flex items-center gap-1.5">
              <BookOpen size={14} className="text-emerald-400" />
              Total Soal Tersimpan
            </div>
            <div className="text-3xl font-bold text-emerald-400">
              {loading ? '...' : stats.totalSoal}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">Soal unik AI yang tersimpan</div>
          </div>

          <div className="bg-gray-700/50 p-4 rounded-xl border border-gray-700">
            <div className="text-gray-400 text-xs font-medium mb-1 flex items-center gap-1.5">
              <Database size={14} className="text-blue-400" />
              Total Topik/Materi
            </div>
            <div className="text-3xl font-bold text-blue-400">
              {loading ? '...' : stats.totalTopik}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">Kategori/Sub-materi berbeda</div>
          </div>
        </div>

        {/* Daftar Rincian Topik */}
        <div className="flex-1 overflow-y-auto mb-6 pr-1 space-y-2">
          <h3 className="text-sm font-semibold text-gray-300 mb-2">Rincian per Topik:</h3>
          {loading ? (
            <div className="text-center py-6 text-gray-400 text-sm">Memuat data penyimpanan...</div>
          ) : Object.keys(stats.detail).length === 0 ? (
            <div className="text-center py-8 bg-gray-700/30 rounded-xl text-gray-400 text-sm">
              Belum ada soal AI yang tersimpan di penyimpanan lokal browser.
            </div>
          ) : (
            <div className="space-y-2">
              {Object.entries(stats.detail).map(([topik, count]) => (
                <div
                  key={topik}
                  className="flex items-center justify-between p-3 rounded-lg bg-gray-700/40 border border-gray-700/60 hover:border-gray-600 transition"
                >
                  <span className="text-sm text-gray-200 truncate pr-2 font-medium" title={topik}>
                    {topik}
                  </span>
                  <span className="text-xs px-2.5 py-1 bg-emerald-500/20 text-emerald-300 font-bold rounded-full whitespace-nowrap">
                    {count} soal
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between gap-3 pt-4 border-t border-gray-700">
          <div className="flex items-center gap-2">
            <button
              onClick={loadStats}
              className="p-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl text-gray-300 hover:text-white transition"
              title="Perbarui Data"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            {stats.totalSoal > 0 && (
              <button
                onClick={handleClear}
                className="px-3 py-2.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition"
              >
                <Trash2 size={15} />
                Kosongkan Cache
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-xl text-sm font-semibold transition"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

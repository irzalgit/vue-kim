import React from 'react';

interface NavigasiProps {
  onPrev: () => void;
  onNext: () => void;
  onSelesai: () => void;
  currentIndex: number;
  total: number;
}

export default function Navigasi({ 
  onPrev, 
  onNext, 
  onSelesai, 
  currentIndex, 
  total 
}: NavigasiProps) {
  return (
    <div className="flex justify-between mb-10">
      <button
        onClick={onPrev}
        disabled={currentIndex <= 0}
        className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-6 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        ← Sebelumnya
      </button>

      <button
        onClick={onSelesai}
        className="bg-red-500 hover:bg-red-600 text-white px-8 py-3 rounded-xl font-bold shadow-md"
      >
        Selesai Ujian
      </button>

      <button
        onClick={onNext}
        disabled={currentIndex >= total - 1}
        className="bg-blue-500 hover:bg-blue-600 text-white px-6 py-3 rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Selanjutnya →
      </button>
    </div>
  );
}

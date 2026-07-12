interface NavigasiProps {
  onPrev: () => void;
  onNext: () => void;
  onSelesai: () => void;
  onPilihSoal: (idx: number) => void; // Tambahkan ini
  currentIndex: number;
  total: number;
}

export default function Navigasi({ 
  onPrev, 
  onNext, 
  onSelesai, 
  onPilihSoal, // Tambahkan ini
  currentIndex, 
  total 
}: NavigasiProps) {
  return (
    <>
      <div className="flex justify-between mb-10">
        <button onClick={onPrev} disabled={currentIndex <= 0} className="...">← Sebelumnya</button>
        <button onClick={onSelesai} className="...">Selesai Ujian</button>
        <button onClick={onNext} disabled={currentIndex >= total - 1} className="...">Selanjutnya →</button>
      </div>

      <div className="flex justify-center gap-2 mb-6 flex-wrap">
        {Array.from({ length: total }).map((_, i) => (
          <button // Ubah jadi button
            key={i}
            onClick={() => onPilihSoal(i)} // Panggil fungsi saat diklik
            className={`w-10 h-10 flex items-center justify-center rounded-lg font-bold transition-colors
              ${currentIndex === i ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </>
  );
}

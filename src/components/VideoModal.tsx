import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Award, Volume2, VolumeX, Film } from 'lucide-react';

export interface VideoItemOption {
  id: string;
  nama: string;
  src: string;
  kategori?: string;
  kunciSoal?: { nomor: number; kunci: string; penjelasan: string }[];
}

// Daftar video default yang tersedia di /public/videos
export const DAFTAR_VIDEO_PUBLIC: VideoItemOption[] = [
  {
    id: 'bilangan9',
    nama: '🎬 Bilangan Kelas 9 (7 Soal + Dialog)',
    src: '/videos/bilangan9.mp4',
    kategori: 'Bilangan',
    kunciSoal: [
      { nomor: 1, kunci: 'A', penjelasan: 'Suhu akhir = -4 + 15 - 9 = 2°C (Opsi A)' },
      { nomor: 2, kunci: 'D', penjelasan: '2^3 × 2^(-5) × 4^2 = 2^3 × 2^(-5) × 2^4 = 2^2 = 4 (Opsi D)' },
      { nomor: 3, kunci: 'B', penjelasan: '0,000000012 = 1,2 × 10^(-8) m (Opsi B)' },
      { nomor: 4, kunci: 'C', penjelasan: 'Gula = (2/7) × 700 gram = 200 gram (Opsi C)' },
      { nomor: 5, kunci: 'B', penjelasan: 'Harga setelah diskon 20% = Rp200.000, lalu diskon 10% = Rp180.000 (Opsi B)' },
      { nomor: 6, kunci: 'A, B, D, E', penjelasan: 'FPB = 36, KPK = 216, a/b = 2/3, a×b = 2^5 × 3^5' },
      { nomor: 7, kunci: 'A, B, D, E', penjelasan: 'm×n = 1×10^3, m/n = 2,5×10^4, m+n = 5000,2, bentuk baku m valid' },
    ],
  },
  {
    id: 'tka9_part1',
    nama: '📝 Latihan TKA 9 Part 1 (Soal 1 - 9)',
    src: '/videos/video_latihan_tka9_part1_soal1_9.mp4',
    kategori: 'Simulasi TKA',
  },
  {
    id: 'tka9_part2',
    nama: '📝 Latihan TKA 9 Part 2 (Soal 10 - 18)',
    src: '/videos/video_latihan_tka9_part2_soal10_18.mp4',
    kategori: 'Simulasi TKA',
  },
  {
    id: 'tka9_part3',
    nama: '📝 Latihan TKA 9 Part 3 (Soal 19 - 25)',
    src: '/videos/video_latihan_tka9_part3_soal19_25.mp4',
    kategori: 'Simulasi TKA',
  },
  {
    id: 'tka9_25soal',
    nama: '🏆 Latihan Lengkap TKA 9 (25 Soal)',
    src: '/videos/video_latihan_tka9_25soal.mp4',
    kategori: 'Simulasi TKA',
    kunciSoal: [
      { nomor: 1, kunci: 'A', penjelasan: 'Soal 1 TKA 9 (Opsi A)' },
      { nomor: 2, kunci: 'B', penjelasan: 'Soal 2 TKA 9 (Opsi B)' },
      { nomor: 3, kunci: 'C', penjelasan: 'Soal 3 TKA 9 (Opsi C)' },
    ],
  },
  {
    id: 'tka9_paket5',
    nama: '🎯 Latihan TKA 9 (Paket 5)',
    src: '/videos/video_latihan_tka9_5.mp4',
    kategori: 'Simulasi TKA',
  },
  {
    id: 'tka9_paket4',
    nama: '🎯 Latihan TKA 9 (Paket 4)',
    src: '/videos/video_latihan_tka9_4.mp4',
    kategori: 'Simulasi TKA',
  },
  {
    id: 'tka9_matematika_full',
    nama: '📐 Pembahasan TKA 9 Matematika Lengkap',
    src: '/videos/video_tka9_matematika.mp4',
    kategori: 'Simulasi TKA',
  },
  {
    id: 'geometri_tka9',
    nama: '🔷 Geometri TKA 9 Lengkap',
    src: '/videos/video_gabungan_geometri_tka9.mp4',
    kategori: 'Geometri',
  },
  {
    id: 'geometri_3soal',
    nama: '📐 Geometri & Pengukuran (3 Soal)',
    src: '/videos/video_gabungan_geometri_3soal.mp4',
    kategori: 'Geometri',
    kunciSoal: [
      { nomor: 1, kunci: 'B', penjelasan: 'Besar sudut berseberangan dalam = 65° (Opsi B)' },
      { nomor: 2, kunci: 'C', penjelasan: 'Jarak titik C ke bidang BDHF = 3√2 cm (Opsi C)' },
      { nomor: 3, kunci: 'E', penjelasan: 'Tinggi limas / jarak puncak = 8 cm (Opsi E)' },
    ],
  },
  {
    id: 'trigonometri_4soal',
    nama: '📐 Trigonometri Cepat (4 Soal)',
    src: '/videos/video_gabungan_trigonometri_4soal.mp4',
    kategori: 'Trigonometri',
    kunciSoal: [
      { nomor: 1, kunci: 'A', penjelasan: 'Sin 30° + Cos 60° = 1/2 + 1/2 = 1 (Opsi A)' },
      { nomor: 2, kunci: 'B', penjelasan: 'Tan 45° = 1 (Opsi B)' },
      { nomor: 3, kunci: 'C', penjelasan: 'Sin^2 θ + Cos^2 θ = 1 (Opsi C)' },
      { nomor: 4, kunci: 'D', penjelasan: 'Tinggi tiang = 10√3 meter (Opsi D)' },
    ],
  },
  {
    id: 'data_peluang_3soal',
    nama: '📊 Statistika, Data & Peluang (3 Soal)',
    src: '/videos/video_gabungan_data_peluang_3soal.mp4',
    kategori: 'Statistika',
    kunciSoal: [
      { nomor: 1, kunci: 'C', penjelasan: 'Modus = 157,5 cm (Opsi C)' },
      { nomor: 2, kunci: 'A', penjelasan: 'Peluang n(A)/n(S) = 10/28 = 5/14 (Opsi A)' },
      { nomor: 3, kunci: 'A, B, C', penjelasan: 'Rata-rata 78,75 dan simpangan kuartil 4,5 (Opsi A, B, C)' },
    ],
  },
  {
    id: 'tka123',
    nama: '⚡ Video Gabungan TKA 1, 2, 3',
    src: '/videos/video_gabungan_tka123.mp4',
    kategori: 'Simulasi TKA',
  },
  {
    id: 'gabungan_2soal',
    nama: '🔢 Latihan Gabungan 2 Soal',
    src: '/videos/video_gabungan_2soal.mp4',
    kategori: 'Latihan',
  },
  {
    id: 'gabungan_3soal',
    nama: '🔢 Latihan Gabungan 3 Soal',
    src: '/videos/video_gabungan_3soal.mp4',
    kategori: 'Latihan',
  },
  {
    id: 'soal_kuadrat_1',
    nama: '✏️ Soal Persamaan Kuadrat #1',
    src: '/videos/video_soal_kuadrat_1.mp4',
    kategori: 'Aljabar',
  },
  {
    id: 'soal_kuadrat_2',
    nama: '✏️ Soal Persamaan Kuadrat #2',
    src: '/videos/video_soal_kuadrat_2.mp4',
    kategori: 'Aljabar',
  },
  {
    id: 'soal_matematika_1',
    nama: '✏️ Soal Matematika Dasar #1',
    src: '/videos/video_soal_matematika_1.mp4',
    kategori: 'Dasar',
  },
  {
    id: 'uji_coba_soal1',
    nama: '🧪 Uji Coba Soal #1',
    src: '/videos/uji_coba_soal1.mp4',
    kategori: 'Uji Coba',
  },
  {
    id: 'uji_coba_tka9_1',
    nama: '🧪 Uji Coba TKA 9 (Bagian 1)',
    src: '/videos/uji_coba_soal1_tka9_1.mp4',
    kategori: 'Uji Coba',
  },
  {
    id: 'uji_coba_tka9_2',
    nama: '🧪 Uji Coba TKA 9 (Bagian 2)',
    src: '/videos/uji_coba_soal1_tka9_2.mp4',
    kategori: 'Uji Coba',
  },
  {
    id: 'uji_coba_tka9_3',
    nama: '🧪 Uji Coba TKA 9 (Bagian 3)',
    src: '/videos/uji_coba_soal1_tka9_3.mp4',
    kategori: 'Uji Coba',
  },
  {
    id: 'promo_portal',
    nama: '🎥 Video Promo Portal Matematika',
    src: '/videos/portal_matematika_promo.mp4',
    kategori: 'Promosi',
  },
  {
    id: 'cinematic_vision',
    nama: '🎬 Cinematic Vision Preview',
    src: '/videos/cinematic-vision.mp4',
    kategori: 'Cinematic',
  },
];

interface VideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoSrc?: string;
  title?: string;
  daftarVideo?: VideoItemOption[];
}

export default function VideoModal({
  isOpen,
  onClose,
  videoSrc = '/videos/bilangan9.mp4',
  title = '🎬 Video Pembelajaran Interaktif',
  daftarVideo = DAFTAR_VIDEO_PUBLIC,
}: VideoModalProps) {
  const [selectedVideoSrc, setSelectedVideoSrc] = useState<string>(videoSrc);
  const [jawabanUser, setJawabanUser] = useState('');
  const [soalAktif, setSoalAktif] = useState(1);
  const [notifHasil, setNotifHasil] = useState<{ status: 'benar' | 'salah'; pesan: string } | null>(null);
  const [riwayatNilai, setRiwayatNilai] = useState<Record<number, boolean>>({});
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Cari metadata video terpilih
  const currentVideoData = daftarVideo.find((v) => v.src === selectedVideoSrc) || daftarVideo[0];
  const listKunci = currentVideoData?.kunciSoal || [];

  useEffect(() => {
    if (videoSrc) {
      setSelectedVideoSrc(videoSrc);
    }
  }, [videoSrc]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
      setJawabanUser('');
      setNotifHasil(null);
    }
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleGantiVideo = (newSrc: string) => {
    setSelectedVideoSrc(newSrc);
    setSoalAktif(1);
    setRiwayatNilai({});
    setNotifHasil(null);
    setJawabanUser('');
  };

  const handleKirimJawaban = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const input = jawabanUser.trim().toUpperCase();
    if (!input) return;

    const dataSoal = listKunci.find((s) => s.nomor === soalAktif);
    if (!dataSoal) {
      setNotifHasil({
        status: 'benar',
        pesan: `👍 Jawaban '${jawabanUser}' untuk Soal #${soalAktif} berhasil direkam!`,
      });
      setJawabanUser('');
      setTimeout(() => setNotifHasil(null), 3000);
      return;
    }

    const kunci = dataSoal.kunci.toUpperCase();
    let isBenar = kunci.includes(input) || input.includes(kunci) || input === kunci;

    if (isBenar) {
      setNotifHasil({
        status: 'benar',
        pesan: `🎉 BENAR untuk Soal #${soalAktif}! Skor +100. ${dataSoal.penjelasan}`,
      });
      setRiwayatNilai((prev) => ({ ...prev, [soalAktif]: true }));
    } else {
      setNotifHasil({
        status: 'salah',
        pesan: `❌ Jawaban '${jawabanUser}' belum tepat untuk Soal #${soalAktif}. Kunci: ${dataSoal.kunci}`,
      });
    }

    setJawabanUser('');
    setTimeout(() => {
      setNotifHasil(null), 4500;
    });
  };

  const jumlahBenar = Object.values(riwayatNilai).filter(Boolean).length;
  const totalNomorSoal = listKunci.length > 0 ? listKunci.map((k) => k.nomor) : [1, 2, 3, 4, 5];

  return (
    <div
      className="fixed inset-0 z-[9995] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md transition-opacity duration-300"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl max-h-[94vh] bg-[#090d16] border border-white/15 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal & Dropdown Pemilih Video */}
        <div className="flex flex-wrap items-center justify-between px-4 sm:px-6 py-3 border-b border-white/10 bg-[#0f172a] gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            {/* Dropdown Pemilih Video dari /public/videos */}
            <div className="relative flex items-center gap-2">
              <span className="text-xs font-bold text-yellow-400 hidden sm:inline">{title}:</span>
              <Film size={16} className="text-yellow-400 shrink-0" />
              <select
                value={selectedVideoSrc}
                onChange={(e) => handleGantiVideo(e.target.value)}
                className="bg-[#1e293b] text-white text-xs sm:text-sm font-semibold border border-white/20 rounded-lg px-3 py-1.5 outline-none cursor-pointer hover:border-yellow-400 transition"
              >
                {daftarVideo.map((v) => (
                  <option key={v.id} value={v.src} className="bg-[#0f172a] text-white">
                    {v.nama} {v.kategori ? `[${v.kategori}]` : ''}
                  </option>
                ))}
              </select>
            </div>

            {listKunci.length > 0 && jumlahBenar > 0 && (
              <span className="hidden md:inline-flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold">
                <Award size={12} /> {jumlahBenar} / {listKunci.length} Benar
              </span>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            {/* Tombol Mute / Unmute */}
            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title={isMuted ? "Unmute Audio" : "Mute Audio"}
            >
              {isMuted ? <VolumeX size={18} className="text-rose-400" /> : <Volume2 size={18} className="text-emerald-400" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition cursor-pointer"
              aria-label="Tutup Video"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Frame Video Interaktif dengan Overlay Input Melayang di Bawah Sebelah Kiri */}
        <div className="relative w-full bg-black flex-1 min-h-[320px] max-h-[70vh] flex items-center justify-center overflow-hidden">
          <video
            key={selectedVideoSrc}
            ref={videoRef}
            src={selectedVideoSrc}
            controls
            autoPlay
            playsInline
            className="w-full h-full max-h-[70vh] object-contain"
          >
            Browser Anda tidak mendukung tag video.
          </video>

          {/* Notifikasi Hasil Penilaian Jawaban Melayang di Atas Video */}
          {notifHasil && (
            <div
              className={`absolute top-4 left-1/2 -translate-x-1/2 z-40 max-w-[90%] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-top-3 duration-200 border ${
                notifHasil.status === 'benar'
                  ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60 shadow-emerald-900/50'
                  : 'bg-rose-950/90 text-rose-300 border-rose-500/60 shadow-rose-900/50'
              }`}
            >
              {notifHasil.pesan}
            </div>
          )}

          {/* FLOATING OVERLAY: BAR INPUT JAWABAN MELAYANG DI BAWAH SEBELAH KIRI */}
          <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-30 flex flex-col items-start gap-1.5 max-w-[calc(100%-24px)] sm:max-w-[440px]">
            {/* Navigasi Pill Pilihan Soal Aktif */}
            <div className="flex items-center gap-1 bg-black/80 px-2 py-1 rounded-full border border-white/15 backdrop-blur-md shadow-md text-[11px] font-semibold text-zinc-300 overflow-x-auto max-w-full">
              <span className="text-yellow-400 font-bold px-1 shrink-0">Soal:</span>
              {totalNomorSoal.map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setSoalAktif(num)}
                  className={`w-5 h-5 rounded-full flex items-center justify-center transition shrink-0 ${
                    soalAktif === num
                      ? 'bg-yellow-400 text-black font-bold scale-110 shadow-[0_0_8px_#facc15]'
                      : riwayatNilai[num]
                      ? 'bg-emerald-500 text-white font-bold'
                      : 'hover:bg-white/20 text-zinc-300'
                  }`}
                  title={`Pilih Soal #${num}`}
                >
                  {num}
                </button>
              ))}
            </div>

            {/* Input Bar Melayang */}
            <form
              onSubmit={handleKirimJawaban}
              className="flex items-center gap-2 bg-[#0f172a]/90 hover:bg-[#0f172a] border-2 border-yellow-400/80 rounded-full px-3 py-1.5 shadow-[0_8px_25px_rgba(0,0,0,0.8)] backdrop-blur-md transition-all w-full"
            >
              <span className="text-xs font-extrabold text-yellow-400 shrink-0 flex items-center gap-1">
                ✏️ #{soalAktif}:
              </span>
              <input
                type="text"
                value={jawabanUser}
                onChange={(e) => setJawabanUser(e.target.value)}
                placeholder={`Ketik jawaban Soal #${soalAktif} (misal: A/B/C/D)...`}
                className="bg-transparent text-white placeholder-zinc-400 text-xs sm:text-sm font-semibold border-none outline-none flex-1 min-w-[140px]"
                autoFocus
              />
              <button
                type="submit"
                className="bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 active:scale-95 text-white font-bold text-xs px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-md transition shrink-0 cursor-pointer"
              >
                <Send size={12} />
                <span>Kirim</span>
              </button>
            </form>
          </div>
        </div>

        {/* Footer Info Cepat */}
        <div className="px-4 sm:px-6 py-2.5 bg-[#0f172a] border-t border-white/10 flex items-center justify-between text-xs text-zinc-400">
          <span>💡 <em>Pilih materi video di dropdown atas dan jawab langsung di bar kiri bawah!</em></span>
          <span className="hidden sm:inline text-zinc-500">Video: {currentVideoData?.nama}</span>
        </div>
      </div>
    </div>
  );
}

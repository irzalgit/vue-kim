// src/data/tiktokVideoCatalog.ts
// Katalog Pemetaan Video Matematika @pairzal Berdasarkan Nomor & Koleksi

export interface VideoEdukasi {
  id: number;
  elemen: string;
  judul: string;
  tags: string;
  koleksi: string; // Nama Playlist / Koleksi TikTok
  directUrl?: string; // Tautan langsung TikTok (misal: https://vt.tiktok.com/...)
}

export const KATALOG_VIDEO_PAIRZAL: Record<number, VideoEdukasi> = {
  // #1 BILANGAN
  1: {
    id: 1,
    elemen: "Bilangan",
    judul: "Video Pembahasan Elemen Bilangan & Operasi Hitung",
    tags: "#Bilangan #TKAMatematika #Kelas4",
    koleksi: "Koleksi Bilangan & Operasi Hitung",
    directUrl: undefined,
  },

  // #2 ALJABAR
  2: {
    id: 2,
    elemen: "Aljabar",
    judul: "Video Pembahasan Elemen Aljabar & Variabel",
    tags: "#Aljabar #Kelas7 #TKAMatematika",
    koleksi: "Koleksi Aljabar & SPLDV",
    directUrl: undefined,
  },

  // #3 GEOMETRI
  3: {
    id: 3,
    elemen: "Geometri",
    judul: "Video Pembahasan Elemen Geometri & Bangun Datar/Ruang",
    tags: "#Geometri #BangunDatar #TKAMatematika",
    koleksi: "Koleksi Geometri & Pengukuran",
    directUrl: undefined,
  },

  // #4 TRIGONOMETRI
  4: {
    id: 4,
    elemen: "Trigonometri",
    judul: "Video Pembahasan Elemen Trigonometri (Sin, Cos, Tan)",
    tags: "#Trigonometri #SinCosTan #SudutIstimewa",
    koleksi: "Koleksi Trigonometri Cepat",
    directUrl: undefined,
  },

  // #5 STATISTIKA
  5: {
    id: 5,
    elemen: "Statistika",
    judul: "Video Pembahasan Elemen Statistika & Mean Median Modus",
    tags: "#Statistika #MeanMedianModus #PenyajianData",
    koleksi: "Koleksi Statistika & Peluang",
    directUrl: undefined,
  },

  // #6 PENGUKURAN
  6: {
    id: 6,
    elemen: "Pengukuran",
    judul: "Video Pembahasan Elemen Pengukuran & Satuan",
    tags: "#Pengukuran #SatuanWaktu #KecepatanDebit",
    koleksi: "Koleksi Pengukuran & Satuan",
    directUrl: undefined,
  },

  // #51 SOAL TKA MATEMATIKA (Direct link aktif)
  51: {
    id: 51,
    elemen: "TKA Matematika",
    judul: "Video Pembahasan Soal TKA Matematika #51",
    tags: "#TKA2026 #TKAMatematika #Soal51",
    koleksi: "Koleksi Soal TKA 2025/2026",
    directUrl: "https://vt.tiktok.com/ZSVwdD4o9/",
  },
};

// Daftar Koleksi / Playlist Video @pairzal
export const KOLEKSI_VIDEO_PAIRZAL = [
  {
    id: "tka",
    nama: "Koleksi Soal TKA 2025/2026",
    deskripsi: "Kumpulan video bedah kisi-kisi & soal TKA Matematika",
    icon: "⚡",
    badge: "Utama",
    targetPostId: 51,
  },
  {
    id: "bilangan",
    nama: "Koleksi Bilangan & Pecahan",
    deskripsi: "Pecahan, desimal, persen, eksponen, akar & deret",
    icon: "🔢",
    badge: "POST #1",
    targetPostId: 1,
  },
  {
    id: "aljabar",
    nama: "Koleksi Aljabar & SPLDV",
    deskripsi: "Suku aljabar, faktorisasi, rumus ABC, fungsi kuadrat",
    icon: "📐",
    badge: "POST #2",
    targetPostId: 2,
  },
  {
    id: "geometri",
    nama: "Koleksi Geometri & Bangun Ruang",
    deskripsi: "Luas, keliling, phytagoras, volume kubus, tabung, bola",
    icon: "🔷",
    badge: "POST #3",
    targetPostId: 3,
  },
  {
    id: "trigonometri",
    nama: "Koleksi Trigonometri Cepat",
    deskripsi: "Trik sudut istimewa, sin cos tan, identitas trigonometri",
    icon: "📏",
    badge: "POST #4",
    targetPostId: 4,
  },
  {
    id: "statistika",
    nama: "Koleksi Statistika & Peluang",
    deskripsi: "Mean, median, modus, diagram data, permutasi kombinasi",
    icon: "📊",
    badge: "POST #5",
    targetPostId: 5,
  }
];

// Helper untuk mengambil video berdasarkan elemen soal
export function getVideoByElemen(elemen: string): VideoEdukasi | undefined {
  const norm = elemen.toLowerCase().trim();
  if (norm.includes("bilangan")) return KATALOG_VIDEO_PAIRZAL[1];
  if (norm.includes("aljabar")) return KATALOG_VIDEO_PAIRZAL[2];
  if (norm.includes("geometri")) return KATALOG_VIDEO_PAIRZAL[3];
  if (norm.includes("trigonometri")) return KATALOG_VIDEO_PAIRZAL[4];
  if (norm.includes("statistika") || norm.includes("peluang")) return KATALOG_VIDEO_PAIRZAL[5];
  if (norm.includes("pengukuran")) return KATALOG_VIDEO_PAIRZAL[6];
  return KATALOG_VIDEO_PAIRZAL[51]; // Default ke video #51
}

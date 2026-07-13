// Berdasarkan kisi-kisi resmi Tes Kemampuan Akademik (TKA) Kemendikdasmen 2026.
// Sumber acuan: Peraturan BSKAP Kemendikdasmen No. 047/H/AN/2025 &
// Permendikdasmen No. 9 Tahun 2025 tentang Tes Kemampuan Akademik.
//
// CATATAN: TKA resmi hanya mencakup mata pelajaran Matematika dan Bahasa
// Indonesia. Konfigurasi elemen di file ini HANYA berlaku untuk Matematika.

export type Jenjang = 'SD' | 'SMP' | 'SMA';

// Pemetaan Fase -> Jenjang sesuai Kurikulum Merdeka (dipakai juga sebagai acuan TKA)
export const FASE_KE_JENJANG: Record<string, Jenjang> = {
  A: 'SD',  // kelas 1-2
  B: 'SD',  // kelas 3-4
  C: 'SD',  // kelas 5-6
  D: 'SMP', // kelas 7-9
  E: 'SMA', // kelas 10
  F: 'SMA', // kelas 11-12
};

// Elemen materi Matematika yang VALID per jenjang, sesuai kisi-kisi TKA resmi.
// Aljabar baru muncul di SMP; Trigonometri, Matriks & Fungsi baru muncul di SMA.
export const ELEMEN_PER_JENJANG: Record<Jenjang, string[]> = {
  SD: ['Bilangan', 'Geometri & Pengukuran', 'Data'],
  SMP: ['Bilangan', 'Aljabar', 'Geometri & Pengukuran', 'Data & Peluang'],
  SMA: ['Bilangan', 'Aljabar & Fungsi', 'Geometri & Pengukuran', 'Trigonometri', 'Data & Peluang'],
};

export function getJenjangDariFase(fase: string): Jenjang {
  return FASE_KE_JENJANG[fase] ?? 'SMP';
}

export function getElemenValid(fase: string): string[] {
  return ELEMEN_PER_JENJANG[getJenjangDariFase(fase)];
}

// Normalisasi teks sebelum dibandingkan, supaya variasi kecil dari AI
// (huruf besar/kecil, spasi ganda, "dan" vs "&") tidak dianggap tidak valid.
function normalisasiTeks(s: string): string {
  return (s ?? '')
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\bdan\b/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function validasiElemenFase(elemen: string, fase: string): boolean {
  const target = normalisasiTeks(elemen);
  return getElemenValid(fase).some((e) => normalisasiTeks(e) === target);
}

// ── Sub-elemen: rincian topik di dalam tiap elemen, dipetakan ke kelas spesifik ──

export interface SubElemen {
  nama: string;
  elemen: string; // elemen induk, harus salah satu isi ELEMEN_PER_JENJANG
  kelas: number;  // 1-12
}

export const DAFTAR_SUB_ELEMEN: SubElemen[] = [
  // Bilangan (SD)
  { nama: 'Penjumlahan & Pengurangan', elemen: 'Bilangan', kelas: 1 },
  { nama: 'Perkalian & Pembagian', elemen: 'Bilangan', kelas: 3 },
  { nama: 'Pecahan', elemen: 'Bilangan', kelas: 4 },
  { nama: 'Bilangan Bulat', elemen: 'Bilangan', kelas: 6 },

  // Geometri & Pengukuran (SD)
  { nama: 'Bangun Datar', elemen: 'Geometri & Pengukuran', kelas: 3 },
  { nama: 'Keliling & Luas', elemen: 'Geometri & Pengukuran', kelas: 5 },

  // Data (SD)
  { nama: 'Penyajian Data Sederhana', elemen: 'Data', kelas: 5 },

  // Aljabar (SMP)
  { nama: 'Bentuk Aljabar', elemen: 'Aljabar', kelas: 7 },
  { nama: 'Persamaan Linear', elemen: 'Aljabar', kelas: 9 },

  // Geometri & Pengukuran (SMP)
  { nama: 'Bangun Ruang', elemen: 'Geometri & Pengukuran', kelas: 8 },

  // Data & Peluang (SMP)
  { nama: 'Statistika Dasar', elemen: 'Data & Peluang', kelas: 8 },
  { nama: 'Peluang', elemen: 'Data & Peluang', kelas: 8 },

  // Aljabar & Fungsi (SMA)
  { nama: 'Persamaan Kuadrat', elemen: 'Aljabar & Fungsi', kelas: 10 },
  { nama: 'Persamaan Eksponen', elemen: 'Aljabar & Fungsi', kelas: 11 },
  { nama: 'Matriks', elemen: 'Aljabar & Fungsi', kelas: 11 },
  { nama: 'Barisan & Deret', elemen: 'Aljabar & Fungsi', kelas: 11 },

  // Trigonometri (SMA)
  { nama: 'Perbandingan Trigonometri', elemen: 'Trigonometri', kelas: 10 },
  { nama: 'Identitas Trigonometri', elemen: 'Trigonometri', kelas: 11 },

  // Geometri & Pengukuran (SMA)
  { nama: 'Geometri Transformasi', elemen: 'Geometri & Pengukuran', kelas: 11 },

  // Data & Peluang (SMA)
  { nama: 'Statistika Inferensial', elemen: 'Data & Peluang', kelas: 12 },
];

export function getFaseDariKelas(kelas: number): string {
  if (kelas <= 2) return 'A';
  if (kelas <= 4) return 'B';
  if (kelas <= 6) return 'C';
  if (kelas <= 9) return 'D';
  if (kelas === 10) return 'E';
  return 'F';
}

export function getSubElemenValid(fase: string): SubElemen[] {
  return DAFTAR_SUB_ELEMEN.filter((s) => getFaseDariKelas(s.kelas) === fase);
}

export function validasiSubElemen(subElemen: string, elemen: string, fase: string): boolean {
  const targetSub = normalisasiTeks(subElemen);
  const targetElemen = normalisasiTeks(elemen);
  return DAFTAR_SUB_ELEMEN.some(
    (s) =>
      normalisasiTeks(s.nama) === targetSub &&
      normalisasiTeks(s.elemen) === targetElemen &&
      getFaseDariKelas(s.kelas) === fase
  );
}

// Ringkasan lengkap (elemen + sub-elemen + kelas) untuk instruksi ke AI
export function buatRingkasanSubElemen(): string {
  return DAFTAR_SUB_ELEMEN
    .map((s) => `- ${s.elemen} > ${s.nama} (kelas ${s.kelas}, fase ${getFaseDariKelas(s.kelas)})`)
    .join('\n');
}

// Dipakai untuk menyusun instruksi lengkap ke AI (semua fase sekaligus)
export function buatRingkasanKisiKisi(): string {
  return Object.entries(ELEMEN_PER_JENJANG)
    .map(([jenjang, elemenList]) => {
      const faseList = Object.entries(FASE_KE_JENJANG)
        .filter(([, j]) => j === jenjang)
        .map(([fase]) => fase)
        .join(', ');
      return `- ${jenjang} (Fase ${faseList}): hanya boleh elemen [${elemenList.join(', ')}]`;
    })
    .join('\n');
}

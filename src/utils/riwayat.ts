// utils/riwayat.ts

export interface RiwayatEntry {
  tanggal: string;
  mataPelajaran: string;
  nilai: number;
  capaian?: string;
  statistikElemen?: Record<string, { benar: number; total: number }>;
}

const STORAGE_KEY = 'riwayat';

// Ambil semua riwayat
const getSemuaRiwayat = (): RiwayatEntry[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

// Simpan semua riwayat
const simpanSemuaRiwayat = (data: RiwayatEntry[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

// Ambil riwayat untuk satu mapel (urut dari terbaru)
export const getRiwayat = (mataPelajaran: string): RiwayatEntry[] => {
  const semua = getSemuaRiwayat();
  return semua
    .filter(entry => entry.mataPelajaran === mataPelajaran)
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
};

// Tambah riwayat baru
export const tambahRiwayat = (entry: RiwayatEntry): void => {
  const semua = getSemuaRiwayat();
  semua.push(entry);
  simpanSemuaRiwayat(semua);
};

// Perbarui field "capaian" pada satu entri riwayat (dicocokkan lewat mataPelajaran + tanggal)
export const perbaruiCapaian = (mataPelajaran: string, tanggal: string, capaian?: string): void => {
  const semua = getSemuaRiwayat();
  const diperbarui = semua.map((entry) =>
    entry.mataPelajaran === mataPelajaran && entry.tanggal === tanggal
      ? { ...entry, capaian }
      : entry
  );
  simpanSemuaRiwayat(diperbarui);
};

// Hapus semua riwayat untuk satu mapel (per mapel)
export const hapusRiwayatMapel = (mataPelajaran: string): void => {
  const semua = getSemuaRiwayat();
  const tersisa = semua.filter(entry => entry.mataPelajaran !== mataPelajaran);
  simpanSemuaRiwayat(tersisa);
};

// (Opsional) Reset total semua riwayat
export const resetTotalRiwayat = (): void => {
  simpanSemuaRiwayat([]);
};
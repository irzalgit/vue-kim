// src/utils/riwayat.ts
export interface DetailSoalEntry {
  nomor: number;
  elemen: string;
  subElemen: string;
  fase: string;
  kelas: number;
  taxonomiBloom: string;
  benar: boolean;
}

export interface RiwayatEntry {
  tanggal: string;
  mataPelajaran: string;
  nilai: number;
  capaian?: string;
  statistikElemen?: Record<string, { benar: number; total: number }>;
  detailSoal?: DetailSoalEntry[];
}

const STORAGE_KEY = 'riwayat';

const getSemuaRiwayat = (): RiwayatEntry[] => {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

const simpanSemuaRiwayat = (data: RiwayatEntry[]): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const getRiwayat = (mataPelajaran: string): RiwayatEntry[] => {
  const semua = getSemuaRiwayat();
  return semua
    .filter(entry => entry.mataPelajaran === mataPelajaran)
    .sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime());
};

export const tambahRiwayat = (entry: RiwayatEntry): void => {
  const semua = getSemuaRiwayat();
  semua.push(entry);
  simpanSemuaRiwayat(semua);
};

export const perbaruiCapaian = (mataPelajaran: string, tanggal: string, capaian?: string): void => {
  const semua = getSemuaRiwayat();
  const diperbarui = semua.map((entry) =>
    entry.mataPelajaran === mataPelajaran && entry.tanggal === tanggal
      ? { ...entry, capaian }
      : entry
  );
  simpanSemuaRiwayat(diperbarui);
};

export const hapusRiwayatMapel = (mataPelajaran: string): void => {
  const semua = getSemuaRiwayat();
  const tersisa = semua.filter(entry => entry.mataPelajaran !== mataPelajaran);
  simpanSemuaRiwayat(tersisa);
};

export const resetTotalRiwayat = (): void => {
  simpanSemuaRiwayat([]);
};

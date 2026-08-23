// src/agent/generateSoalWithChecklist2026.ts

import { kisiTKA as KISI_MATEMATIKA_2026 } from '../config/kisiTKA2026';
import { generateSoalAdaptif } from './generateSoal';
import { getSoalFromBank, saveSoalToBank } from '../utils/soalCache';

export interface SelectedItem {
  id: string;
  nama: string;
  elemenNama: string;
  subMateriNama: string;
  type: 'subMateri';
  fase?: string;
  kelas?: number[];
}

export interface SoalHasil {
  id: string;
  elemen: string;
  subElemen: string;
  subSubElemen?: string;
  kelas: string | number;
  taxonomiBloom: string;
  pertanyaan: string;
  pilihan: string[];
  jawaban_benar: string | string[];
  tipeSoal?: 'single' | 'multi';
  pembahasan?: string;
}

interface GenerateSoalParams {
  selectedItems: SelectedItem[];
  sesiKe: number;
  mataPelajaran: string;
  selectedModel: string;
  statistikElemen: Record<string, { benar: number; total: number }>;
  topikSesiIni?: TopikRotasi;
  riwayatPertanyaanTopik?: string[];
}

export interface TopikRotasi {
  id: string;
  namaFokus: string;
  konteksLengkap: string;
  isSubSubElemen: boolean;
  kelasValid: number[];
}

// ============================================================
// FUNGSI UTAMA (Renamed to match UI import)
// ============================================================

export async function generateSoalWithChecklist({
  selectedItems,
  sesiKe: _sesiKe,
  mataPelajaran,
  selectedModel,
  statistikElemen,
  topikSesiIni,
  riwayatPertanyaanTopik = [],
}: GenerateSoalParams): Promise<SoalHasil> {
  if (selectedItems.length === 0) {
    throw new Error('Tidak ada topik yang dipilih.');
  }

  const topikId = topikSesiIni?.id;

  // 1. Cek apakah ada soal di Bank Soal lokal
  if (topikId) {
    try {
      const cachedSoalList = await getSoalFromBank(topikId, 5);
      const freshFromBank = cachedSoalList.find(
        (s) => !riwayatPertanyaanTopik.includes(s.pertanyaan)
      );

      if (freshFromBank) {
        return {
          id: `soal-cache-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          elemen: freshFromBank.elemen,
          subElemen: freshFromBank.subElemen,
          subSubElemen: freshFromBank.subSubElemen,
          kelas: freshFromBank.kelas,
          taxonomiBloom: freshFromBank.taxonomiBloom,
          pertanyaan: freshFromBank.pertanyaan,
          pilihan: freshFromBank.pilihan,
          jawaban_benar: freshFromBank.jawaban_benar,
          tipeSoal: freshFromBank.tipeSoal,
          pembahasan: freshFromBank.pembahasan,
        };
      }
    } catch (e) {
      console.warn('[generateSoalWithChecklist2026] Gagal baca bank soal lokal:', e);
    }
  }

  // 2. Ambil fokus dari item yang dipilih
  const fokusTopik = topikSesiIni
    ? [topikSesiIni.namaFokus]
    : Array.from(new Set(selectedItems.map(item => item.subMateriNama)));

  const hasil = await generateSoalAdaptif(
    mataPelajaran,
    1,
    statistikElemen,
    undefined,
    undefined,
    selectedModel,
    undefined,
    fokusTopik,
    riwayatPertanyaanTopik,
    undefined,
    undefined
  );

  const soal = hasil[0];
  if (!soal) {
    throw new Error('Agent tidak mengembalikan soal untuk topik yang dipilih.');
  }

  // 3. Simpan soal baru ke Bank Soal lokal
  if (topikId) {
    saveSoalToBank(topikId, [soal]).catch((err) =>
      console.warn('[generateSoalWithChecklist2026] Gagal simpan ke cache bank soal:', err)
    );
  }

  return {
    id: `soal-${Date.now()}`,
    elemen: soal.elemen,
    subElemen: soal.subElemen,
    subSubElemen: soal.subSubElemen,
    kelas: soal.kelas,
    taxonomiBloom: soal.taxonomiBloom,
    pertanyaan: soal.pertanyaan,
    pilihan: soal.pilihan,
    jawaban_benar: soal.jawaban_benar,
    tipeSoal: soal.tipeSoal,
    pembahasan: soal.pembahasan,
  };
}

export function getDaftarTopikRotasi(selectedItems: SelectedItem[]): TopikRotasi[] {
  return selectedItems.map(item => ({
    id: item.id,
    namaFokus: item.subMateriNama,
    konteksLengkap: `${item.elemenNama} > ${item.subMateriNama}`,
    isSubSubElemen: false,
    kelasValid: item.kelas || [],
  }));
}

// ============================================================
// FUNGSI getAllItemsFromKisi
// ============================================================

export function getAllItemsFromKisi(): SelectedItem[] {
  const items: SelectedItem[] = [];

  KISI_MATEMATIKA_2026.forEach((elemen) => {
    elemen.subMateri.forEach((sub) => {
      items.push({
        id: `${elemen.id}-${sub.id}`,
        nama: sub.nama,
        elemenNama: elemen.nama,
        subMateriNama: sub.nama,
        type: 'subMateri',
      });
    });
  });

  return items;
}

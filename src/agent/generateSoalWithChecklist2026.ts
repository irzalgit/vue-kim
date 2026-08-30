// src/agent/generateSoalWithChecklist2026.ts

import { kisiTKA as KISI_MATEMATIKA_2026 } from '../config/kisiTKA2026';
import { generateSoalAdaptif } from './generateSoal';
import { getSoalFromBank, saveSoalToBank } from '../utils/soalCache';
import { bersihkanPrefixPilihan } from '../services/soal-generator/parser';

export interface SelectedItem {
  id: string;
  nama: string;
  elemenNama: string;
  subMateriNama: string;
  type: 'subMateri';
  fase?: string;
  kelas?: number[];
  refNomor?: number;
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

// Pemetaan sinkronisasi topik TKA 2026 ke nomor topik Kurikulum Merdeka (Fase E & F)
const TKA_2026_MAPPING: Record<string, { refNomor: number; fase: string; kelas: number[] }> = {
  'bilangan-real': { refNomor: 500, fase: 'E', kelas: [10] },
  'persamaan-pertidaksamaan': { refNomor: 537, fase: 'E', kelas: [10] },
  'program-linear': { refNomor: 660, fase: 'F', kelas: [11, 12] },
  'fungsi': { refNomor: 528, fase: 'E', kelas: [10, 11] },
  'barisan-deret': { refNomor: 508, fase: 'E', kelas: [10] },
  'polinomial': { refNomor: 591, fase: 'F', kelas: [11, 12] },
  'geometri-bidang': { refNomor: 567, fase: 'E', kelas: [10, 11] },
  'geometri-ruang': { refNomor: 698, fase: 'F', kelas: [12] },
  'transformasi': { refNomor: 680, fase: 'F', kelas: [11, 12] },
  'vektor': { refNomor: 664, fase: 'F', kelas: [11] },
  'statistika': { refNomor: 574, fase: 'E', kelas: [10, 12] },
  'kaidah-pencacahan': { refNomor: 578, fase: 'E', kelas: [12] },
  'peluang': { refNomor: 588, fase: 'E', kelas: [10, 12] },
  'perbandingan-trigonometri': { refNomor: 554, fase: 'E', kelas: [10] },
  'aturan-sinus-kosinus': { refNomor: 558, fase: 'E', kelas: [10, 11] },
};

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
        const rawPilihan = Array.isArray(freshFromBank.pilihan) ? freshFromBank.pilihan : [];
        const cleanPilihan = rawPilihan.map((p) => bersihkanPrefixPilihan(p));
        const rawJawaban = freshFromBank.jawaban_benar || (rawPilihan.length > 0 ? rawPilihan[0] : '');
        let cleanJawaban: string | string[];
        if (Array.isArray(rawJawaban)) {
          cleanJawaban = rawJawaban.map((j: string) => {
            const jc = bersihkanPrefixPilihan(j);
            const idx = rawPilihan.findIndex((p: string) => p === j || bersihkanPrefixPilihan(p) === jc);
            return idx !== -1 ? cleanPilihan[idx] : jc;
          });
        } else {
          const jc = bersihkanPrefixPilihan(String(rawJawaban));
          const idx = rawPilihan.findIndex((p: string) => p === rawJawaban || bersihkanPrefixPilihan(p) === jc);
          cleanJawaban = idx !== -1 ? cleanPilihan[idx] : jc;
        }

        return {
          id: `soal-cache-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          elemen: freshFromBank.elemen,
          subElemen: freshFromBank.subElemen,
          subSubElemen: freshFromBank.subSubElemen,
          kelas: freshFromBank.kelas,
          taxonomiBloom: freshFromBank.taxonomiBloom,
          pertanyaan: freshFromBank.pertanyaan,
          pilihan: cleanPilihan,
          jawaban_benar: cleanJawaban,
          tipeSoal: freshFromBank.tipeSoal,
          pembahasan: freshFromBank.pembahasan,
        };
      }
    } catch (e) {
      console.warn('[generateSoalWithChecklist2026] Gagal membaca bank cache:', e);
    }
  }

  // 2. Generate soal adaptif baru dengan AI jika belum ada di bank
  const topikTeks = topikSesiIni?.namaFokus || selectedItems[0]?.nama || 'Matematika';
  const hasil = await generateSoalAdaptif(
    mataPelajaran,
    1,
    statistikElemen,
    undefined,
    'sampai',
    selectedModel,
    undefined,
    [topikTeks],
    riwayatPertanyaanTopik,
    undefined,
    topikSesiIni?.kelasValid
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
      const mapping = TKA_2026_MAPPING[sub.id] || { refNomor: undefined, fase: undefined, kelas: [10, 11, 12] };
      items.push({
        id: `${elemen.id}-${sub.id}`,
        nama: sub.nama,
        elemenNama: elemen.nama,
        subMateriNama: sub.nama,
        type: 'subMateri',
        fase: mapping.fase,
        kelas: mapping.kelas,
        refNomor: mapping.refNomor,
      });
    });
  });

  return items;
}

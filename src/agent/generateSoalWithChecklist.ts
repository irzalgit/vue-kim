// src/agent/generateSoalWithChecklist.ts

import KISI_MATEMATIKA from '../config/kisiTKA';
import { generateSoalAdaptif } from './generateSoal';
import { getSoalFromBank, saveSoalToBank } from '../utils/soalCache';
import { bersihkanPrefixPilihan } from '../services/soal-generator/parser';
// ... (rest of the file)
export interface SelectedItem {
  id: string;
  nama: string;
  fase?: string;
  elemenNama?: string;
  subElemenNama?: string;
  type?: string;
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
  model?: string;
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
// 🔥 KONFIGURASI TOPIK TAMBAHAN UNTUK TKA6
// ============================================================

/**
 * Daftar nama topik (sub-elemen atau sub-sub-elemen) yang akan
 * otomatis ditambahkan jika TKA6 dipilih.
 * Nama harus persis seperti di kisiTKA.ts (case-sensitive).
 */
const TOPIK_TAMBAHAN_TKA6 = [
  // Aljabar (Fase F)
  'Polinomial (suku banyak)',
  'Fungsi komposisi',
  'Fungsi invers',
  'Fungsi eksponensial lanjut',
  'Fungsi logaritma lanjut',
  'Persamaan trigonometri',
  // Trigonometri (Geometri Fase F)
  'Fungsi trigonometri',
  'Identitas trigonometri',
  // Data dan Peluang (Fase F)
  'Korelasi',
  'Regresi linear',
  'Statistika inferensial',
  'Distribusi binomial',
  'Distribusi normal',
];

// ============================================================
// FUNGSI PEMBANTU UNTUK MENCARI ITEM BERDASARKAN NAMA
// ============================================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

/**
 * Mencari item (SelectedItem) berdasarkan nama dan fase.
 * Jika ditemukan di sub-sub-elemen, kembalikan sebagai sub-sub-elemen.
 * Jika ditemukan di sub-elemen, kembalikan sebagai sub-elemen.
 */
function cariItemBerdasarkanNama(
  nama: string,
  fase: string
): SelectedItem | undefined {
  for (const elemen of KISI_MATEMATIKA) {
    if (!elemen.fase.includes(fase as any)) continue;

    for (const sub of elemen.subElemen) {
      // Cek apakah nama cocok dengan sub-elemen
      if (sub.nama === nama) {
        return {
          id: `${fase}-${slugify(elemen.nama)}-${slugify(sub.nama)}`,
          nama: sub.nama,
          fase: fase,
          elemenNama: elemen.nama,
          subElemenNama: sub.nama,
          type: 'subElemen',
          kelas: sub.kelas,
        };
      }

      // Cek di sub-sub-elemen
      if (sub.subSubElemen) {
        for (let idx = 0; idx < sub.subSubElemen.length; idx++) {
          const ss = sub.subSubElemen[idx];
          if (ss.nama === nama) {
            return {
              id: `${fase}-${slugify(elemen.nama)}-${slugify(sub.nama)}--${idx}-${slugify(ss.nama)}`,
              nama: ss.nama,
              fase: fase,
              elemenNama: elemen.nama,
              subElemenNama: sub.nama,
              type: 'subSubElemen',
              kelas: ss.kelas,
            };
          }
        }
      }
    }
  }
  return undefined;
}

// ============================================================
// FUNGSI UNTUK MENDAPATKAN TOPIK TAMBAHAN DARI TKA6
// ============================================================

/**
 * Mendapatkan daftar TopikRotasi tambahan dari TKA6.
 * Jika ada item dengan elemenNama === 'TKA6', maka kita tambahkan
 * topik-topik dari TOPIK_TAMBAHAN_TKA6 yang ditemukan di fase 'F'.
 */
function getTopikTambahanTKA6(selectedItems: SelectedItem[]): TopikRotasi[] {
  const adaTKA6 = selectedItems.some(item => item.elemenNama === 'TKA6');
  if (!adaTKA6) return [];

  const hasil: TopikRotasi[] = [];
  const sudahDitambahkan = new Set<string>();

  for (const namaTopik of TOPIK_TAMBAHAN_TKA6) {
    // Cari item dengan nama tersebut di fase 'F' (karena TKA6 di fase F)
    const item = cariItemBerdasarkanNama(namaTopik, 'F');
    if (!item) continue;

    // Hindari duplikat (jika item sudah ada di selectedItems asli, tidak perlu ditambah)
    if (selectedItems.some(si => si.id === item.id)) continue;

    if (sudahDitambahkan.has(item.id)) continue;
    sudahDitambahkan.add(item.id);

    const isSubSubElemen = item.type === 'subSubElemen';
    const namaFokus = isSubSubElemen ? item.nama : (item.subElemenNama || item.nama);
    const konteksLengkap = isSubSubElemen
      ? `${item.elemenNama || ''} > ${item.subElemenNama || ''} > ${item.nama}`
      : `${item.elemenNama || ''} > ${item.nama}`;

    hasil.push({
      id: item.id,
      namaFokus,
      konteksLengkap,
      isSubSubElemen,
      kelasValid: item.kelas && item.kelas.length > 0 ? item.kelas : [],
    });
  }

  return hasil;
}

// ============================================================
// FUNGSI UTAMA getDaftarTopikRotasi (dimodifikasi)
// ============================================================

/**
 * Menentukan urutan rotasi topik dari selectedItems, DI-DEDUP PER ITEM (item.id).
 * Jika ada TKA6, maka otomatis tambahkan topik dari TOPIK_TAMBAHAN_TKA6.
 */
export function getDaftarTopikRotasi(selectedItems: SelectedItem[]): TopikRotasi[] {
  const sudahDipakai = new Set<string>();
  const hasil: TopikRotasi[] = [];

  // 1. Proses item yang dipilih user
  selectedItems.forEach(item => {
    if (sudahDipakai.has(item.id)) return;
    sudahDipakai.add(item.id);

    const isSubSubElemen = item.type === 'subSubElemen';
    const namaFokus = isSubSubElemen ? item.nama : (item.subElemenNama || item.nama);
    const konteksLengkap = isSubSubElemen
      ? `${item.elemenNama || ''} > ${item.subElemenNama || ''} > ${item.nama}`
      : `${item.elemenNama || ''} > ${item.nama}`;

    hasil.push({
      id: item.id,
      namaFokus,
      konteksLengkap,
      isSubSubElemen,
      kelasValid: item.kelas && item.kelas.length > 0 ? item.kelas : [],
    });
  });

  // 2. Jika ada TKA6, tambahkan topik tambahan
  const tambahan = getTopikTambahanTKA6(selectedItems);
  for (const t of tambahan) {
    if (!sudahDipakai.has(t.id)) {
      sudahDipakai.add(t.id);
      hasil.push(t);
    }
  }

  return hasil;
}

// ============================================================
// FUNGSI generateSoalWithChecklist (tidak berubah)
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

  // 1. Cek apakah ada soal siap pakai di Bank Soal lokal
  if (topikId) {
    try {
      const cachedSoalList = await getSoalFromBank(topikId, 5);
      const freshFromBank = cachedSoalList.find(
        (s) => !riwayatPertanyaanTopik.includes(s.pertanyaan)
      );

      if (freshFromBank) {
        const rawPilihan = Array.isArray(freshFromBank.pilihan) ? freshFromBank.pilihan : [];
        const cleanPilihan = rawPilihan.map((p: string) => bersihkanPrefixPilihan(p));
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
          model: freshFromBank.model || 'bank-lokal',
        };
      }
    } catch (e) {
      console.warn('[generateSoalWithChecklist] Gagal baca bank soal lokal:', e);
    }
  }

  // 2. Jika tidak ada di cache, minta AI generate soal
  const fokusTopik = topikSesiIni
    ? [topikSesiIni.namaFokus]
    : Array.from(new Set(selectedItems.map(item => item.subElemenNama || item.nama)));

  const fokusSubSubElemen = topikSesiIni?.isSubSubElemen ? topikSesiIni.namaFokus : undefined;
  const kelasValidTopik = topikSesiIni?.kelasValid;

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
    fokusSubSubElemen,
    kelasValidTopik
  );

  const soal = hasil[0];
  if (!soal) {
    throw new Error('Agent tidak mengembalikan soal untuk topik yang dipilih.');
  }

  // 3. Simpan soal baru ke Bank Soal lokal secara asynchronous
  if (topikId) {
    saveSoalToBank(topikId, [soal]).catch((err) =>
      console.warn('[generateSoalWithChecklist] Gagal simpan ke cache bank soal:', err)
    );
  }

  return {
    id: `soal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
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
    model: soal.model,
  };
}

// ============================================================
// FUNGSI getAllItemsFromKisi (untuk komponen checklist)
// ============================================================

export function getAllItemsFromKisi(): SelectedItem[] {
  const items: SelectedItem[] = [];

  KISI_MATEMATIKA.forEach((elemen) => {
    elemen.fase.forEach((fase) => {
      elemen.subElemen.forEach((sub) => {
        const subId = `${fase}-${slugify(elemen.nama)}-${slugify(sub.nama)}`;

        // Level sub-elemen
        items.push({
          id: subId,
          nama: sub.nama,
          fase,
          elemenNama: elemen.nama,
          subElemenNama: sub.nama,
          type: 'subElemen',
          kelas: sub.kelas,
        });

        // Level sub-sub-elemen
        sub.subSubElemen?.forEach((ss, idx) => {
          items.push({
            id: `${subId}--${idx}-${slugify(ss.nama)}`,
            nama: ss.nama,
            fase,
            elemenNama: elemen.nama,
            subElemenNama: sub.nama,
            type: 'subSubElemen',
            kelas: ss.kelas,
          });
        });
      });
    });
  });

  return items;
}
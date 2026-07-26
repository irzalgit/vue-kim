// src/agent/generateSoalWithChecklist.ts

import { KISI_MATEMATIKA } from '../config/kisiTKA';
import { generateSoalAdaptif } from './generateSoal';

export interface SelectedItem {
  id: string;
  nama: string;
  fase: string;
  elemenNama?: string;
  subElemenNama?: string;
  type?: string;
  kelas?: number[];
}

export interface SoalHasil {
  id: string;
  elemen: string;
  subElemen: string;
  kelas: string | number;
  taxonomiBloom: string;
  pertanyaan: string;
  pilihan: string[];
  jawaban_benar: string;
  pembahasan?: string;
}

interface GenerateSoalParams {
  selectedItems: SelectedItem[];
  sesiKe: number;
  mataPelajaran: string;
  selectedModel: string;
  statistikElemen: Record<string, { benar: number; total: number }>;
}

// ===================== MAIN FUNCTION =====================
// Menyambungkan checklist topik (selectedItems, sudah tersinkron dari
// kisiTKA.ts) ke generator soal ASLI (generateSoalAdaptif di generateSoal.ts).
// Tidak ada lagi mock — kalau generateSoalAdaptif gagal, error akan
// dilempar ke pemanggil (ditangkap oleh generateSoalSesi di komponen).
export async function generateSoalWithChecklist({
  selectedItems,
  sesiKe: _sesiKe,
  mataPelajaran,
  selectedModel,
  statistikElemen,
}: GenerateSoalParams): Promise<SoalHasil> {
  if (selectedItems.length === 0) {
    throw new Error('Tidak ada topik yang dipilih.');
  }

  // Fokuskan agent hanya ke topik (sub-elemen/elemen) yang dicentang user
  const fokusTopik = Array.from(
    new Set(selectedItems.map(item => item.subElemenNama || item.nama))
  );

  const hasil = await generateSoalAdaptif(
    mataPelajaran,            // Menggunakan variabel mataPelajaran yang aktif
    1,                        // 1 soal per pemanggilan (kontrak SoalHasil: satu soal per sesi)
    statistikElemen,
    undefined,                // kelasTarget — tidak dipakai, kelas sudah terkandung di fokusTopik
    undefined,                // modeFilter
    selectedModel,
    undefined,                // bloomTarget
    fokusTopik
  );

  const soal = hasil[0];
  if (!soal) {
    throw new Error('Agent tidak mengembalikan soal untuk topik yang dipilih.');
  }

  return {
    id: `soal-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    elemen: soal.elemen,
    subElemen: soal.subElemen,
    kelas: soal.kelas,
    taxonomiBloom: soal.taxonomiBloom,
    pertanyaan: soal.pertanyaan,
    pilihan: soal.pilihan,
    jawaban_benar: soal.jawaban_benar,
  };
}

// ===================== GET ALL ITEMS =====================
// Disinkronkan dengan kisiTKA.ts: setiap subElemen & subSubElemen di
// KISI_MATEMATIKA di-flatten jadi SelectedItem[] untuk checklist.
// Urutan push (subElemen dulu, baru subSubElemen) HARUS dijaga karena
// SoalGeneratorWithChecklist mengandalkan subItems[0] = item subElemen.

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function getAllItemsFromKisi(): SelectedItem[] {
  const items: SelectedItem[] = [];

  KISI_MATEMATIKA.forEach((elemen) => {
    elemen.fase.forEach((fase) => {
      elemen.subElemen.forEach((sub) => {
        const subId = `${fase}-${slugify(elemen.nama)}-${slugify(sub.nama)}`;

        // Level sub-elemen — selalu ditambahkan duluan
        items.push({
          id: subId,
          nama: sub.nama,
          fase,
          elemenNama: elemen.nama,
          subElemenNama: sub.nama,
          type: 'subElemen',
          kelas: sub.kelas,
        });

        // Level sub-sub-elemen — anak dari sub-elemen di atas
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

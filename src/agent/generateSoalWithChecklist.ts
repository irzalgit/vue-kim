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
  subSubElemen?: string;
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
  // Topik yang WAJIB dipakai untuk sesi ini (hasil round-robin dari komponen).
  // Kalau tidak diisi, fallback ke perilaku lama (semua topik tercentang digabung).
  topikSesiIni?: TopikRotasi;
  // Daftar teks pertanyaan yang sudah pernah dibuat untuk topikSesiIni,
  // dipakai agar LLM tidak mengulang soal yang sama.
  riwayatPertanyaanTopik?: string[];
}

export interface TopikRotasi {
  id: string;          // key unik untuk riwayat anti-duplikat (dari SelectedItem.id)
  namaFokus: string;    // nama EXACT (persis seperti di kisiTKA.ts) — dipakai untuk
                        // matching di getElemenRelevan/getSubElemenRelevan, JANGAN diubah/gabung
  konteksLengkap: string; // path lengkap untuk instruksi & tampilan UI, misal
                          // "Bilangan > Bilangan cacah sampai 999 > Membaca bilangan 1-100"
  isSubSubElemen: boolean;
  kelasValid: number[]; // daftar kelas yang SAH untuk topik ini (dari item.kelas di kisiTKA).
                        // Dipakai agar LLM tidak asal menulis kelas (misal selalu "1")
                        // untuk topik yang sebenarnya Fase E / kelas 10-11, dst.
}

// Menentukan urutan rotasi topik dari selectedItems, DI-DEDUP PER ITEM (item.id),
// BUKAN per subElemenNama. Ini penting: kalau dua item berbeda (misal 1.1.1 dan
// 1.1.2) sama-sama anak dari sub-elemen yang sama, mereka HARUS tetap jadi dua
// slot rotasi yang berbeda, bukan melebur jadi satu. Kalau digabung berdasarkan
// subElemenNama, checklist 10 item bisa menyusut jadi cuma 4-6 slot rotasi
// (sesuai jumlah sub-elemen induk yang unik), dan sebagian item yang dicentang
// user tidak akan pernah dapat giliran soal sendiri.
export function getDaftarTopikRotasi(selectedItems: SelectedItem[]): TopikRotasi[] {
  const sudahDipakai = new Set<string>();
  const hasil: TopikRotasi[] = [];

  selectedItems.forEach(item => {
    if (sudahDipakai.has(item.id)) return;
    sudahDipakai.add(item.id);

    const isSubSubElemen = item.type === 'subSubElemen';

    // namaFokus HARUS persis sama dengan nama di kisiTKA.ts (sub.nama untuk
    // level subElemen, ss.nama untuk level subSubElemen) — ini yang dicocokkan
    // oleh cocokFokus() di generateSoal.ts. JANGAN digabung dengan teks lain,
    // karena kalau digabung (misal "SubElemen - SubSubElemen"), string itu
    // tidak akan pernah cocok dengan nama asli di data kisi.
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

  return hasil;
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
  topikSesiIni,
  riwayatPertanyaanTopik,
}: GenerateSoalParams): Promise<SoalHasil> {
  if (selectedItems.length === 0) {
    throw new Error('Tidak ada topik yang dipilih.');
  }

  // Kalau komponen sudah menentukan topikSesiIni (hasil round-robin), agent
  // WAJIB fokus hanya ke topik itu untuk sesi ini — supaya setiap topik yang
  // dicentang pasti kebagian giliran dan tidak "hilang" karena LLM bebas pilih.
  // Fallback ke perilaku lama (gabungan semua topik tercentang) kalau tidak diisi,
  // demi kompatibilitas mundur.
  const fokusTopik = topikSesiIni
    ? [topikSesiIni.namaFokus]
    : Array.from(new Set(selectedItems.map(item => item.subElemenNama || item.nama)));

  // Kalau topik sesi ini levelnya sub-sub-elemen, kirim nama exact-nya sebagai
  // fokusSubSubElemen supaya generateSoal.ts memberi instruksi presisi ke LLM
  // (bukan cuma "fokus ke sub-elemen induknya secara umum").
  const fokusSubSubElemen = topikSesiIni?.isSubSubElemen ? topikSesiIni.namaFokus : undefined;

  // Kelas yang SAH untuk topik sesi ini (dari kisiTKA) — dikirim sebagai
  // validasi keras di generateSoal.ts, supaya LLM tidak bisa asal menulis
  // kelas yang tidak sesuai fase/topik yang dicentang (misal selalu "1"
  // padahal topiknya Fase E / kelas 10-11).
  const kelasValidTopik = topikSesiIni?.kelasValid;

  const hasil = await generateSoalAdaptif(
    mataPelajaran,            // Menggunakan variabel mataPelajaran yang aktif
    1,                        // 1 soal per pemanggilan (kontrak SoalHasil: satu soal per sesi)
    statistikElemen,
    undefined,                // kelasTarget — tidak dipakai, kelas sudah terkandung di fokusTopik
    undefined,                // modeFilter
    selectedModel,
    undefined,                // bloomTarget
    fokusTopik,
    riwayatPertanyaanTopik,   // agar 10 soal untuk topik yang sama tidak berulang
    fokusSubSubElemen,
    kelasValidTopik
  );

  const soal = hasil[0];
  if (!soal) {
    throw new Error('Agent tidak mengembalikan soal untuk topik yang dipilih.');
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

// src/agent/generateSoal.ts

import { askLLMWithFallback } from "./llm";

import { pilihPrompt } from "./promptSelector";
import {
  buatRingkasanKisiKisi,
  buatRingkasanSubElemen,
  getFaseDariKelas,
  KISI_MATEMATIKA,
  type Fase,
  type Elemen,
} from "../config/kisiTKA";
import { parseJSONSoal, perbaikiJawabanBenar } from "../services/soal-generator/parser";
import {
  validasiStrukturSoal,
  normalisasiSoal,
  validasiKisiKisi,
  validasiSubElemenKisi,
  validasiSubSubElemen,
} from "../services/soal-generator/validator";

// ==================== TIPE DATA ====================
export interface SoalItemGenerated {
  pertanyaan: string;
  pilihan: string[];
  jawaban_benar: string | string[];
  tipeSoal?: 'single' | 'multi';
  elemen: string;
  subElemen: string;
  fase: string;
  kelas: number;
  taxonomiBloom: string;
  pembahasan?: string;
  model?: string; // Menambahkan field model
  subSubElemen?: string;
}

// ==================== HELPER FUNCTIONS ====================
function getSubElemenRelevan(kelasTarget?: number, modeFilter?: 'hanya' | 'sampai', fokusTopik?: string[]): string {
  // cocokFokus sekarang mengenali 3 level: nama elemen, nama sub-elemen, DAN
  // nama sub-sub-elemen. Sebelumnya hanya 2 level teratas dikenali, sehingga
  // topik seperti "Membaca bilangan 1-100" (sub-sub-elemen) tidak pernah
  // dianggap cocok dan baris konteksnya tidak pernah muncul di prompt.
  type SubDenganSubSub = {
    nama: string;
    subSubElemen?: { nama: string; kelas: number[]; bloomTarget: string[] }[];
  };

  const subSubCocok = (sub: SubDenganSubSub) =>
    sub.subSubElemen?.filter(ss => fokusTopik!.includes(ss.nama)) || [];

  const cocokFokus = (elemenNama: string, sub: SubDenganSubSub) =>
    !fokusTopik || fokusTopik.length === 0 ||
    fokusTopik.includes(sub.nama) ||
    fokusTopik.includes(elemenNama) ||
    subSubCocok(sub).length > 0;

  if (!kelasTarget) {
    if (!fokusTopik || fokusTopik.length === 0) return buatRingkasanSubElemen();
    const lines: string[] = [];
    KISI_MATEMATIKA.forEach(elemen => {
      elemen.subElemen.forEach(sub => {
        if (cocokFokus(elemen.nama, sub)) {
          lines.push(
            `- ${elemen.nama} > ${sub.nama} (Kelas ${sub.kelas.join(', ')}, Fase ${elemen.fase.join(', ')}, Bloom: ${sub.bloomTarget.join('/')})`
          );
          // Kalau fokusTopik cocok ke sub-sub-elemen spesifik, tampilkan
          // baris tambahan dengan kelas & Bloom milik sub-sub-elemen ITU
          // SENDIRI (bisa berbeda dari sub-elemen induknya), supaya LLM
          // tahu persis target soalnya, bukan cuma level sub-elemen umum.
          subSubCocok(sub).forEach(ss => {
            lines.push(
              `    -> FOKUS SPESIFIK: ${ss.nama} (Kelas ${ss.kelas.join(', ')}, Bloom: ${ss.bloomTarget.join('/')})`
            );
          });
        }
      });
    });
    return lines.join('\n') || 'Tidak ada sub-elemen yang cocok dengan topik terpilih.';
  }

  const kelasRange = modeFilter === 'hanya' ? [kelasTarget] : Array.from({ length: kelasTarget }, (_, i) => i + 1);
  const subElemenRelevan: string[] = [];
  
  KISI_MATEMATIKA.forEach(elemen => {
    elemen.subElemen.forEach(sub => {
      const isRelevan = sub.kelas.some(k => kelasRange.includes(k)) && cocokFokus(elemen.nama, sub);
      if (isRelevan) {
        subElemenRelevan.push(
          `- ${elemen.nama} > ${sub.nama} (Kelas ${sub.kelas.filter(k => kelasRange.includes(k)).join(', ')}, Bloom: ${sub.bloomTarget.join('/')})`
        );
      }
    });
  });
  
  return subElemenRelevan.join('\n') || 'Tidak ada sub-elemen untuk filter ini.';
}

function getElemenRelevan(kelasTarget?: number, modeFilter?: 'hanya' | 'sampai', fokusTopik?: string[]): string {
  const subCocokFokus = (sub: { nama: string; subSubElemen?: { nama: string }[] }, elemenNama: string) =>
    !fokusTopik || fokusTopik.length === 0 ||
    fokusTopik.includes(sub.nama) ||
    fokusTopik.includes(elemenNama) ||
    (sub.subSubElemen?.some(ss => fokusTopik!.includes(ss.nama)) ?? false);

  const elemenCocokFokus = (elemen: Elemen) =>
    !fokusTopik || fokusTopik.length === 0 ||
    fokusTopik.includes(elemen.nama) ||
    elemen.subElemen.some(s => subCocokFokus(s, elemen.nama));

  if (!kelasTarget) {
    if (!fokusTopik || fokusTopik.length === 0) return buatRingkasanKisiKisi();
    const lines: string[] = [];
    KISI_MATEMATIKA.filter(elemenCocokFokus).forEach(e => {
      const subRelevan = e.subElemen.filter(s => subCocokFokus(s, e.nama));
      lines.push(`- ${e.nama} (Fase ${e.fase.join(', ')}): ${subRelevan.length} sub-elemen relevan`);
    });
    return lines.join('\n') || 'Tidak ada elemen yang cocok dengan topik terpilih.';
  }
  
  const faseTarget = getFaseDariKelas(kelasTarget);
  const faseList = modeFilter === 'hanya'
    ? [faseTarget]
    : ['A', 'B', 'C', 'D', 'E', 'F'].filter(f => {
        const faseOrder = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 };
        return faseOrder[f as Fase] <= faseOrder[faseTarget];
      });
  
  const lines: string[] = [];
  faseList.forEach(fase => {
    const elemen = KISI_MATEMATIKA.filter(e => e.fase.includes(fase as Fase) && elemenCocokFokus(e));
    if (elemen.length > 0) {
      lines.push(`\nFASE ${fase}:`);
      elemen.forEach(e => {
        const subRelevan = e.subElemen.filter(s => {
          const kelasCocok = s.kelas.some(k => {
            if (modeFilter === 'hanya') return k === kelasTarget;
            return k <= kelasTarget;
          });
          return kelasCocok && subCocokFokus(s, e.nama);
        });
        if (subRelevan.length > 0) {
          lines.push(`  - ${e.nama}: ${subRelevan.length} sub-elemen`);
        }
      });
    }
  });
  
  return lines.join('\n');
}

// ==================== FUNGSI UTAMA ====================
export async function generateSoalAdaptif(
  mataPelajaran: string,
  jumlahSoal: number,
  statistikElemenTerakhir: Record<string, { benar: number; total: number }>,
  kelasTarget?: number,
  modeFilter?: 'hanya' | 'sampai',
  selectedModel?: string,
  bloomTarget?: string,
  fokusTopik?: string[],
  riwayatPertanyaan?: string[],
  fokusSubSubElemen?: string,
  kelasValidTopik?: number[],
  forcedType?: 'single' | 'multi'
): Promise<SoalItemGenerated[]> {
  console.log('[DEBUG-GENERATE] generateSoalAdaptif dipanggil:', {
    mataPelajaran,
    jumlahSoal,
    statistikElemenTerakhir,
    kelasTarget,
    modeFilter,
    selectedModel,
    bloomTarget,
    fokusTopik,
    fokusSubSubElemen,
    kelasValidTopik,
    jumlahRiwayatPertanyaan: riwayatPertanyaan?.length ?? 0,
    forcedType,
  });

  // Jika belum ada forcedType dan jumlah soal > 1, bagi menjadi 60% single dan 40% multi
  if (!forcedType && jumlahSoal > 1) {
    const numSingle = Math.max(1, Math.round(jumlahSoal * 0.6));
    const numMulti = Math.max(1, jumlahSoal - numSingle);

    console.log(`[DEBUG-GENERATE] Membagi soal: ${numSingle} single, ${numMulti} multi`);

    const [singleSoal, multiSoal] = await Promise.all([
      generateSoalAdaptif(mataPelajaran, numSingle, statistikElemenTerakhir, kelasTarget, modeFilter, selectedModel, bloomTarget, fokusTopik, riwayatPertanyaan, fokusSubSubElemen, kelasValidTopik, 'single'),
      generateSoalAdaptif(mataPelajaran, numMulti, statistikElemenTerakhir, kelasTarget, modeFilter, selectedModel, bloomTarget, fokusTopik, riwayatPertanyaan, fokusSubSubElemen, kelasValidTopik, 'multi')
    ]);

    return [...singleSoal, ...multiSoal];
  }

  // Jika forcedType = single tapi jumlah soal 0 (karena pembulatan), set jadi 1
  const actualJumlahSoal = Math.max(1, jumlahSoal);

  const entri = Object.entries(statistikElemenTerakhir);
  // ... (rest of the function)

  const nilai =
    entri.length > 0
      ? entri.reduce((total, [, s]) => {
          return total + (s.total > 0 ? (s.benar / s.total) * 100 : 0);
        }, 0) / entri.length
      : 60;

  const promptTemplate = pilihPrompt(nilai);

  const ringkasanPerforma =
    entri.length > 0
      ? entri
          .map(([elemen, s]) => {
            const akurasi = s.total > 0 ? Math.round((s.benar / s.total) * 100) : 0;
            let arahan: string;
            if (akurasi >= 80) arahan = "NAIKKAN tingkat kesulitan (Bloom lebih tinggi)";
            else if (akurasi < 50) arahan = "TURUNKAN atau PERTAHANKAN tingkat mudah (Bloom lebih rendah)";
            else arahan = "PERTAHANKAN tingkat menengah";
            return `- ${elemen}: ${akurasi}% (${s.benar}/${s.total}) -> ${arahan}`;
          })
          .join("\n")
      : "Tidak ada data performa. Buat soal menengah merata untuk SEMUA elemen.";

  const arahanKelas =
    kelasValidTopik && kelasValidTopik.length > 0
      ? `HANYA kelas ${kelasValidTopik.join(' atau ')} (sesuai topik yang difokuskan — JANGAN pakai kelas lain).`
      : kelasTarget != null
        ? modeFilter === 'hanya'
          ? `HANYA kelas ${kelasTarget}.`
          : `Kelas 1-${kelasTarget} saja.`
        : 'Kelas 1-12.';

  const elemenRelevan = getElemenRelevan(kelasTarget, modeFilter, fokusTopik);
  const subElemenRelevan = getSubElemenRelevan(kelasTarget, modeFilter, fokusTopik);

  let prompt = promptTemplate
    .replace("{{mataPelajaran}}", mataPelajaran)
    .replace("{{elemenRelevan}}", elemenRelevan)
    .replace("{{subElemenRelevan}}", subElemenRelevan)
    .replace("{{arahanKelas}}", arahanKelas)
    .replace("{{ringkasanPerforma}}", ringkasanPerforma)
    .replace("{{jumlahSoal}}", String(actualJumlahSoal));

  if (bloomTarget) {
    prompt += `\n\nINSTRUKSI TAMBAHAN: Pastikan semua soal memiliki tingkat taksonomi Bloom minimal ${bloomTarget}.`;
  }

  if (forcedType) {
    prompt += `\n\nINSTRUKSI WAJIB: Buat HANYA soal tipe "${forcedType}". Jangan buat tipe lain.`;
  }

  if (fokusTopik && fokusTopik.length > 0) {
    prompt += `\n\nINSTRUKSI TAMBAHAN: Fokuskan SEMUA soal HANYA pada topik-topik berikut (jangan buat soal di luar topik ini): ${fokusTopik.join(', ')}.`;
  }

  if (riwayatPertanyaan && riwayatPertanyaan.length > 0) {
    const daftarRiwayat = riwayatPertanyaan
      .map((p, i) => `${i + 1}. ${p}`)
      .join('\n');
    prompt += `\n\nINSTRUKSI TAMBAHAN: Soal berikut SUDAH PERNAH diberikan untuk topik ini pada sesi-sesi sebelumnya. Buat soal yang BENAR-BENAR BERBEDA (bukan variasi kecil/parafrase) dari daftar ini — beda angka, beda konteks, beda pendekatan/representasi, atau beda sub-fokus dalam topik yang sama:\n${daftarRiwayat}`;
  }

  if (fokusSubSubElemen) {
    prompt += `\n\nINSTRUKSI TAMBAHAN (PALING PENTING): Soal ini HARUS spesifik tentang sub-sub-elemen "${fokusSubSubElemen}" — JANGAN buat soal yang hanya membahas sub-elemen induknya secara umum. Tambahkan juga field "subSubElemen" pada JSON hasil dengan nilai PERSIS "${fokusSubSubElemen}" (sama persis penulisannya, tanpa diubah).`;
  }

  if (kelasValidTopik && kelasValidTopik.length > 0) {
    prompt += `\n\nINSTRUKSI TAMBAHAN (WAJIB, SERING SALAH): Field "kelas" pada JSON HARUS salah satu dari: ${kelasValidTopik.join(', ')}. Ini adalah kelas yang benar untuk topik yang difokuskan pada soal ini — JANGAN menulis kelas lain (misalnya jangan menulis kelas 1 kalau topiknya bukan untuk kelas 1). Field "fase" juga harus konsisten dengan kelas tersebut.`;
  }

  const maxRetries = 1;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[DEBUG-GENERATE] Attempt ${attempt}/${maxRetries}`);
    try {
      // Estimasi token yang dibutuhkan berdasarkan jumlah soal yang diminta.
      // Default lama (1024) di llm.ts cuma cukup untuk ~1-2 soal singkat —
      // kalau jumlahSoal lebih besar, respons JSON dari LLM kepotong di
      // tengah dan gagal di-parse. ~600 token per soal (pertanyaan + 4-5
      // pilihan + overhead JSON) + buffer 500 token, dibatasi maks 8000
      // supaya tidak melebihi batas output sebagian besar model/provider.
      const maxTokens = Math.min(8000, actualJumlahSoal * 600 + 500);
      const { text: hasilMentah, model } = await askLLMWithFallback(prompt, undefined, undefined, undefined, maxTokens);

      const parsed = parseJSONSoal(hasilMentah);

      if (!Array.isArray(parsed)) throw new Error('Hasil bukan array');
      if (parsed.length === 0) throw new Error('Array kosong');

      for (let i = 0; i < parsed.length; i++) {
        const s = parsed[i];
        if (!validasiStrukturSoal(s)) {
          throw new Error(`Soal ke-${i + 1} tidak memiliki field wajib`);
        }
        perbaikiJawabanBenar(s, i);
        s.model = model; // Tambahkan model
      }

      const soalValid = parsed
        .filter((s: any) => {
          const kelasNum = Number(s.kelas);
          return Number.isFinite(kelasNum) && kelasNum >= 1 && kelasNum <= 12;
        })
        .map((s: any) => normalisasiSoal(s, kelasTarget))
        .filter((s: any) => validasiKisiKisi(s))
        .map((s: any) => validasiSubElemenKisi(s))
        .filter((s: any) => {
          if (kelasTarget == null) return true;
          return modeFilter === 'hanya' ? s.kelas === kelasTarget : s.kelas <= kelasTarget;
        })
        .filter((s: any) => {
          if (!kelasValidTopik || kelasValidTopik.length === 0) return true;
          return kelasValidTopik.includes(s.kelas);
        });

      if (fokusSubSubElemen) {
        soalValid.forEach((s: any, i: number) => {
          if (!s.subSubElemen) {
            console.warn(`[DEBUG-GENERATE] Soal ${i + 1}: LLM tidak menyertakan field subSubElemen (diharapkan "${fokusSubSubElemen}").`);
          } else if (!validasiSubSubElemen(s.subSubElemen, s.subElemen, s.elemen, s.fase)) {
            console.warn(`[DEBUG-GENERATE] Soal ${i + 1}: field subSubElemen "${s.subSubElemen}" tidak ditemukan di kisi-kisi untuk ${s.elemen} > ${s.subElemen}.`);
          } else if (s.subSubElemen !== fokusSubSubElemen) {
            console.warn(`[DEBUG-GENERATE] Soal ${i + 1}: subSubElemen hasil ("${s.subSubElemen}") berbeda dari yang difokuskan ("${fokusSubSubElemen}").`);
          }
        });
      }

      if (soalValid.length === 0) throw new Error("Semua soal melanggar aturan kisi-kisi.");

      return soalValid;
    } catch (err: any) {
      console.error(`[DEBUG-GENERATE] Attempt ${attempt} gagal:`, err.message);
      lastError = err;
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }

  throw new Error(`AI mengembalikan format soal yang tidak valid. Error terakhir: ${lastError?.message}`);
}

// ==================== FUNGSI BERBASIS POSISI ====================
export async function generateSoalBerbasisPosisi(
  mataPelajaran: string,
  detailSoal: any,
  posisi: number = 0,
  kelasTarget?: number,
  modeFilter?: 'hanya' | 'sampai',
  selectedModel?: string
): Promise<SoalItemGenerated[]> {
  console.log(`[DEBUG-GENERATE] generateSoalBerbasisPosisi dipanggil, posisi: ${posisi}`);

  const jumlahSoal = detailSoal?.jumlahSoal ?? 10;
  
  return generateSoalAdaptif(
    mataPelajaran,
    jumlahSoal,
    {},
    kelasTarget,
    modeFilter,
    selectedModel
  );
}

import { askLLM } from "./llm";
import { pilihPrompt } from "./promptSelector";
import {
  buatRingkasanKisiKisi,
  buatRingkasanSubElemen,
  validasiElemenFase,
  validasiSubElemen,
  getFaseDariKelas,
  KISI_MATEMATIKA,
  type Fase,
} from "../config/kisiTKA";

export interface SoalItemGenerated {
  pertanyaan: string;
  pilihan: string[];
  jawaban_benar: string;
  elemen: string;
  subElemen: string;
  fase: string;
  kelas: number;
  taxonomiBloom: string;
}

// ==================== HELPER ====================

function getSubElemenRelevan(kelasTarget?: number, modeFilter?: 'hanya' | 'sampai'): string {
  if (!kelasTarget) return buatRingkasanSubElemen();
  const kelasRange = modeFilter === 'hanya' ? [kelasTarget] : Array.from({ length: kelasTarget }, (_, i) => i + 1);
  const subElemenRelevan: string[] = [];
  KISI_MATEMATIKA.forEach(elemen => {
    elemen.subElemen.forEach(sub => {
      const isRelevan = sub.kelas.some(k => kelasRange.includes(k));
      if (isRelevan) {
        subElemenRelevan.push(
          `- ${elemen.nama} > ${sub.nama} (Kelas ${sub.kelas.filter(k => kelasRange.includes(k)).join(', ')}, Bloom: ${sub.bloomTarget.join('/')})`
        );
      }
    });
  });
  return subElemenRelevan.join('\n') || 'Tidak ada sub-elemen untuk filter ini.';
}

function getElemenRelevan(kelasTarget?: number, modeFilter?: 'hanya' | 'sampai'): string {
  if (!kelasTarget) return buatRingkasanKisiKisi();
  const faseTarget = getFaseDariKelas(kelasTarget);
  const faseList = modeFilter === 'hanya'
    ? [faseTarget]
    : ['A', 'B', 'C', 'D', 'E', 'F'].filter(f => {
        const faseOrder = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 };
        return faseOrder[f as Fase] <= faseOrder[faseTarget];
      });
  const lines: string[] = [];
  faseList.forEach(fase => {
    const elemen = KISI_MATEMATIKA.filter(e => e.fase.includes(fase as Fase));
    if (elemen.length > 0) {
      lines.push(`\nFASE ${fase}:`);
      elemen.forEach(e => {
        const subRelevan = e.subElemen.filter(s =>
          s.kelas.some(k => {
            if (modeFilter === 'hanya') return k === kelasTarget;
            return k <= kelasTarget;
          })
        );
        lines.push(`  - ${e.nama}: ${subRelevan.length} sub-elemen`);
      });
    }
  });
  return lines.join('\n');
}

/**
 * PERBAIKAN KRITIS: Parser JSON yang sangat toleran
 * Menangani: Markdown blocks, single quotes, trailing commas, 
 * dan karakter kontrol tersembunyi yang menyebabkan "Unexpected token"
 */
function parseJSONSoal(hasilMentah: string): any[] {
  console.log('[DEBUG-PARSE] Raw input length:', hasilMentah.length);
  
  let jsonString = hasilMentah.trim();

  // 1. Hapus Markdown Code Blocks (```json ... ```)
  jsonString = jsonString.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');

  // 2. Ekstrak Array JSON Terdalam
  // Regex ini mencari [...] termasuk nested objects/arrays di dalamnya
  // Flag 's' membuat . match newline juga
  const jsonMatch = jsonString.match(/$$\s*\{.*\}\s*$$/s);
  
  if (!jsonMatch) {
    console.error('[DEBUG-PARSE] Tidak menemukan pola array JSON. Input:', jsonString.substring(0, 200));
    throw new Error('Format respons AI tidak mengandung array soal yang valid.');
  }
  
  jsonString = jsonMatch[0];

  // 3. Sanitasi Agresif untuk Mencegah "Unexpected token"
  
  // a. Ganti Single Quote menjadi Double Quote (Hanya untuk key/value, bukan apostrof)
  // Pola: ,'key': atau {'key': atau :"value"
  jsonString = jsonString
    .replace(/([{,]\s*)'([^']+)'\s*:/g, '$1"$2":')
    .replace(/:\s*'([^']*)'/g, ':"$1"');

  // b. Hapus Trailing Commas (,{ ,} -> {)
  jsonString = jsonString.replace(/,\s*([}$$])/g, '$1');

  // c. Hapus Karakter Kontrol Non-Printable (kecuali \n, \r, \t yang valid dalam string)
  // Ini adalah penyebab utama error "Unexpected token '\'" jika ada karakter biner tersembunyi
  jsonString = jsonString.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // d. Normalisasi Escape Sequence yang Rusak
  // Kadang AI menulis \\n (double backslash) alih-alih \n, atau sebaliknya
  // Kita biarkan JSON.parse menanganinya, tapi pastikan tidak ada backslash telanjang sebelum { atau [
  // Regex ini memperbaiki kasus: \n { -> newline { (yang valid secara visual tapi invalid JSON jika \n literal)
  // Solusi terbaik: Biarkan JSON.parse mencoba dulu, jika gagal baru lakukan pembersihan ekstrem
  
  try {
    return JSON.parse(jsonString);
  } catch (primaryErr: any) {
    console.warn('[DEBUG-PARSE] Parse awal gagal, mencoba sanitasi lanjutan...', primaryErr.message);
    
    // FALLBACK: Bersihkan semua newline literal yang berada DI LUAR string
    // Ini tricky, jadi kita gunakan pendekatan replace sederhana untuk kasus umum
    // Mengganti \n yang diikuti oleh { atau [ dengan spasi (memisahkan objek)
    const sanitized = jsonString
      .replace(/\\n\s*([{$$])/g, ' $1') 
      .replace(/\n\s*([{$$])/g, ' $1');

    try {
      return JSON.parse(sanitized);
    } catch (fallbackErr: any) {
      console.error('[DEBUG-PARSE] Gagal total. String terakhir (first 600):', sanitized.substring(0, 600));
      throw new Error(`Gagal memparsing JSON: ${fallbackErr.message}`);
    }
  }
}

function perbaikiJawabanBenar(s: any, i: number) {
  if (!s.pilihan.includes(s.jawaban_benar)) {
    console.warn(`[DEBUG-GENERATE] Soal ${i + 1}: jawaban_benar tidak cocok, memperbaiki...`);
    const prefix = s.jawaban_benar.match(/^[A-D]\./)?.[0];
    if (prefix) {
      const cocok = s.pilihan.find((p: string) => p.startsWith(prefix));
      if (cocok) {
        s.jawaban_benar = cocok;
      } else {
        s.jawaban_benar = s.pilihan[0];
      }
    } else {
      s.jawaban_benar = s.pilihan[0];
    }
  }
}

// ==================== FUNGSI UTAMA ====================
export async function generateSoalAdaptif(
  mataPelajaran: string,
  jumlahSoal: number,
  statistikElemenTerakhir: Record<string, { benar: number; total: number }>,
  kelasTarget?: number,
  modeFilter?: 'hanya' | 'sampai',
  selectedModel?: string,
  bloomTarget?: string
): Promise<SoalItemGenerated[]> {
  console.log('[DEBUG-GENERATE] generateSoalAdaptif dipanggil:', {
    mataPelajaran,
    jumlahSoal,
    statistikElemenTerakhir,
    kelasTarget,
    modeFilter,
    selectedModel,
    bloomTarget,
  });

  const entri = Object.entries(statistikElemenTerakhir);

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
    kelasTarget != null
      ? modeFilter === 'hanya'
        ? `HANYA kelas ${kelasTarget}.`
        : `Kelas 1-${kelasTarget} saja.`
      : 'Kelas 1-12.';

  const elemenRelevan = getElemenRelevan(kelasTarget, modeFilter);
  const subElemenRelevan = getSubElemenRelevan(kelasTarget, modeFilter);

  let prompt = promptTemplate
    .replace("{{mataPelajaran}}", mataPelajaran)
    .replace("{{elemenRelevan}}", elemenRelevan)
    .replace("{{subElemenRelevan}}", subElemenRelevan)
    .replace("{{arahanKelas}}", arahanKelas)
    .replace("{{ringkasanPerforma}}", ringkasanPerforma)
    .replace("{{jumlahSoal}}", String(jumlahSoal));

  if (bloomTarget) {
    prompt += `\n\nINSTRUKSI TAMBAHAN: Pastikan semua soal memiliki tingkat taksonomi Bloom minimal ${bloomTarget}.`;
  }

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[DEBUG-GENERATE] Attempt ${attempt}/${maxRetries}`);
    try {
      const hasilMentah = await askLLM(prompt, selectedModel);
      const parsed = parseJSONSoal(hasilMentah);

      if (!Array.isArray(parsed)) throw new Error('Hasil bukan array');
      if (parsed.length === 0) throw new Error('Array kosong');

      for (let i = 0; i < parsed.length; i++) {
        const s = parsed[i];
        if (!s.pertanyaan || !Array.isArray(s.pilihan) || !s.jawaban_benar) {
          throw new Error(`Soal ke-${i + 1} tidak memiliki field wajib`);
        }
        perbaikiJawabanBenar(s, i);
      }

      const soalValid = parsed
        .filter((s: any) => {
          const kelasNum = Number(s.kelas);
          return Number.isFinite(kelasNum) && kelasNum >= 1 && kelasNum <= 12;
        })
        .map((s: any) => ({
          ...s,
          kelas: Number(s.kelas),
          fase: getFaseDariKelas(Number(s.kelas)),
        }))
        .filter((s: any) => validasiElemenFase(s.elemen, s.fase))
        .filter((s: any) => {
          if (kelasTarget == null) return true;
          return modeFilter === 'hanya' ? s.kelas === kelasTarget : s.kelas <= kelasTarget;
        })
        .map((s: any) => {
          if (!validasiSubElemen(s.subElemen, s.elemen, s.fase)) {
            return { ...s, subElemen: '' };
          }
          return s;
        });

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

  const jumlahSoal = detailSoal?.jumlahSoal ?? 1;
  return generateSoalAdaptif(
    mataPelajaran,
    jumlahSoal,
    {},
    kelasTarget,
    modeFilter,
    selectedModel
  );
}

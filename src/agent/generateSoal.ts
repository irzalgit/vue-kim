// src/agent/generateSoal.ts
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
  type Elemen,
} from "../config/kisiTKA";

// ==================== TIPE DATA ====================
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

// ==================== HELPER FUNCTIONS ====================
function getSubElemenRelevan(kelasTarget?: number, modeFilter?: 'hanya' | 'sampai', fokusTopik?: string[]): string {
  const cocokFokus = (elemenNama: string, subNama: string) =>
    !fokusTopik || fokusTopik.length === 0 || fokusTopik.includes(subNama) || fokusTopik.includes(elemenNama);

  if (!kelasTarget) {
    if (!fokusTopik || fokusTopik.length === 0) return buatRingkasanSubElemen();
    const lines: string[] = [];
    KISI_MATEMATIKA.forEach(elemen => {
      elemen.subElemen.forEach(sub => {
        if (cocokFokus(elemen.nama, sub.nama)) {
          lines.push(
            `- ${elemen.nama} > ${sub.nama} (Kelas ${sub.kelas.join(', ')}, Fase ${elemen.fase.join(', ')}, Bloom: ${sub.bloomTarget.join('/')})`
          );
        }
      });
    });
    return lines.join('\n') || 'Tidak ada sub-elemen yang cocok dengan topik terpilih.';
  }

  const kelasRange = modeFilter === 'hanya' ? [kelasTarget] : Array.from({ length: kelasTarget }, (_, i) => i + 1);
  const subElemenRelevan: string[] = [];
  
  KISI_MATEMATIKA.forEach(elemen => {
    elemen.subElemen.forEach(sub => {
      const isRelevan = sub.kelas.some(k => kelasRange.includes(k)) && cocokFokus(elemen.nama, sub.nama);
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
  const elemenCocokFokus = (elemen: Elemen) =>
    !fokusTopik || fokusTopik.length === 0 ||
    fokusTopik.includes(elemen.nama) ||
    elemen.subElemen.some(s => fokusTopik!.includes(s.nama));

  if (!kelasTarget) {
    if (!fokusTopik || fokusTopik.length === 0) return buatRingkasanKisiKisi();
    const lines: string[] = [];
    KISI_MATEMATIKA.filter(elemenCocokFokus).forEach(e => {
      const subRelevan = e.subElemen.filter(s => !fokusTopik || fokusTopik.length === 0 || fokusTopik.includes(s.nama) || fokusTopik.includes(e.nama));
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
          const fokusCocok = !fokusTopik || fokusTopik.length === 0 || fokusTopik.includes(s.nama) || fokusTopik.includes(e.nama);
          return kelasCocok && fokusCocok;
        });
        if (subRelevan.length > 0) {
          lines.push(`  - ${e.nama}: ${subRelevan.length} sub-elemen`);
        }
      });
    }
  });
  
  return lines.join('\n');
}

function parseJSONSoal(hasilMentah: string): any[] {
  console.log("[DEBUG-PARSE] Raw input length:", hasilMentah.length);

  let text = hasilMentah
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const match = text.match(/\[\s*[\s\S]*\]/);

  if (!match) {
    console.error("[DEBUG-PARSE] JSON tidak ditemukan");
    console.error(text.substring(0, 500));
    throw new Error("AI tidak mengembalikan array JSON.");
  }

  let jsonString = match[0];

  jsonString = jsonString
    .replace(/([{,]\s*)'([^']+)'\s*:/g, '$1"$2":')
    .replace(/:\s*'([^']*)'/g, ':"$1"')
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/\r/g, "")
    .trim();

  try {
    const hasil = JSON.parse(jsonString);
    if (!Array.isArray(hasil)) throw new Error("Respons AI bukan array.");
    return hasil;
  } catch (err: any) {
    console.error("[DEBUG-PARSE] JSON Parse Error:", err.message);
    console.error(jsonString.substring(0, 1000));
    throw new Error(`AI mengembalikan format soal yang tidak valid. ${err.message}`);
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
  bloomTarget?: string,
  fokusTopik?: string[]
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

  const elemenRelevan = getElemenRelevan(kelasTarget, modeFilter, fokusTopik);
  const subElemenRelevan = getSubElemenRelevan(kelasTarget, modeFilter, fokusTopik);

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

  if (fokusTopik && fokusTopik.length > 0) {
    prompt += `\n\nINSTRUKSI TAMBAHAN: Fokuskan SEMUA soal HANYA pada topik-topik berikut (jangan buat soal di luar topik ini): ${fokusTopik.join(', ')}.`;
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
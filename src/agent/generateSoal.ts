// agent/generateSoal.ts

import { askLLM } from "./llm";
import {
  buatRingkasanKisiKisi,
  buatRingkasanSubElemen,
  validasiElemenFase,
  validasiSubElemen,
  getFaseDariKelas,
  KISI_MATEMATIKA,
  type Fase
} from "../config/kisiTKA";
import type { DetailSoalEntry } from "../utils/riwayat";

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

// ==================== HELPER LAMA (soal acak berbasis statistik elemen) ====================

function getSubElemenRelevan(kelasTarget?: number, modeFilter?: 'hanya' | 'sampai'): string {
  if (!kelasTarget) return buatRingkasanSubElemen();

  const kelasRange = modeFilter === 'hanya' 
    ? [kelasTarget] 
    : Array.from({length: kelasTarget}, (_, i) => i + 1);
  
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
        const faseOrder = {A:1, B:2, C:3, D:4, E:5, F:6};
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

function parseJSONSoal(hasilMentah: string): any[] {
  console.log('[DEBUG-PARSE] Input mentah (first 200 chars):', hasilMentah.substring(0, 200));
  
  let jsonString = hasilMentah;
  
  jsonString = jsonString.replace(/```(?:json)?\s*/gi, "");
  jsonString = jsonString.replace(/```\s*$/gi, "");
  jsonString = jsonString.replace(/```/g, "");
  
  const startIdx = jsonString.indexOf('[');
  const endIdx = jsonString.lastIndexOf(']');
  
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    console.error('[DEBUG-PARSE] Tidak menemukan tanda [ atau ]');
    throw new Error('Tidak menemukan array JSON dalam respons');
  }
  
  jsonString = jsonString.substring(startIdx, endIdx + 1);
  
  jsonString = jsonString
    .replace(/,\s*([}\]])/g, '$1')
    .replace(/([{,]\s*)'([^']*)':/g, '$1"$2":')
    .replace(/:\s*'([^']*)'/g, ':"$1"')
    .replace(/\\n/g, '\\\\n')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  
  try {
    const parsed = JSON.parse(jsonString);
    console.log('[DEBUG-PARSE] Parse berhasil, tipe:', typeof parsed, 'isArray:', Array.isArray(parsed));
    return parsed;
  } catch (parseErr: any) {
    console.error('[DEBUG-PARSE] Parse gagal:', parseErr.message);
    console.error('[DEBUG-PARSE] String yang dicoba:', jsonString.substring(0, 500));
    throw parseErr;
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

export async function generateSoalAdaptif(
  mataPelajaran: string,
  jumlahSoal: number,
  statistikElemenTerakhir: Record<string, { benar: number; total: number }>,
  kelasTarget?: number,
  modeFilter?: 'hanya' | 'sampai',
  selectedModel?: string
): Promise<SoalItemGenerated[]> {
  console.log('[DEBUG-GENERATE] generateSoalAdaptif dipanggil:', {
    mataPelajaran, jumlahSoal, statistikElemenTerakhir, kelasTarget, modeFilter, selectedModel,
  });

  const entri = Object.entries(statistikElemenTerakhir);

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

  // ==================== PROMPT YANG DIPERBAIKI ====================
  const prompt = `
Kamu adalah pembuat soal ${mataPelajaran} untuk siswa TKA Kemendikdasmen.

ATURAN ELEMEN YANG RELEVAN:
${elemenRelevan}

DAFTAR SUB-ELEMEN VALID (hanya yang relevan):
${subElemenRelevan}

BATASAN KELAS: ${arahanKelas}

PERFORMA SISWA PER ELEMEN:
${ringkasanPerforma}

INSTRUKSI PEMBUATAN SOAL:
1. Buat TEPAT ${jumlahSoal} soal pilihan ganda BARU.
2. Tingkat kesulitan (Bloom) menyesuaikan performa per elemen:
   - Akurasi ≥ 80% → naikkan level Bloom (C1→C2→…).
   - Akurasi < 50% → turunkan atau pertahankan level rendah.
   - 50–79% → pertahankan level menengah.
3. Elemen dan sub‑elemen WAJIB berasal dari daftar valid di atas.
4. Kelas soal WAJIB sesuai batasan (${arahanKelas}).
5. Taxonomi Bloom WAJIB sesuai target sub‑elemen (lihat kolom Bloom di daftar).
6. Setiap soal harus memiliki 4 pilihan jawaban.
7. "jawaban_benar" HARUS sama persis dengan salah satu item pada "pilihan".

OUTPUT WAJIB — IKUTI DENGAN SANGAT TEGAS:
- Hanya JSON array, TIDAK ADA teks lain.
- TIDAK ADA markdown code block (jangan pakai \`\`\`).
- Langsung mulai dengan '[' dan akhiri dengan ']'.

Format setiap objek:
{
  "pertanyaan": "...",
  "pilihan": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "jawaban_benar": "A. ...",
  "elemen": "nama elemen valid",
  "subElemen": "nama sub-elemen valid",
  "fase": "A/B/C/D/E/F",
  "kelas": 1,
  "taxonomiBloom": "C1/C2/C3/C4/C5/C6"
}
`;

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
          fase: getFaseDariKelas(Number(s.kelas)) 
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

// ==================== BARU: SOAL BERBASIS POSISI (level naik/tetap per nomor) ====================

const BLOOM_ORDER = ['C1', 'C2', 'C3', 'C4', 'C5', 'C6'];

function bloomIndex(b: string): number {
  const idx = BLOOM_ORDER.indexOf(b);
  return idx === -1 ? 0 : idx;
}

// Cari data sub-elemen (untuk tahu batas Bloom maksimal yang wajar)
function cariSubElemenData(elemen: string, subElemen: string, fase: string) {
  const elemenData = KISI_MATEMATIKA.find(e => e.nama === elemen && e.fase.includes(fase as Fase));
  return elemenData?.subElemen.find(s => s.nama === subElemen);
}

// Tentukan level Bloom soal berikutnya: naik jika benar, tetap jika salah
// (dibatasi oleh bloomTarget maksimal sub-elemen tsb, kalau datanya ada di kisi-kisi)
function tentukanBloomBerikutnya(bloomSekarang: string, benar: boolean, batasMax?: string): string {
  if (!benar) return bloomSekarang;

  const idx = bloomIndex(bloomSekarang);
  const nextIdx = Math.min(idx + 1, BLOOM_ORDER.length - 1);
  let next = BLOOM_ORDER[nextIdx];

  if (batasMax && bloomIndex(next) > bloomIndex(batasMax)) {
    next = batasMax;
  }
  return next;
}

interface SlotTarget {
  nomor: number;
  elemen: string;
  subElemen: string;
  fase: string;
  kelas: number;
  bloomTarget: string;
}

function tentukanSlotTarget(detail: DetailSoalEntry[]): SlotTarget[] {
  return detail.map(d => {
    const subData = d.subElemen ? cariSubElemenData(d.elemen, d.subElemen, d.fase) : undefined;
    const batasMax = subData?.bloomTarget?.length
      ? subData.bloomTarget.reduce((max, b) => (bloomIndex(b) > bloomIndex(max) ? b : max), subData.bloomTarget[0])
      : undefined;
    const bloomBaru = tentukanBloomBerikutnya(d.taxonomiBloom || 'C1', d.benar, batasMax);

    return {
      nomor: d.nomor,
      elemen: d.elemen,
      subElemen: d.subElemen || '',
      fase: d.fase,
      kelas: d.kelas,
      bloomTarget: bloomBaru,
    };
  });
}

export async function generateSoalBerbasisPosisi(
  mataPelajaran: string,
  detailSoalSebelumnya: DetailSoalEntry[],
  selectedModel?: string
): Promise<SoalItemGenerated[]> {
  console.log('[DEBUG-GENERATE-POSISI] dipanggil, jumlah slot:', detailSoalSebelumnya.length);

  if (!detailSoalSebelumnya || detailSoalSebelumnya.length === 0) {
    throw new Error('Tidak ada detail soal sebelumnya untuk dijadikan basis posisi.');
  }

  const slots = tentukanSlotTarget(detailSoalSebelumnya);

  const daftarSlot = slots
    .map(s =>
      `Soal nomor ${s.nomor}: Elemen "${s.elemen}"${s.subElemen ? ` > Sub-elemen "${s.subElemen}"` : ''}, Fase ${s.fase}, Kelas ${s.kelas}, Target Level Bloom: ${s.bloomTarget}`
    )
    .join('\n');

  // ==================== PROMPT YANG DIPERBAIKI ====================
  const prompt = `
Kamu adalah pembuat soal ${mataPelajaran} untuk siswa TKA Kemendikdasmen.

Buat TEPAT ${slots.length} soal pilihan ganda baru, SATU SOAL untuk setiap baris berikut, urut sesuai nomor:

${daftarSlot}

ATURAN SANGAT PENTING:
1. Setiap soal WAJIB tentang materi (elemen/sub‑elemen) yang sama persis seperti tertulis di atas untuk setiap nomor.
2. Level kesulitan/taxonomi Bloom soal WAJIB mengikuti "Target Level Bloom" yang tertulis untuk nomor tersebut.
3. JANGAN ganti topik atau elemen, meskipun kamu merasa ada topik lain yang lebih menarik.
4. Setiap soal harus BERBEDA dari soal sebelumnya (jangan mengulang soal identik).
5. "jawaban_benar" HARUS sama persis dengan salah satu item pada "pilihan".

OUTPUT WAJIB — IKUTI DENGAN SANGAT TEGAS:
- Hanya JSON array berisi ${slots.length} item, urut sesuai nomor di atas.
- TIDAK ADA teks lain, TIDAK ADA markdown code block.
- Langsung mulai dengan '[' dan akhiri dengan ']'.

Format setiap item:
{
  "pertanyaan": "...",
  "pilihan": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "jawaban_benar": "A. ..."
}
`;

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[DEBUG-GENERATE-POSISI] Attempt ${attempt}/${maxRetries}`);

    try {
      const hasilMentah = await askLLM(prompt, selectedModel);
      const parsed = parseJSONSoal(hasilMentah);

      if (!Array.isArray(parsed)) throw new Error('Hasil bukan array');
      if (parsed.length !== slots.length) {
        throw new Error(`Jumlah soal tidak sesuai: dapat ${parsed.length}, harus ${slots.length}`);
      }

      for (let i = 0; i < parsed.length; i++) {
        const s = parsed[i];
        if (!s.pertanyaan || !Array.isArray(s.pilihan) || !s.jawaban_benar) {
          throw new Error(`Soal ke-${i + 1} tidak memiliki field wajib`);
        }
        perbaikiJawabanBenar(s, i);
      }

      // Gabungkan hasil AI (pertanyaan/pilihan/jawaban) dengan metadata slot (elemen/subElemen/fase/kelas/bloom)
      // yang sudah pasti valid — supaya tidak pernah gagal validasi kisi-kisi.
      const soalFinal: SoalItemGenerated[] = slots.map((slot, i) => ({
        pertanyaan: parsed[i].pertanyaan,
        pilihan: parsed[i].pilihan,
        jawaban_benar: parsed[i].jawaban_benar,
        elemen: slot.elemen,
        subElemen: slot.subElemen,
        fase: slot.fase,
        kelas: slot.kelas,
        taxonomiBloom: slot.bloomTarget,
      }));

      console.log('[DEBUG-GENERATE-POSISI] Berhasil, jumlah soal:', soalFinal.length);
      return soalFinal;

    } catch (err: any) {
      console.error(`[DEBUG-GENERATE-POSISI] Attempt ${attempt} gagal:`, err.message);
      lastError = err;
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }

  throw new Error(`AI gagal membuat soal berbasis posisi. Error terakhir: ${lastError?.message}`);
}
// agent/generateSoal.ts

import { askLLM } from "./llm";
import { buatRingkasanKisiKisi, buatRingkasanSubElemen, validasiElemenFase, validasiSubElemen, getFaseDariKelas } from "../config/kisiTKA";

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

// ➕ Fungsi helper untuk parsing JSON yang robust
function parseJSONSoal(hasilMentah: string): any[] {
  console.log('[DEBUG-PARSE] Input mentah (first 200 chars):', hasilMentah.substring(0, 200));
  
  // Step 1: Coba ekstrak JSON dari berbagai kemungkinan format
  let jsonString = hasilMentah;
  
  // Hapus markdown code block dengan regex yang lebih komprehensif
  jsonString = jsonString.replace(/```(?:json)?\s*/gi, "");
  jsonString = jsonString.replace(/```\s*$/gi, "");
  jsonString = jsonString.replace(/```/g, "");
  
  // Step 2: Cari array JSON — ambil dari [ pertama sampai ] terakhir
  const startIdx = jsonString.indexOf('[');
  const endIdx = jsonString.lastIndexOf(']');
  
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    console.error('[DEBUG-PARSE] Tidak menemukan tanda [ atau ]');
    throw new Error('Tidak menemukan array JSON dalam respons');
  }
  
  jsonString = jsonString.substring(startIdx, endIdx + 1);
  console.log('[DEBUG-PARSE] Setelah ekstrak array (first 200):', jsonString.substring(0, 200));
  
  // Step 3: Fix common JSON issues sebelum parse
  jsonString = jsonString
    // Hapus trailing comma sebelum ] atau }
    .replace(/,\s*([}\]])/g, '$1')
    // Ganti single quote dengan double quote (hati-hati dengan apostrophe dalam teks)
    .replace(/([{,]\s*)'([^']*)':/g, '$1"$2":')
    .replace(/:\s*'([^']*)'/g, ':"$1"')
    // Escape newlines dalam string
    .replace(/\\n/g, '\\\\n')
    // Hapus BOM dan karakter kontrol
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
  
  console.log('[DEBUG-PARSE] Setelah sanitasi (first 200):', jsonString.substring(0, 200));
  
  // Step 4: Parse
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

export async function generateSoalAdaptif(
  mataPelajaran: string,
  jumlahSoal: number,
  statistikElemenTerakhir: Record<string, { benar: number; total: number }>,
  kelasTarget?: number,
  modeFilter?: 'hanya' | 'sampai',
  selectedModel?: string
): Promise<SoalItemGenerated[]> {
  console.log('[DEBUG-GENERATE] generateSoalAdaptif dipanggil:', {
    mataPelajaran,
    jumlahSoal,
    statistikElemenTerakhir,
    kelasTarget,
    modeFilter,
    selectedModel,
  });

  const entri = Object.entries(statistikElemenTerakhir);

  const ringkasanPerforma =
    entri.length > 0
      ? entri
          .map(([elemen, s]) => {
            const akurasi = s.total > 0 ? Math.round((s.benar / s.total) * 100) : 0;
            let arahan: string;
            if (akurasi >= 80) arahan = "NAIKKAN tingkat kesulitan";
            else if (akurasi < 50) arahan = "TURUNKAN atau PERTAHANKAN tingkat mudah";
            else arahan = "PERTAHANKAN tingkat menengah";
            return `- ${elemen}: ${akurasi}% (${s.benar}/${s.total}) -> ${arahan}`;
          })
          .join("\n")
      : "Tidak ada data performa, buat soal menengah merata.";

  const arahanKelas =
    kelasTarget != null
      ? modeFilter === 'hanya'
        ? `HANYA kelas ${kelasTarget}.`
        : `Kelas 1-${kelasTarget} saja.`
      : 'Kelas 1-12.';

  // ➕ Prompt yang lebih tegas dan spesifik
  const prompt = `
Kamu adalah pembuat soal ${mataPelajaran} untuk siswa TKA Kemendikdasmen.

ATURAN WAJIB elemen per jenjang:
${buatRingkasanKisiKisi()}

DAFTAR SUB-ELEMEN valid:
${buatRingkasanSubElemen()}

BATASAN KELAS: ${arahanKelas}

PERFORMA SISWA:
${ringkasanPerforma}

INSTRUKSI SANGAT PENTING:
1. Buat ${jumlahSoal} soal pilihan ganda BARU
2. Tingkat kesulitan sesuai performa per elemen di atas
3. Elemen & sub-elemen WAJIB sesuai daftar valid
4. Kelas WAJIB sesuai batasan

OUTPUT WAJIB — IKUTI ATURAN INI DENGAN SANGAT TEGAS:
- Output HANYA berupa JSON array, TIDAK ADA teks lain
- TIDAK ADA penjelasan, intro, atau outro
- TIDAK ADA markdown code block (jangan pakai \`\`\`)
- Langsung mulai dengan [ dan diakhiri dengan ]

Format persis:
[
  {
    "pertanyaan": "teks pertanyaan",
    "pilihan": ["A. pilihan 1", "B. pilihan 2", "C. pilihan 3", "D. pilihan 4"],
    "jawaban_benar": "A. pilihan 1",
    "elemen": "nama elemen valid",
    "subElemen": "nama sub-elemen valid",
    "fase": "A/B/C/D/E/F",
    "kelas": 1,
    "taxonomiBloom": "C1/C2/C3/C4/C5/C6"
  }
]

"jawaban_benar" HARUS persis sama dengan salah satu item di "pilihan".
Lebih banyak soal di elemen dengan akurasi < 50%.
`;

  // ➕ Retry mechanism (3 kali)
  const maxRetries = 3;
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[DEBUG-GENERATE] Attempt ${attempt}/${maxRetries}`);
    
    try {
      const hasilMentah = await askLLM(prompt, selectedModel);
      console.log('[DEBUG-GENERATE] Respons mentah (first 300):', hasilMentah.substring(0, 300));
      
      // Gunakan parser yang robust
      const parsed = parseJSONSoal(hasilMentah);
      
      if (!Array.isArray(parsed)) {
        throw new Error('Hasil bukan array');
      }
      if (parsed.length === 0) {
        throw new Error('Array kosong');
      }
      
      // Validasi struktur setiap soal
      for (let i = 0; i < parsed.length; i++) {
        const s = parsed[i];
        if (!s.pertanyaan || !Array.isArray(s.pilihan) || !s.jawaban_benar) {
          throw new Error(`Soal ke-${i + 1} tidak memiliki field wajib`);
        }
        // Pastikan jawaban_benar ada di pilihan
        if (!s.pilihan.includes(s.jawaban_benar)) {
          console.warn(`[DEBUG-GENERATE] Soal ${i + 1}: jawaban_benar tidak cocok dengan pilihan, memperbaiki...`);
          // Coba cocokkan berdasarkan prefix (A., B., dll)
          const prefix = s.jawaban_benar.match(/^[A-D]\./)?.[0];
          if (prefix) {
            const cocok = s.pilihan.find((p: string) => p.startsWith(prefix));
            if (cocok) s.jawaban_benar = cocok;
          }
        }
      }
      
      console.log('[DEBUG-GENERATE] Parse berhasil, jumlah soal:', parsed.length);
      
      // Filter dan validasi
      const soalValid = parsed
        .filter((s: any) => Number.isFinite(Number(s.kelas)) && Number(s.kelas) >= 1 && Number(s.kelas) <= 12)
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

      console.log('[DEBUG-GENERATE] Soal valid setelah filter:', soalValid.length);

      if (soalValid.length === 0) {
        throw new Error("Semua soal melanggar aturan kisi-kisi.");
      }

      return soalValid;
      
    } catch (err: any) {
      console.error(`[DEBUG-GENERATE] Attempt ${attempt} gagal:`, err.message);
      lastError = err;
      
      if (attempt < maxRetries) {
        console.log(`[DEBUG-GENERATE] Menunggu ${attempt * 2} detik sebelum retry...`);
        await new Promise(r => setTimeout(r, attempt * 2000));
      }
    }
  }
  
  // Semua retry gagal
  console.error('[DEBUG-GENERATE] Semua attempt gagal');
  throw new Error(`AI mengembalikan format soal yang tidak valid (bukan JSON). Error terakhir: ${lastError?.message}`);
}

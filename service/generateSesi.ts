// service/generateSesi.ts
import { generateSoalAdaptif, SoalItemGenerated } from '../agent/generateSoal';

/**
 * Menghasilkan satu sesi belajar dengan komposisi:
 * - 3 soal SD (kelas 1-6) dengan tingkat Bloom meningkat tiap 2 sesi
 * - 7 soal SMA (kelas 10-12) dengan tingkat Bloom meningkat tiap sesi
 */
export async function generateSesi(
  sesiKe: number,
  mataPelajaran: string,
  statistikElemenTerakhir: Record<string, { benar: number; total: number }>,
  selectedModel?: string
): Promise<SoalItemGenerated[]> {
  // Bloom untuk SD: naik setiap 2 sesi (C1, C1, C2, C2, ..., C6)
  const bloomLevelSD = Math.min(Math.ceil(sesiKe / 2), 6);
  const bloomTargetSD = `C${bloomLevelSD}`;

  // Bloom untuk SMA: naik setiap sesi (C1, C2, C3, ..., C6)
  const bloomLevelSMA = Math.min(sesiKe, 6);
  const bloomTargetSMA = `C${bloomLevelSMA}`;

  // Generate 3 soal SD (kelas 1-6)
  const soalSD = await generateSoalAdaptif(
    mataPelajaran,
    3,
    statistikElemenTerakhir,
    6,          // mencakup SD
    'sampai',
    selectedModel,
    bloomTargetSD
  );

  // Generate 7 soal SMA (kelas 10-12)
  const soalSMA = await generateSoalAdaptif(
    mataPelajaran,
    7,
    statistikElemenTerakhir,
    12,         // mencakup SMA
    'sampai',
    selectedModel,
    bloomTargetSMA
  );

  // Gabungkan: 3 SD dulu, lalu 7 SMA
  return [...soalSD, ...soalSMA];
}

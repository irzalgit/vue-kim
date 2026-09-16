export type TipeSoal = 'single' | 'multi';

export interface SoalJawaban {
  pilihan: string[];
  jawaban_benar: string | string[];
  tipeSoal?: TipeSoal;
}

/**
 * Mengambil jawaban benar untuk soal single.
 */
export function jawabanSingleBenar(
  soal: SoalJawaban
): string {
  if (Array.isArray(soal.jawaban_benar)) {
    throw new Error(
      'Soal single tidak boleh memiliki jawaban_benar berupa array.'
    );
  }

  if (!soal.jawaban_benar) {
    throw new Error(
      'Soal tidak memiliki jawaban_benar.'
    );
  }

  return soal.jawaban_benar;
}

/**
 * Mengambil jawaban benar untuk soal multi.
 */
export function jawabanMultiBenar(
  soal: SoalJawaban
): string[] {
  if (!Array.isArray(soal.jawaban_benar)) {
    throw new Error(
      'Soal multi harus memiliki jawaban_benar berupa array.'
    );
  }

  if (soal.jawaban_benar.length === 0) {
    throw new Error(
      'Soal multi tidak memiliki jawaban_benar.'
    );
  }

  return [...soal.jawaban_benar];
}

/**
 * Membandingkan jawaban single.
 */
export function apakahJawabanSingleBenar(
  jawabanSiswa: string | undefined | null,
  jawabanBenar: string
): boolean {
  if (!jawabanSiswa) {
    return false;
  }

  return jawabanSiswa === jawabanBenar;
}

/**
 * Membandingkan jawaban multi.
 *
 * Urutan pilihan tidak diperhitungkan.
 * Semua jawaban harus tepat dan tidak boleh ada
 * jawaban tambahan.
 */
export function apakahJawabanMultiBenar(
  jawabanSiswa: string[] | undefined | null,
  jawabanBenar: string[]
): boolean {
  if (!Array.isArray(jawabanSiswa)) {
    return false;
  }

  if (jawabanSiswa.length !== jawabanBenar.length) {
    return false;
  }

  const siswa = new Set(jawabanSiswa);
  const benar = new Set(jawabanBenar);

  if (siswa.size !== benar.size) {
    return false;
  }

  return [...benar].every((jawaban) =>
    siswa.has(jawaban)
  );
}

/**
 * Fungsi utama pemeriksaan jawaban.
 */
export function apakahJawabanBenar(
  soal: SoalJawaban,
  jawabanSiswa: string | string[] | undefined | null
): boolean {
  const tipeSoal: TipeSoal =
    soal.tipeSoal ||
    (Array.isArray(soal.jawaban_benar) ? 'multi' : 'single');

  if (tipeSoal === 'multi') {
    return apakahJawabanMultiBenar(
      Array.isArray(jawabanSiswa)
        ? jawabanSiswa
        : undefined,
      jawabanMultiBenar(soal)
    );
  }

  return apakahJawabanSingleBenar(
    typeof jawabanSiswa === 'string'
      ? jawabanSiswa
      : undefined,
    jawabanSingleBenar(soal)
  );
}

/**
 * Normalisasi jawaban siswa.
 */
export function normalisasiJawaban(
  jawaban: unknown
): string | string[] | undefined {
  if (
    jawaban === undefined ||
    jawaban === null ||
    jawaban === ''
  ) {
    return undefined;
  }

  if (Array.isArray(jawaban)) {
    return jawaban
      .map(String)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  if (typeof jawaban === 'string') {
    const value = jawaban.trim();

    if (!value) {
      return undefined;
    }

    return value;
  }

  return String(jawaban).trim() || undefined;
}

/**
 * Normalisasi array jawaban.
 */
export function normalisasiArrayJawaban(
  jawaban: unknown
): string[] {
  const hasil = normalisasiJawaban(jawaban);

  if (!hasil) {
    return [];
  }

  return Array.isArray(hasil)
    ? hasil
    : [hasil];
}

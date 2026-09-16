import {
  validasiElemenFase,
  validasiSubElemen,
  validasiSubSubElemen,
  getFaseDariKelas,
} from '../../config/kisiTKA';

import type {
  TipeSoal,
  SoalJawaban,
} from './answer';

export interface SoalValidasi extends SoalJawaban {
  pertanyaan?: string;
  level?: number;
  kelas?: number;
  fase?: string;
  elemen?: string;
  subElemen?: string;
  taxonomiBloom?: string;
  subSubElemen?: string;
}

export interface HasilValidasi {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * =========================================================
 * API LAMA - KOMPATIBILITAS GENERATOR
 * =========================================================
 */

/**
 * Memeriksa struktur dasar soal.
 */
export function validasiStrukturSoal(
  s: any
): boolean {
  return !!(
    s &&
    s.pertanyaan &&
    Array.isArray(s.pilihan) &&
    s.jawaban_benar
  );
}

/**
 * Normalisasi soal.
 *
 * Perilaku lama dipertahankan:
 * - membuat id jika belum ada
 * - mengubah kelas menjadi number
 * - menentukan fase dari kelas
 * - menetapkan level
 */
export function normalisasiSoal(
  s: any,
  level: number | undefined
): any {
  const kelasNum = Number(s.kelas);

  const kelasValid =
    Number.isFinite(kelasNum)
      ? kelasNum
      : 1;

  return {
    ...s,

    id:
      s.id ||
      `soal-${Date.now()}-${Math.random()
        .toString(36)
        .substr(2, 6)}`,

    kelas: kelasValid,

    fase:
      getFaseDariKelas(kelasValid),

    level:
      level || 1,
  };
}

/**
 * Validasi elemen terhadap fase.
 *
 * Perilaku lama dipertahankan:
 * jika elemen dikenal di kisi TKA -> valid.
 *
 * Untuk elemen non-matematika seperti Fisika,
 * Kimia, Biologi, tetap diizinkan selama elemen tersedia.
 */
export function validasiKisiKisi(
  s: any
): boolean {
  if (
    validasiElemenFase(
      s.elemen,
      s.fase
    )
  ) {
    return true;
  }

  return !!s.elemen;
}

/**
 * Validasi sub-elemen.
 *
 * PENTING:
 * Fungsi ini mengembalikan OBJEK SOAL,
 * bukan boolean.
 *
 * Ini diperlukan karena generateSoal.ts
 * menggunakan:
 *
 * .map((s) => validasiSubElemenKisi(s))
 */
export function validasiSubElemenKisi(
  s: any
): any {
  if (
    !validasiSubElemen(
      s.subElemen,
      s.elemen,
      s.fase
    )
  ) {
    return {
      ...s,
      subElemen: '',
    };
  }

  return s;
}

/**
 * validasiSubSubElemen berasal dari kisiTKA.
 *
 * Diekspor kembali di sini untuk mempertahankan
 * API lama generateSoal.ts.
 */
export {
  validasiSubSubElemen,
};

/**
 * =========================================================
 * VALIDASI SOAL BARU / KETAT
 * =========================================================
 */

/**
 * Memvalidasi satu soal sebelum masuk ke bank soal.
 *
 * Prinsip:
 * - jawaban_benar wajib ada
 * - jawaban_benar harus ada di pilihan
 * - tidak boleh fallback ke pilihan pertama
 * - jawaban multi tidak boleh duplikat
 */
export function validasiSoal(
  soal: SoalValidasi
): HasilValidasi {
  const errors: string[] = [];
  const warnings: string[] = [];

  const namaSoal =
    soal.pertanyaan?.trim() ||
    '(tanpa pertanyaan)';

  /**
   * Validasi pilihan.
   */
  if (!Array.isArray(soal.pilihan)) {
    errors.push(
      `Pilihan tidak valid pada soal: ${namaSoal}`
    );

    return {
      valid: false,
      errors,
      warnings,
    };
  }

  if (soal.pilihan.length === 0) {
    errors.push(
      `Soal tidak memiliki pilihan: ${namaSoal}`
    );
  }

  /**
   * Normalisasi pilihan hanya untuk validasi.
   */
  const pilihan = soal.pilihan
    .map((item) =>
      String(item).trim()
    )
    .filter(Boolean);

  /**
   * Jawaban wajib ada.
   */
  if (
    soal.jawaban_benar === undefined ||
    soal.jawaban_benar === null ||
    soal.jawaban_benar === ''
  ) {
    errors.push(
      `Kunci jawaban kosong pada soal: ${namaSoal}`
    );

    return {
      valid: false,
      errors,
      warnings,
    };
  }

  /**
   * Tentukan tipe soal.
   */
  const tipeSoal: TipeSoal =
    soal.tipeSoal ||
    (
      Array.isArray(
        soal.jawaban_benar
      )
        ? 'multi'
        : 'single'
    );

  /**
   * =======================================================
   * SINGLE
   * =======================================================
   */
  if (tipeSoal === 'single') {
    if (
      Array.isArray(
        soal.jawaban_benar
      )
    ) {
      errors.push(
        `Soal single memiliki kunci berupa array: ${namaSoal}`
      );
    } else {
      const jawaban =
        String(
          soal.jawaban_benar
        ).trim();

      if (
        !pilihan.includes(jawaban)
      ) {
        errors.push(
          `Kunci "${jawaban}" tidak terdapat dalam pilihan pada soal: ${namaSoal}`
        );
      }
    }
  }

  /**
   * =======================================================
   * MULTI
   * =======================================================
   */
  if (tipeSoal === 'multi') {
    if (
      !Array.isArray(
        soal.jawaban_benar
      )
    ) {
      errors.push(
        `Soal multi harus memiliki kunci berupa array: ${namaSoal}`
      );
    } else {
      const jawaban =
        soal.jawaban_benar
          .map((item) =>
            String(item).trim()
          )
          .filter(Boolean);

      if (
        jawaban.length === 0
      ) {
        errors.push(
          `Kunci jawaban multi kosong pada soal: ${namaSoal}`
        );
      }

      /**
       * Tidak boleh duplikat.
       */
      const unik =
        new Set(jawaban);

      if (
        unik.size !==
        jawaban.length
      ) {
        errors.push(
          `Kunci jawaban multi memiliki duplikat pada soal: ${namaSoal}`
        );
      }

      /**
       * Semua jawaban harus terdapat
       * dalam pilihan.
       */
      for (
        const item of jawaban
      ) {
        if (
          !pilihan.includes(item)
        ) {
          errors.push(
            `Kunci "${item}" tidak terdapat dalam pilihan pada soal: ${namaSoal}`
          );
        }
      }
    }
  }

  /**
   * Peringatan jumlah pilihan.
   */
  if (
    pilihan.length < 2
  ) {
    warnings.push(
      `Jumlah pilihan kurang dari 2 pada soal: ${namaSoal}`
    );
  }

  return {
    valid:
      errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Validasi keras.
 *
 * Tidak ada fallback ke pilihan pertama.
 */
export function pastikanSoalValid(
  soal: SoalValidasi
): void {
  const hasil =
    validasiSoal(soal);

  if (!hasil.valid) {
    throw new Error(
      hasil.errors.join('\n')
    );
  }
}
import {
  type SoalJawaban,
  apakahJawabanBenar,
  normalisasiJawaban,
} from './answer';

/**
 * Setiap soal bernilai 2 poin.
 *
 * 25 soal = 50 poin maksimum.
 * Nilai akhir dikonversi ke skala 100.
 */
export const POIN_PER_SOAL = 2;

export interface SoalUntukScoring
  extends SoalJawaban {
  pertanyaan?: string;
}

export interface HasilScoring {
  totalSoal: number;
  benar: number;
  salah: number;
  kosong: number;
  poin: number;
  maxPoin: number;
  persentase: number;
  detail: Array<{
    index: number;
    pertanyaan?: string;
    jawabanSiswa?: string | string[];
    jawabanBenar: string | string[];
    benar: boolean;
    poin: number;
  }>;
}

/**
 * Menghitung hasil ujian.
 */
export function hitungScoring(
  soalList: SoalUntukScoring[],
  jawabanSiswaList: unknown[]
): HasilScoring {
  const totalSoal = soalList.length;

  let benar = 0;
  let salah = 0;
  let kosong = 0;
  let poin = 0;

  const detail: HasilScoring['detail'] = [];

  soalList.forEach((soal, index) => {
    const jawabanSiswa =
      normalisasiJawaban(
        jawabanSiswaList[index]
      );

    const tidakMenjawab =
      jawabanSiswa === undefined ||
      (Array.isArray(jawabanSiswa) &&
        jawabanSiswa.length === 0);

    if (tidakMenjawab) {
      kosong++;
    }

    const isBenar =
      !tidakMenjawab &&
      apakahJawabanBenar(
        soal,
        jawabanSiswa
      );

    if (isBenar) {
      benar++;
      poin += POIN_PER_SOAL;
    } else if (!tidakMenjawab) {
      salah++;
    }

    detail.push({
      index,
      pertanyaan: soal.pertanyaan,
      jawabanSiswa,
      jawabanBenar: soal.jawaban_benar,
      benar: isBenar,
      poin: isBenar ? POIN_PER_SOAL : 0,
    });
  });

  const maxPoin =
    totalSoal * POIN_PER_SOAL;

  const persentase =
    maxPoin > 0
      ? Math.round(
          (poin / maxPoin) * 100
        )
      : 0;

  return {
    totalSoal,
    benar,
    salah,
    kosong,
    poin,
    maxPoin,
    persentase,
    detail,
  };
}

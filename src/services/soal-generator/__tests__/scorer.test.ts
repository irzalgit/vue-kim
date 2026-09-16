import { describe, it, expect } from 'vitest';
import {
  hitungScoring,
  POIN_PER_SOAL,
} from '../scorer';

describe('scorer', () => {
  const soalSingle = {
    pertanyaan: '2 + 2 = ?',
    pilihan: ['3', '4', '5', '6'],
    jawaban_benar: '4',
    tipeSoal: 'single' as const,
  };

  const soalMulti = {
    pertanyaan: 'Pilih bilangan genap',
    pilihan: ['1', '2', '3', '4'],
    jawaban_benar: ['2', '4'],
    tipeSoal: 'multi' as const,
  };

  it('1 soal single benar = 2 poin', () => {
    const hasil = hitungScoring(
      [soalSingle],
      ['4'],
    );

    expect(hasil.benar).toBe(1);
    expect(hasil.salah).toBe(0);
    expect(hasil.kosong).toBe(0);
    expect(hasil.poin).toBe(2);
    expect(hasil.maxPoin).toBe(2);
    expect(hasil.persentase).toBe(100);
  });

  it('1 soal single salah = 0 poin', () => {
    const hasil = hitungScoring(
      [soalSingle],
      ['5'],
    );

    expect(hasil.benar).toBe(0);
    expect(hasil.salah).toBe(1);
    expect(hasil.poin).toBe(0);
    expect(hasil.persentase).toBe(0);
  });

  it('multi semua jawaban benar = 2 poin', () => {
    const hasil = hitungScoring(
      [soalMulti],
      [['2', '4']],
    );

    expect(hasil.benar).toBe(1);
    expect(hasil.poin).toBe(POIN_PER_SOAL);
    expect(hasil.persentase).toBe(100);
  });

  it('multi urutan berbeda tetap benar', () => {
    const hasil = hitungScoring(
      [soalMulti],
      [['4', '2']],
    );

    expect(hasil.benar).toBe(1);
    expect(hasil.poin).toBe(2);
  });

  it('multi hanya sebagian benar = 0 poin', () => {
    const hasil = hitungScoring(
      [soalMulti],
      [['2']],
    );

    expect(hasil.benar).toBe(0);
    expect(hasil.salah).toBe(1);
    expect(hasil.poin).toBe(0);
  });

  it('multi dengan jawaban tambahan = salah', () => {
    const hasil = hitungScoring(
      [soalMulti],
      [['1', '2', '4']],
    );

    expect(hasil.benar).toBe(0);
    expect(hasil.salah).toBe(1);
    expect(hasil.poin).toBe(0);
  });

  it('jawaban kosong = tidak dijawab dan 0 poin', () => {
    const hasil = hitungScoring(
      [soalSingle],
      [''],
    );

    expect(hasil.benar).toBe(0);
    expect(hasil.salah).toBe(0);
    expect(hasil.kosong).toBe(1);
    expect(hasil.poin).toBe(0);
  });

  it('25 soal benar = 50 poin dan nilai 100', () => {
    const soal = Array.from(
      { length: 25 },
      (_, i) => ({
        pertanyaan: `Soal ${i + 1}`,
        pilihan: ['A', 'B', 'C', 'D'],
        jawaban_benar: 'B',
        tipeSoal: 'single' as const,
      }),
    );

    const jawaban = Array(25).fill('B');

    const hasil = hitungScoring(soal, jawaban);

    expect(hasil.totalSoal).toBe(25);
    expect(hasil.benar).toBe(25);
    expect(hasil.poin).toBe(50);
    expect(hasil.maxPoin).toBe(50);
    expect(hasil.persentase).toBe(100);
  });
});

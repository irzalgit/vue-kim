import { describe, it, expect } from 'vitest';
import { parseJSONSoal, perbaikiJawabanBenar } from '../parser';

describe('parser', () => {
  it('parseJSONSoal harus mengembalikan array soal', () => {
    const raw = '{"soal": [{"pertanyaan": "Apa itu?", "pilihan": ["A. a", "B. b"], "jawaban_benar": "A. a"}]}';
    const result = parseJSONSoal(raw);
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty('pertanyaan');
  });

  it('perbaikiJawabanBenar harus mengoreksi jawaban yang tidak cocok', () => {
    const soal = { 
      pertanyaan: 'x', 
      pilihan: ['A. a', 'B. b', 'C. c'], 
      jawaban_benar: '1' // tidak cocok
    };
    perbaikiJawabanBenar(soal, 0); // fungsi memodifikasi langsung
    // Setelah dipanggil, soal.jawaban_benar seharusnya diperbaiki
    expect(soal.jawaban_benar).toBe('A. a');
  });
});

import { describe, it, expect } from 'vitest';
import { parseJSONSoal, perbaikiJawabanBenar, bersihkanPrefixPilihan } from '../parser';

describe('parser', () => {
  it('bersihkanPrefixPilihan harus menghapus awalan abjad', () => {
    expect(bersihkanPrefixPilihan('A. Pilihan satu')).toBe('Pilihan satu');
    expect(bersihkanPrefixPilihan('B) Pilihan dua')).toBe('Pilihan dua');
    expect(bersihkanPrefixPilihan('(C) Pilihan tiga')).toBe('Pilihan tiga');
    expect(bersihkanPrefixPilihan('[D] Pilihan empat')).toBe('Pilihan empat');
    expect(bersihkanPrefixPilihan('E: Pilihan lima')).toBe('Pilihan lima');
    expect(bersihkanPrefixPilihan('A - Pilihan enam')).toBe('Pilihan enam');
    expect(bersihkanPrefixPilihan('Pilihan bersih')).toBe('Pilihan bersih');
  });

  it('parseJSONSoal harus mengembalikan array soal', () => {
    const raw = '{"soal": [{"pertanyaan": "Apa itu?", "pilihan": ["A. a", "B. b"], "jawaban_benar": "A. a"}]}';
    const result = parseJSONSoal(raw);
    expect(Array.isArray(result)).toBe(true);
    expect(result[0]).toHaveProperty('pertanyaan');
  });

  it('perbaikiJawabanBenar harus membersihkan prefix pilihan dan menormalisasi jawaban_benar', () => {
    const soal = { 
      pertanyaan: 'x', 
      pilihan: ['A. a', 'B. b', 'C. c'], 
      jawaban_benar: '1' // tidak cocok
    };
    perbaikiJawabanBenar(soal, 0); // fungsi memodifikasi langsung
    expect(soal.pilihan).toEqual(['a', 'b', 'c']);
    expect(soal.jawaban_benar).toBe('a');
  });

  it('perbaikiJawabanBenar harus menangani jawaban_benar dengan prefix huruf', () => {
    const soal = { 
      pertanyaan: 'x', 
      pilihan: ['A. opsi 1', 'B. opsi 2', 'C. opsi 3'], 
      jawaban_benar: 'B. opsi 2'
    };
    perbaikiJawabanBenar(soal, 0);
    expect(soal.pilihan).toEqual(['opsi 1', 'opsi 2', 'opsi 3']);
    expect(soal.jawaban_benar).toBe('opsi 2');
  });
});

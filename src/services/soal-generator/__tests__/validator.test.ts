import { describe, it, expect } from 'vitest';
import { 
  validasiStrukturSoal, 
  normalisasiSoal, 
  validasiKisiKisi, 
  validasiSubElemenKisi 
} from '../validator';

describe('validator - struktur soal', () => {
  it('validasiStrukturSoal harus true untuk objek yang valid', () => {
    const soalValid = { 
      pertanyaan: 'Apa?', 
      pilihan: ['A', 'B'], 
      jawaban_benar: 'A' 
    };
    expect(validasiStrukturSoal(soalValid)).toBe(true);
  });

  it('validasiStrukturSoal harus false untuk objek tanpa pilihan', () => {
    const soalInvalid = { pertanyaan: 'Apa?', jawaban_benar: 'A' };
    expect(validasiStrukturSoal(soalInvalid)).toBe(false);
  });
});

describe('validator - normalisasi', () => {
  it('normalisasiSoal harus menambahkan level jika diberikan', () => {
    const soal = { pertanyaan: 'x', pilihan: ['A', 'B'], jawaban_benar: 'A' };
    const result = normalisasiSoal(soal, 3);
    expect(result).toHaveProperty('level', 3);
  });
});

describe('validator - kisi-kisi', () => {
  it('validasiKisiKisi harus mengembalikan boolean', () => {
    // Sesuaikan dengan struktur kisi-kisi yang diharapkan
    const kisi = {}; // isi dengan data valid jika perlu
    expect(typeof validasiKisiKisi(kisi)).toBe('boolean');
  });

  it('validasiSubElemenKisi harus mengembalikan sesuatu', () => {
    const sub = {}; // sesuaikan
    const result = validasiSubElemenKisi(sub);
    // Anda bisa mengecek tipe result sesuai yang diharapkan
    expect(result).toBeDefined();
  });
});

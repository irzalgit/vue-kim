// src/services/soal-generator/validator.ts
import {
  validasiElemenFase,
  validasiSubElemen,
  validasiSubSubElemen,
  getFaseDariKelas,
} from "../../config/kisiTKA";

export function validasiStrukturSoal(s: any): boolean {
  return !!(s.pertanyaan && Array.isArray(s.pilihan) && s.jawaban_benar);
}

export function normalisasiSoal(s: any, level: number | undefined): any {
  const kelasNum = Number(s.kelas);
  return {
    ...s,
    id: s.id || `soal-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
    kelas: Number.isFinite(kelasNum) ? kelasNum : 1,
    fase: getFaseDariKelas(Number.isFinite(kelasNum) ? kelasNum : 1),
    level: level || 1,
  };
}

export function validasiKisiKisi(s: any): boolean {
  // Jika ada di kisi-kisi Matematika, validasi sesuai fase
  if (validasiElemenFase(s.elemen, s.fase)) return true;
  // Jika elemen tidak ditemukan (misal Fisika, Kimia, Biologi), tetap izinkan asalkan data pertanyaan valid
  return !!s.elemen;
}

export function validasiSubElemenKisi(s: any): any {
  if (!validasiSubElemen(s.subElemen, s.elemen, s.fase)) {
    return { ...s, subElemen: '' };
  }
  return s;
}

export { validasiSubSubElemen };

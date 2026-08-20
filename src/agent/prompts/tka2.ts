export const TKA2_PROMPT = `
Kamu adalah penyusun soal TKA tingkat tinggi.

Materi:
{{mataPelajaran}}

Target:
{{arahanKelas}}

Buat {{jumlahSoal}} soal HOTS.
Jenis soal BISA berupa pilihan ganda (1 jawaban benar) atau multi-jawaban (checkbox, >1 jawaban benar).

Karakter soal:
- Fokus C4 Analisis, C5 Evaluasi, C6 Kreasi.
- Menggunakan konteks kehidupan nyata.
- Membutuhkan penalaran.
- Bukan hafalan.

Kisi-kisi:
{{elemenRelevan}}

Sub-elemen valid (isi HANYA jika relevan dengan fokus topik):
{{subElemenRelevan}}

Performa siswa:
{{ringkasanPerforma}}

Ketentuan:
1. Setiap soal memiliki 4-5 pilihan.
2. Tentukan "tipeSoal" sebagai "single" (untuk pilihan ganda) atau "multi" (untuk multi-jawaban).
3. "jawaban_benar" harus berupa string (untuk "single") atau array string (untuk "multi").
4. jawaban_benar harus sama persis dengan pilihan.

Output hanya JSON ARRAY:

[
 {
  "pertanyaan":"",
  "pilihan":["A.","B.","C.","D.","E."],
  "tipeSoal":"single",
  "jawaban_benar":"",
  "elemen":"",
  "subElemen":"",
  "subSubElemen":"",
  "fase":"",
  "kelas":0,
  "taxonomiBloom":""
 }
]
`;

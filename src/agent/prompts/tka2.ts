export const TKA2_PROMPT = `
Kamu adalah penyusun soal TKA tingkat tinggi.

Materi:
{{mataPelajaran}}

Target:
{{arahanKelas}}

Buat {{jumlahSoal}} soal pilihan ganda HOTS.

Karakter soal:
- Fokus C4 Analisis, C5 Evaluasi, C6 Kreasi.
- Menggunakan konteks kehidupan nyata.
- Membutuhkan penalaran.
- Bukan hafalan.

Kisi-kisi:
{{elemenRelevan}}

Performa siswa:
{{ringkasanPerforma}}

Output hanya JSON:

[
 {
  "pertanyaan":"",
  "pilihan":["A.","B.","C.","D."],
  "jawaban_benar":"",
  "elemen":"",
  "subElemen":"",
  "fase":"",
  "kelas":0,
  "taxonomiBloom":""
 }
]
`;

export const TKA_PROMPT = `
Kamu adalah pembuat soal {{mataPelajaran}} untuk siswa TKA Kemendikdasmen.

ATURAN ELEMEN YANG RELEVAN:

{{elemenRelevan}}

DAFTAR SUB-ELEMEN VALID:

{{subElemenRelevan}}

BATASAN KELAS:

{{arahanKelas}}

PERFORMA SISWA:

{{ringkasanPerforma}}

Buat TEPAT {{jumlahSoal}} soal BARU.
Jenis soal BISA berupa pilihan ganda (1 jawaban benar) atau multi-jawaban (checkbox, >1 jawaban benar).

Ketentuan:
1. Soal harus sesuai kisi-kisi.
2. Sesuaikan level Taksonomi Bloom.
3. Setiap soal memiliki 4-5 pilihan.
4. Pilihan jawaban HANYA berisi teks jawaban TANPA awalan/prefix huruf abjad A/B/C/D/E (jangan tambahkan "A. ", "B. ", dll pada isi string pilihan).
5. Tentukan "tipeSoal" sebagai "single" (untuk pilihan ganda) atau "multi" (untuk multi-jawaban).
6. "jawaban_benar" harus berupa string (untuk "single") atau array string (untuk "multi") yang sama persis dengan teks salah satu pilihan tanpa prefix abjad.
7. Jangan membuat soal ambigu.
8. Isi "subSubElemen" HANYA jika ada topik sub-sub-elemen spesifik yang difokuskan (lihat instruksi tambahan di bawah, jika ada). Kalau tidak ada fokus sub-sub-elemen, biarkan "subSubElemen":"" (kosong).

OUTPUT HANYA JSON ARRAY:

[
 {
  "pertanyaan":"",
  "pilihan":[
    "Pilihan pertama",
    "Pilihan kedua",
    "Pilihan ketiga",
    "Pilihan keempat",
    "Pilihan kelima"
  ],
  "tipeSoal":"single",
  "jawaban_benar":"Pilihan pertama",
  "elemen":"",
  "subElemen":"",
  "subSubElemen":"",
  "fase":"",
  "kelas":0,
  "taxonomiBloom":""
 }
]
`;

// config/kisiTKA.ts
// Kisi-kisi Matematika lengkap untuk semua fase (A-F)
// Berdasarkan Kurikulum Merdeka Kemendikdasmen
// Versi: 3 Tingkat Kedalaman (Elemen → Sub-Elemen → Sub-Sub-Elemen)

export type Fase = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
export type BloomLevel = 'C1' | 'C2' | 'C3' | 'C4' | 'C5' | 'C6';

// ==================== LEVEL 3: SUB-SUB-ELEMEN ====================
export interface SubSubElemen {
  nama: string;
  kelas: number[];
  bloomTarget: BloomLevel[];
  deskripsi?: string;
  contohSoal?: string;
}

// ==================== LEVEL 2: SUB-ELEMEN ====================
export interface SubElemen {
  nama: string;
  kelas: number[];
  bloomTarget: BloomLevel[];
  // 🔥 TAMBAHAN: Sub-Sub-Elemen (Level 3)
  subSubElemen?: SubSubElemen[];
}

// ==================== LEVEL 1: ELEMEN ====================
export interface Elemen {
  nama: string;
  fase: Fase[];
  subElemen: SubElemen[];
}

// ==================== FASE A (Kelas 1-2) ====================
const elemenFaseA: Elemen[] = [
  {
    nama: 'Bilangan',
    fase: ['A'],
    subElemen: [
      { 
        nama: 'Bilangan cacah sampai 999', 
        kelas: [1, 2], 
        bloomTarget: ['C1', 'C2'],
        subSubElemen: [
          { nama: 'Membaca bilangan 1-100', kelas: [1], bloomTarget: ['C1'] },
          { nama: 'Membaca bilangan 101-999', kelas: [2], bloomTarget: ['C1'] },
          { nama: 'Menulis bilangan 1-100', kelas: [1], bloomTarget: ['C1', 'C2'] },
          { nama: 'Menulis bilangan 101-999', kelas: [2], bloomTarget: ['C1', 'C2'] },
          { nama: 'Membandingkan 2 bilangan', kelas: [1, 2], bloomTarget: ['C2'] },
          { nama: 'Mengurutkan 3 bilangan', kelas: [1, 2], bloomTarget: ['C2'] },
        ]
      },
      { 
        nama: 'Sistem nilai tempat', 
        kelas: [1, 2], 
        bloomTarget: ['C1', 'C2'],
        subSubElemen: [
          { nama: 'Nilai tempat puluhan', kelas: [1], bloomTarget: ['C1'] },
          { nama: 'Nilai tempat ratusan', kelas: [2], bloomTarget: ['C1'] },
          { nama: 'Menentukan nilai angka', kelas: [1, 2], bloomTarget: ['C2'] },
        ]
      },
      { 
        nama: 'Penjumlahan bilangan cacah', 
        kelas: [1, 2], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Penjumlahan 2 angka tanpa menyimpan', kelas: [1], bloomTarget: ['C2'] },
          { nama: 'Penjumlahan 2 angka dengan menyimpan', kelas: [2], bloomTarget: ['C3'] },
          { nama: 'Penjumlahan 3 angka', kelas: [2], bloomTarget: ['C3'] },
          { nama: 'Soal cerita penjumlahan', kelas: [1, 2], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Pengurangan bilangan cacah', 
        kelas: [1, 2], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Pengurangan 2 angka tanpa meminjam', kelas: [1], bloomTarget: ['C2'] },
          { nama: 'Pengurangan 2 angka dengan meminjam', kelas: [2], bloomTarget: ['C3'] },
          { nama: 'Pengurangan 3 angka', kelas: [2], bloomTarget: ['C3'] },
          { nama: 'Soal cerita pengurangan', kelas: [1, 2], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Bilangan pecahan sederhana (½, ¼, ⅛)', 
        kelas: [2], 
        bloomTarget: ['C1', 'C2'],
        subSubElemen: [
          { nama: 'Mengenal pecahan 1/2', kelas: [2], bloomTarget: ['C1'] },
          { nama: 'Mengenal pecahan 1/4', kelas: [2], bloomTarget: ['C1'] },
          { nama: 'Mengenal pecahan 1/8', kelas: [2], bloomTarget: ['C1'] },
          { nama: 'Membandingkan pecahan sederhana', kelas: [2], bloomTarget: ['C2'] },
        ]
      },
    ]
  },
  {
    nama: 'Aljabar',
    fase: ['A'],
    subElemen: [
      { 
        nama: 'Pola gambar berulang', 
        kelas: [1, 2], 
        bloomTarget: ['C1', 'C2'],
        subSubElemen: [
          { nama: 'Mengidentifikasi pola gambar', kelas: [1], bloomTarget: ['C1'] },
          { nama: 'Melanjutkan pola gambar', kelas: [1, 2], bloomTarget: ['C2'] },
          { nama: 'Membuat pola gambar sendiri', kelas: [2], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Pola bilangan membesar & mengecil', 
        kelas: [1, 2], 
        bloomTarget: ['C1', 'C2'],
        subSubElemen: [
          { nama: 'Pola +1, +2, +3', kelas: [1], bloomTarget: ['C1'] },
          { nama: 'Pola -1, -2, -3', kelas: [2], bloomTarget: ['C1'] },
          { nama: 'Pola loncat 2, 5, 10', kelas: [2], bloomTarget: ['C2'] },
          { nama: 'Menentukan suku berikutnya', kelas: [2], bloomTarget: ['C2'] },
        ]
      },
      { 
        nama: 'Persamaan sederhana', 
        kelas: [2], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Mengenal simbol =', kelas: [2], bloomTarget: ['C1'] },
          { nama: 'Mengenal simbol + dan -', kelas: [2], bloomTarget: ['C1'] },
          { nama: 'Menyelesaikan a + b = c', kelas: [2], bloomTarget: ['C2'] },
          { nama: 'Menyelesaikan a - b = c', kelas: [2], bloomTarget: ['C2'] },
          { nama: 'Soal cerita persamaan sederhana', kelas: [2], bloomTarget: ['C3'] },
        ]
      },
    ]
  },
  {
    nama: 'Pengukuran',
    fase: ['A'],
    subElemen: [
      { 
        nama: 'Pengukuran panjang (satuan tidak baku)', 
        kelas: [1], 
        bloomTarget: ['C1', 'C2'],
        subSubElemen: [
          { nama: 'Mengukur dengan jengkal', kelas: [1], bloomTarget: ['C1'] },
          { nama: 'Mengukur dengan langkah', kelas: [1], bloomTarget: ['C1'] },
          { nama: 'Membandingkan panjang', kelas: [1], bloomTarget: ['C2'] },
        ]
      },
      { 
        nama: 'Pengukuran berat (satuan tidak baku)', 
        kelas: [1], 
        bloomTarget: ['C1', 'C2'],
        subSubElemen: [
          { nama: 'Mengukur berat dengan kelereng', kelas: [1], bloomTarget: ['C1'] },
          { nama: 'Membandingkan berat', kelas: [1], bloomTarget: ['C2'] },
        ]
      },
      { 
        nama: 'Satuan baku panjang (cm, m)', 
        kelas: [2], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Mengukur panjang dengan penggaris', kelas: [2], bloomTarget: ['C2'] },
          { nama: 'Mengubah cm ke m', kelas: [2], bloomTarget: ['C2'] },
          { nama: 'Mengubah m ke cm', kelas: [2], bloomTarget: ['C2'] },
          { nama: 'Soal cerita panjang', kelas: [2], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Satuan baku berat (gr, kg)', 
        kelas: [2], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Mengenal satuan gram', kelas: [2], bloomTarget: ['C1'] },
          { nama: 'Mengenal satuan kilogram', kelas: [2], bloomTarget: ['C1'] },
          { nama: 'Mengubah gr ke kg', kelas: [2], bloomTarget: ['C2'] },
          { nama: 'Soal cerita berat', kelas: [2], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Satuan baku waktu (detik, menit, jam)', 
        kelas: [2], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Membaca jam analog', kelas: [2], bloomTarget: ['C1'] },
          { nama: 'Membaca jam digital', kelas: [2], bloomTarget: ['C1'] },
          { nama: 'Menghitung durasi waktu', kelas: [2], bloomTarget: ['C2'] },
          { nama: 'Mengubah jam ke menit', kelas: [2], bloomTarget: ['C2'] },
          { nama: 'Soal cerita waktu', kelas: [2], bloomTarget: ['C3'] },
        ]
      },
    ]
  },
  {
    nama: 'Geometri',
    fase: ['A'],
    subElemen: [
      { 
        nama: 'Bangun datar (segiempat, segitiga, lingkaran)', 
        kelas: [1, 2], 
        bloomTarget: ['C1', 'C2'],
        subSubElemen: [
          { nama: 'Mengenal persegi', kelas: [1], bloomTarget: ['C1'] },
          { nama: 'Mengenal persegi panjang', kelas: [1], bloomTarget: ['C1'] },
          { nama: 'Mengenal segitiga', kelas: [1], bloomTarget: ['C1'] },
          { nama: 'Mengenal lingkaran', kelas: [1], bloomTarget: ['C1'] },
          { nama: 'Membedakan bangun datar', kelas: [1, 2], bloomTarget: ['C2'] },
        ]
      },
      { 
        nama: 'Bangun ruang (balok, kubus)', 
        kelas: [2], 
        bloomTarget: ['C1', 'C2'],
        subSubElemen: [
          { nama: 'Mengenal kubus', kelas: [2], bloomTarget: ['C1'] },
          { nama: 'Mengenal balok', kelas: [2], bloomTarget: ['C1'] },
          { nama: 'Membedakan kubus & balok', kelas: [2], bloomTarget: ['C2'] },
        ]
      },
      { 
        nama: 'Posisi benda (kanan, kiri, depan, belakang)', 
        kelas: [1, 2], 
        bloomTarget: ['C1', 'C2'],
        subSubElemen: [
          { nama: 'Menentukan posisi kanan/kiri', kelas: [1], bloomTarget: ['C1'] },
          { nama: 'Menentukan posisi depan/belakang', kelas: [1], bloomTarget: ['C1'] },
          { nama: 'Menentukan posisi atas/bawah', kelas: [2], bloomTarget: ['C1'] },
          { nama: 'Menentukan posisi relatif', kelas: [2], bloomTarget: ['C2'] },
        ]
      },
      { 
        nama: 'Pengubinan bangun datar', 
        kelas: [2], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Pengubinan persegi', kelas: [2], bloomTarget: ['C3'] },
          { nama: 'Pengubinan segitiga', kelas: [2], bloomTarget: ['C3'] },
          { nama: 'Membuat pola pengubinan', kelas: [2], bloomTarget: ['C4'] },
        ]
      },
    ]
  },
  {
    nama: 'Data dan Peluang',
    fase: ['A'],
    subElemen: [
      { 
        nama: 'Pengurutan & perbandingan data', 
        kelas: [2], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Mengurutkan data', kelas: [2], bloomTarget: ['C2'] },
          { nama: 'Membandingkan data', kelas: [2], bloomTarget: ['C2'] },
          { nama: 'Menentukan data terkecil/terbesar', kelas: [2], bloomTarget: ['C2'] },
          { nama: 'Soal cerita perbandingan data', kelas: [2], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Penyajian data dengan turus', 
        kelas: [2], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Membuat tabel turus', kelas: [2], bloomTarget: ['C2'] },
          { nama: 'Membaca tabel turus', kelas: [2], bloomTarget: ['C2'] },
          { nama: 'Membuat grafik batang sederhana', kelas: [2], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Penyajian data dengan gambar', 
        kelas: [2], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Membuat pictograph', kelas: [2], bloomTarget: ['C2'] },
          { nama: 'Membaca pictograph', kelas: [2], bloomTarget: ['C2'] },
          { nama: 'Menafsirkan pictograph', kelas: [2], bloomTarget: ['C3'] },
        ]
      },
    ]
  }
];

// ==================== FASE B (Kelas 3-4) ====================
const elemenFaseB: Elemen[] = [
  {
    nama: 'Bilangan',
    fase: ['B'],
    subElemen: [
      { 
        nama: 'Bilangan cacah sampai 10.000', 
        kelas: [3, 4], 
        bloomTarget: ['C1', 'C2'],
        subSubElemen: [
          { nama: 'Membaca bilangan 4 angka', kelas: [3], bloomTarget: ['C1'] },
          { nama: 'Menulis bilangan 4 angka', kelas: [3], bloomTarget: ['C1'] },
          { nama: 'Nilai tempat ribuan', kelas: [3], bloomTarget: ['C1'] },
          { nama: 'Membandingkan bilangan ribuan', kelas: [3, 4], bloomTarget: ['C2'] },
          { nama: 'Mengurutkan bilangan ribuan', kelas: [3, 4], bloomTarget: ['C2'] },
        ]
      },
      { 
        nama: 'Perkalian bilangan', 
        kelas: [3, 4], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Perkalian 1 digit', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Perkalian 2 digit dengan 1 digit', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Perkalian 2 digit dengan 2 digit', kelas: [4], bloomTarget: ['C3'] },
          { nama: 'Soal cerita perkalian', kelas: [3, 4], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Pembagian bilangan', 
        kelas: [3, 4], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Pembagian 1 digit', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Pembagian 2 digit dengan 1 digit', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Pembagian 3 digit dengan 1 digit', kelas: [4], bloomTarget: ['C3'] },
          { nama: 'Soal cerita pembagian', kelas: [3, 4], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Faktor & kelipatan', 
        kelas: [4], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Menentukan faktor', kelas: [4], bloomTarget: ['C2'] },
          { nama: 'Menentukan kelipatan', kelas: [4], bloomTarget: ['C2'] },
          { nama: 'Faktor persekutuan', kelas: [4], bloomTarget: ['C2'] },
        ]
      },
      { 
        nama: 'KPK & FPB', 
        kelas: [4], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'KPK dengan faktorisasi', kelas: [4], bloomTarget: ['C3'] },
          { nama: 'FPB dengan faktorisasi', kelas: [4], bloomTarget: ['C3'] },
          { nama: 'Soal cerita KPK', kelas: [4], bloomTarget: ['C4'] },
          { nama: 'Soal cerita FPB', kelas: [4], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Pecahan (penjumlahan & pengurangan)', 
        kelas: [3, 4], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Pecahan senilai', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Penjumlahan pecahan berpenyebut sama', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Pengurangan pecahan berpenyebut sama', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Penjumlahan pecahan berpenyebut berbeda', kelas: [4], bloomTarget: ['C3'] },
          { nama: 'Pengurangan pecahan berpenyebut berbeda', kelas: [4], bloomTarget: ['C3'] },
          { nama: 'Soal cerita pecahan', kelas: [3, 4], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Perbandingan pecahan', 
        kelas: [4], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Membandingkan pecahan berpenyebut sama', kelas: [4], bloomTarget: ['C2'] },
          { nama: 'Membandingkan pecahan berpenyebut berbeda', kelas: [4], bloomTarget: ['C3'] },
        ]
      },
    ]
  },
  {
    nama: 'Aljabar',
    fase: ['B'],
    subElemen: [
      { 
        nama: 'Pola bilangan kompleks', 
        kelas: [3, 4], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Pola perkalian', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Pola penjumlahan berulang', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Pola pembagian', kelas: [4], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Sifat komutatif', 
        kelas: [4], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Sifat komutatif penjumlahan', kelas: [4], bloomTarget: ['C2'] },
          { nama: 'Sifat komutatif perkalian', kelas: [4], bloomTarget: ['C2'] },
          { nama: 'Soal cerita sifat komutatif', kelas: [4], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Sifat asosiatif', 
        kelas: [4], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Sifat asosiatif penjumlahan', kelas: [4], bloomTarget: ['C2'] },
          { nama: 'Sifat asosiatif perkalian', kelas: [4], bloomTarget: ['C2'] },
          { nama: 'Soal cerita sifat asosiatif', kelas: [4], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Sifat distributif', 
        kelas: [4], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Sifat distributif perkalian terhadap penjumlahan', kelas: [4], bloomTarget: ['C3'] },
          { nama: 'Sifat distributif perkalian terhadap pengurangan', kelas: [4], bloomTarget: ['C3'] },
          { nama: 'Soal cerita sifat distributif', kelas: [4], bloomTarget: ['C4'] },
        ]
      },
    ]
  },
  {
    nama: 'Pengukuran',
    fase: ['B'],
    subElemen: [
      { 
        nama: 'Keliling bangun datar sederhana', 
        kelas: [3], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Keliling persegi', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Keliling persegi panjang', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Keliling segitiga', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Soal cerita keliling', kelas: [3], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Luas bangun datar sederhana', 
        kelas: [3, 4], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Luas persegi', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Luas persegi panjang', kelas: [3, 4], bloomTarget: ['C2'] },
          { nama: 'Luas segitiga', kelas: [4], bloomTarget: ['C3'] },
          { nama: 'Soal cerita luas', kelas: [3, 4], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Sudut', 
        kelas: [4], 
        bloomTarget: ['C1', 'C2'],
        subSubElemen: [
          { nama: 'Mengenal sudut', kelas: [4], bloomTarget: ['C1'] },
          { nama: 'Jenis-jenis sudut', kelas: [4], bloomTarget: ['C1'] },
          { nama: 'Mengukur sudut dengan busur', kelas: [4], bloomTarget: ['C2'] },
        ]
      },
      { 
        nama: 'Satuan panjang (km, m, cm, mm)', 
        kelas: [3, 4], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Mengubah km ke m', kelas: [3, 4], bloomTarget: ['C2'] },
          { nama: 'Mengubah m ke cm', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Mengubah cm ke mm', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Soal cerita satuan panjang', kelas: [3, 4], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Satuan berat (kg, hg, g)', 
        kelas: [3, 4], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Mengenal kg, hg, g', kelas: [3], bloomTarget: ['C1'] },
          { nama: 'Mengubah kg ke g', kelas: [3, 4], bloomTarget: ['C2'] },
          { nama: 'Soal cerita satuan berat', kelas: [3, 4], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Satuan waktu & uang', 
        kelas: [3, 4], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Membaca waktu', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Menghitung durasi', kelas: [3, 4], bloomTarget: ['C2'] },
          { nama: 'Menghitung uang', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Soal cerita waktu & uang', kelas: [3, 4], bloomTarget: ['C3'] },
        ]
      },
    ]
  },
  {
    nama: 'Geometri',
    fase: ['B'],
    subElemen: [
      { 
        nama: 'Sifat bangun datar', 
        kelas: [3, 4], 
        bloomTarget: ['C1', 'C2'],
        subSubElemen: [
          { nama: 'Sifat persegi', kelas: [3], bloomTarget: ['C1'] },
          { nama: 'Sifat persegi panjang', kelas: [3], bloomTarget: ['C1'] },
          { nama: 'Sifat segitiga', kelas: [3, 4], bloomTarget: ['C1'] },
          { nama: 'Sifat lingkaran', kelas: [4], bloomTarget: ['C1'] },
        ]
      },
      { 
        nama: 'Simetri lipat & putar', 
        kelas: [3, 4], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Simetri lipat', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Simetri putar', kelas: [4], bloomTarget: ['C2'] },
          { nama: 'Menentukan sumbu simetri', kelas: [3, 4], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Jaring-jaring bangun ruang', 
        kelas: [4], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Jaring-jaring kubus', kelas: [4], bloomTarget: ['C3'] },
          { nama: 'Jaring-jaring balok', kelas: [4], bloomTarget: ['C3'] },
          { nama: 'Jaring-jaring prisma', kelas: [4], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Koordinat sederhana', 
        kelas: [4], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Membaca koordinat', kelas: [4], bloomTarget: ['C2'] },
          { nama: 'Menentukan titik koordinat', kelas: [4], bloomTarget: ['C2'] },
          { nama: 'Menggambar titik koordinat', kelas: [4], bloomTarget: ['C3'] },
        ]
      },
    ]
  },
  {
    nama: 'Data dan Peluang',
    fase: ['B'],
    subElemen: [
      { 
        nama: 'Tabel frekuensi', 
        kelas: [3, 4], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Membuat tabel frekuensi', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Membaca tabel frekuensi', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Mengisi tabel frekuensi', kelas: [4], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Diagram batang', 
        kelas: [3, 4], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Membaca diagram batang', kelas: [3], bloomTarget: ['C2'] },
          { nama: 'Membuat diagram batang', kelas: [4], bloomTarget: ['C3'] },
          { nama: 'Menafsirkan diagram batang', kelas: [3, 4], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Mean sederhana', 
        kelas: [4], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Menghitung mean', kelas: [4], bloomTarget: ['C2'] },
          { nama: 'Soal cerita mean', kelas: [4], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Median & modus sederhana', 
        kelas: [4], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Menentukan median', kelas: [4], bloomTarget: ['C2'] },
          { nama: 'Menentukan modus', kelas: [4], bloomTarget: ['C2'] },
          { nama: 'Soal cerita median & modus', kelas: [4], bloomTarget: ['C3'] },
        ]
      },
    ]
  }
];

// ==================== FASE C (Kelas 5-6) ====================
const elemenFaseC: Elemen[] = [
  {
    nama: 'Bilangan',
    fase: ['C'],
    subElemen: [
      { 
        nama: 'Bilangan bulat (positif & negatif)', 
        kelas: [5, 6], 
        bloomTarget: ['C1', 'C2'],
        subSubElemen: [
          { nama: 'Mengenal bilangan bulat', kelas: [5], bloomTarget: ['C1'] },
          { nama: 'Membaca bilangan bulat', kelas: [5], bloomTarget: ['C1'] },
          { nama: 'Membandingkan bilangan bulat', kelas: [5, 6], bloomTarget: ['C2'] },
          { nama: 'Mengurutkan bilangan bulat', kelas: [5, 6], bloomTarget: ['C2'] },
        ]
      },
      { 
        nama: 'Operasi bilangan bulat', 
        kelas: [5, 6], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Penjumlahan bilangan bulat', kelas: [5], bloomTarget: ['C2'] },
          { nama: 'Pengurangan bilangan bulat', kelas: [5], bloomTarget: ['C2'] },
          { nama: 'Perkalian bilangan bulat', kelas: [5, 6], bloomTarget: ['C2'] },
          { nama: 'Pembagian bilangan bulat', kelas: [5, 6], bloomTarget: ['C2'] },
          { nama: 'Soal cerita operasi bilangan bulat', kelas: [5, 6], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Pecahan (perkalian & pembagian)', 
        kelas: [5, 6], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Perkalian pecahan', kelas: [5], bloomTarget: ['C2'] },
          { nama: 'Pembagian pecahan', kelas: [5, 6], bloomTarget: ['C2'] },
          { nama: 'Perkalian pecahan campuran', kelas: [6], bloomTarget: ['C3'] },
          { nama: 'Soal cerita pecahan', kelas: [5, 6], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Pecahan desimal', 
        kelas: [5, 6], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Mengenal pecahan desimal', kelas: [5], bloomTarget: ['C1'] },
          { nama: 'Penjumlahan desimal', kelas: [5], bloomTarget: ['C2'] },
          { nama: 'Pengurangan desimal', kelas: [5], bloomTarget: ['C2'] },
          { nama: 'Perkalian desimal', kelas: [6], bloomTarget: ['C3'] },
          { nama: 'Pembagian desimal', kelas: [6], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Persen', 
        kelas: [5, 6], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Mengenal persen', kelas: [5], bloomTarget: ['C1'] },
          { nama: 'Mengubah pecahan ke persen', kelas: [5], bloomTarget: ['C2'] },
          { nama: 'Mengubah desimal ke persen', kelas: [5], bloomTarget: ['C2'] },
          { nama: 'Soal cerita persen', kelas: [5, 6], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Perbandingan & skala', 
        kelas: [5, 6], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Membaca skala', kelas: [5], bloomTarget: ['C3'] },
          { nama: 'Menentukan perbandingan', kelas: [5, 6], bloomTarget: ['C3'] },
          { nama: 'Soal cerita skala', kelas: [5, 6], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Bilangan berpangkat', 
        kelas: [6], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Mengenal bilangan berpangkat', kelas: [6], bloomTarget: ['C1'] },
          { nama: 'Menghitung pangkat', kelas: [6], bloomTarget: ['C2'] },
          { nama: 'Soal cerita pangkat', kelas: [6], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Akar bilangan', 
        kelas: [6], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Mengenal akar bilangan', kelas: [6], bloomTarget: ['C1'] },
          { nama: 'Menghitung akar', kelas: [6], bloomTarget: ['C2'] },
          { nama: 'Soal cerita akar', kelas: [6], bloomTarget: ['C3'] },
        ]
      },
    ]
  },
  {
    nama: 'Aljabar',
    fase: ['C'],
    subElemen: [
      { 
        nama: 'Persamaan linear satu variabel', 
        kelas: [5, 6], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Mengenal PLSV', kelas: [5], bloomTarget: ['C1'] },
          { nama: 'Menyelesaikan PLSV', kelas: [5, 6], bloomTarget: ['C2'] },
          { nama: 'Soal cerita PLSV', kelas: [5, 6], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Himpunan', 
        kelas: [5, 6], 
        bloomTarget: ['C1', 'C2'],
        subSubElemen: [
          { nama: 'Mengenal himpunan', kelas: [5], bloomTarget: ['C1'] },
          { nama: 'Menyebutkan anggota himpunan', kelas: [5], bloomTarget: ['C1'] },
          { nama: 'Menentukan himpunan bagian', kelas: [6], bloomTarget: ['C2'] },
        ]
      },
      { 
        nama: 'Operasi himpunan', 
        kelas: [6], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Irisan himpunan', kelas: [6], bloomTarget: ['C2'] },
          { nama: 'Gabungan himpunan', kelas: [6], bloomTarget: ['C2'] },
          { nama: 'Komplemen himpunan', kelas: [6], bloomTarget: ['C3'] },
        ]
      },
    ]
  },
  {
    nama: 'Pengukuran',
    fase: ['C'],
    subElemen: [
      { 
        nama: 'Keliling segitiga & trapesium', 
        kelas: [5, 6], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Keliling segitiga', kelas: [5], bloomTarget: ['C2'] },
          { nama: 'Keliling trapesium', kelas: [6], bloomTarget: ['C2'] },
          { nama: 'Soal cerita keliling', kelas: [5, 6], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Luas segitiga, trapesium, layang-layang', 
        kelas: [5, 6], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Luas segitiga', kelas: [5], bloomTarget: ['C2'] },
          { nama: 'Luas trapesium', kelas: [6], bloomTarget: ['C2'] },
          { nama: 'Luas layang-layang', kelas: [6], bloomTarget: ['C2'] },
          { nama: 'Soal cerita luas', kelas: [5, 6], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Luas lingkaran', 
        kelas: [6], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Mengenal π (phi)', kelas: [6], bloomTarget: ['C1'] },
          { nama: 'Menghitung luas lingkaran', kelas: [6], bloomTarget: ['C2'] },
          { nama: 'Soal cerita luas lingkaran', kelas: [6], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Volume kubus & balok', 
        kelas: [5], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Volume kubus', kelas: [5], bloomTarget: ['C2'] },
          { nama: 'Volume balok', kelas: [5], bloomTarget: ['C2'] },
          { nama: 'Soal cerita volume kubus & balok', kelas: [5], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Volume tabung & kerucut', 
        kelas: [6], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Volume tabung', kelas: [6], bloomTarget: ['C3'] },
          { nama: 'Volume kerucut', kelas: [6], bloomTarget: ['C3'] },
          { nama: 'Soal cerita volume tabung & kerucut', kelas: [6], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Debit', 
        kelas: [6], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Mengenal debit', kelas: [6], bloomTarget: ['C1'] },
          { nama: 'Menghitung debit', kelas: [6], bloomTarget: ['C3'] },
          { nama: 'Soal cerita debit', kelas: [6], bloomTarget: ['C4'] },
        ]
      },
    ]
  },
  {
    nama: 'Geometri',
    fase: ['C'],
    subElemen: [
      { 
        nama: 'Sifat bangun datar kompleks', 
        kelas: [5, 6], 
        bloomTarget: ['C1', 'C2'],
        subSubElemen: [
          { nama: 'Sifat layang-layang', kelas: [5], bloomTarget: ['C1'] },
          { nama: 'Sifat trapesium', kelas: [5], bloomTarget: ['C1'] },
          { nama: 'Sifat jajar genjang', kelas: [6], bloomTarget: ['C1'] },
        ]
      },
      { 
        nama: 'Bangun ruang & sifatnya', 
        kelas: [5, 6], 
        bloomTarget: ['C1', 'C2'],
        subSubElemen: [
          { nama: 'Sifat tabung', kelas: [5], bloomTarget: ['C1'] },
          { nama: 'Sifat kerucut', kelas: [5], bloomTarget: ['C1'] },
          { nama: 'Sifat limas', kelas: [6], bloomTarget: ['C1'] },
        ]
      },
      { 
        nama: 'Pencerminan', 
        kelas: [6], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Mencerminkan titik', kelas: [6], bloomTarget: ['C2'] },
          { nama: 'Mencerminkan bangun datar', kelas: [6], bloomTarget: ['C2'] },
          { nama: 'Soal cerita pencerminan', kelas: [6], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Rotasi', 
        kelas: [6], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Memutar bangun datar', kelas: [6], bloomTarget: ['C2'] },
          { nama: 'Menentukan hasil rotasi', kelas: [6], bloomTarget: ['C2'] },
          { nama: 'Soal cerita rotasi', kelas: [6], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Translasi', 
        kelas: [6], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Menggeser bangun datar', kelas: [6], bloomTarget: ['C2'] },
          { nama: 'Menentukan hasil translasi', kelas: [6], bloomTarget: ['C2'] },
          { nama: 'Soal cerita translasi', kelas: [6], bloomTarget: ['C3'] },
        ]
      },
    ]
  },
  {
    nama: 'Data dan Peluang',
    fase: ['C'],
    subElemen: [
      { 
        nama: 'Diagram lingkaran', 
        kelas: [5, 6], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Membaca diagram lingkaran', kelas: [5], bloomTarget: ['C2'] },
          { nama: 'Membuat diagram lingkaran', kelas: [6], bloomTarget: ['C3'] },
          { nama: 'Menafsirkan diagram lingkaran', kelas: [5, 6], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Mean', 
        kelas: [5, 6], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Menghitung mean data', kelas: [5], bloomTarget: ['C2'] },
          { nama: 'Soal cerita mean', kelas: [5, 6], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Median', 
        kelas: [5, 6], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Menentukan median data', kelas: [5], bloomTarget: ['C2'] },
          { nama: 'Soal cerita median', kelas: [5, 6], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Modus', 
        kelas: [5, 6], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Menentukan modus data', kelas: [5], bloomTarget: ['C2'] },
          { nama: 'Soal cerita modus', kelas: [5, 6], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Peluang sederhana', 
        kelas: [6], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Mengenal peluang', kelas: [6], bloomTarget: ['C2'] },
          { nama: 'Menghitung peluang sederhana', kelas: [6], bloomTarget: ['C2'] },
          { nama: 'Soal cerita peluang', kelas: [6], bloomTarget: ['C3'] },
        ]
      },
    ]
  }
];

// ==================== FASE D (Kelas 7-9) ====================
const elemenFaseD: Elemen[] = [
  {
    nama: 'Bilangan',
    fase: ['D'],
    subElemen: [
      { 
        nama: 'Bilangan rasional', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C1', 'C2'],
        subSubElemen: [
          { nama: 'Mengenal bilangan rasional', kelas: [7], bloomTarget: ['C1'] },
          { nama: 'Membandingkan bilangan rasional', kelas: [7, 8], bloomTarget: ['C2'] },
          { nama: 'Operasi bilangan rasional', kelas: [7, 8, 9], bloomTarget: ['C2'] },
        ]
      },
      { 
        nama: 'Bilangan irasional', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C1', 'C2'],
        subSubElemen: [
          { nama: 'Mengenal bilangan irasional', kelas: [7], bloomTarget: ['C1'] },
          { nama: 'Membedakan rasional & irasional', kelas: [7, 8], bloomTarget: ['C2'] },
          { nama: 'Aproksimasi bilangan irasional', kelas: [8, 9], bloomTarget: ['C2'] },
        ]
      },
      { 
        nama: 'Bilangan berpangkat bulat', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Sifat-sifat pangkat', kelas: [7], bloomTarget: ['C2'] },
          { nama: 'Operasi pangkat', kelas: [7, 8], bloomTarget: ['C2'] },
          { nama: 'Soal cerita pangkat', kelas: [7, 8, 9], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Bentuk akar', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Mengenal bentuk akar', kelas: [7], bloomTarget: ['C1'] },
          { nama: 'Menyederhanakan bentuk akar', kelas: [7, 8], bloomTarget: ['C2'] },
          { nama: 'Operasi bentuk akar', kelas: [7, 8, 9], bloomTarget: ['C2'] },
          { nama: 'Merasionalkan penyebut', kelas: [8, 9], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Notasi ilmiah', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Mengenal notasi ilmiah', kelas: [7], bloomTarget: ['C1'] },
          { nama: 'Mengubah notasi ilmiah', kelas: [7, 8], bloomTarget: ['C2'] },
          { nama: 'Soal cerita notasi ilmiah', kelas: [7, 8, 9], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Faktorisasi prima', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Menentukan faktor prima', kelas: [7], bloomTarget: ['C2'] },
          { nama: 'Faktorisasi prima', kelas: [7, 8], bloomTarget: ['C2'] },
          { nama: 'Soal cerita faktorisasi', kelas: [7, 8, 9], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Rasio & skala', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Mengenal rasio', kelas: [7], bloomTarget: ['C1'] },
          { nama: 'Menentukan rasio', kelas: [7, 8], bloomTarget: ['C3'] },
          { nama: 'Soal cerita rasio & skala', kelas: [7, 8, 9], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Proporsi', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Mengenal proporsi', kelas: [7], bloomTarget: ['C1'] },
          { nama: 'Menentukan proporsi', kelas: [7, 8], bloomTarget: ['C3'] },
          { nama: 'Soal cerita proporsi', kelas: [7, 8, 9], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Laju perubahan', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Mengenal laju perubahan', kelas: [7], bloomTarget: ['C1'] },
          { nama: 'Menghitung laju perubahan', kelas: [7, 8], bloomTarget: ['C3'] },
          { nama: 'Soal cerita laju perubahan', kelas: [7, 8, 9], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Literasi finansial', 
        kelas: [8, 9], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Bunga tunggal', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Bunga majemuk', kelas: [9], bloomTarget: ['C4'] },
          { nama: 'Soal cerita literasi finansial', kelas: [8, 9], bloomTarget: ['C4'] },
        ]
      },
    ]
  },
  {
    nama: 'Aljabar',
    fase: ['D'],
    subElemen: [
      { 
        nama: 'Pola bilangan & barisan', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Pola bilangan persegi', kelas: [7], bloomTarget: ['C2'] },
          { nama: 'Pola bilangan segitiga', kelas: [7], bloomTarget: ['C2'] },
          { nama: 'Barisan aritmatika', kelas: [8], bloomTarget: ['C2'] },
          { nama: 'Barisan geometri', kelas: [9], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Persamaan linear satu variabel', 
        kelas: [7], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Bentuk PLSV', kelas: [7], bloomTarget: ['C1'] },
          { nama: 'Menyelesaikan PLSV', kelas: [7], bloomTarget: ['C2'] },
          { nama: 'Soal cerita PLSV', kelas: [7], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Pertidaksamaan linear', 
        kelas: [7], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Bentuk pertidaksamaan', kelas: [7], bloomTarget: ['C1'] },
          { nama: 'Menyelesaikan pertidaksamaan', kelas: [7], bloomTarget: ['C2'] },
          { nama: 'Soal cerita pertidaksamaan', kelas: [7], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Persamaan linear dua variabel', 
        kelas: [8], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Bentuk PLDV', kelas: [8], bloomTarget: ['C1'] },
          { nama: 'Menyelesaikan PLDV', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Soal cerita PLDV', kelas: [8], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Sistem persamaan linear dua variabel', 
        kelas: [8], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Metode substitusi', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Metode eliminasi', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Metode campuran', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Soal cerita SPLDV', kelas: [8], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Fungsi & relasi', 
        kelas: [8], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Mengenal relasi', kelas: [8], bloomTarget: ['C1'] },
          { nama: 'Mengenal fungsi', kelas: [8], bloomTarget: ['C1'] },
          { nama: 'Domain dan range', kelas: [8], bloomTarget: ['C2'] },
          { nama: 'Soal cerita fungsi', kelas: [8], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Fungsi linear & grafiknya', 
        kelas: [8], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Bentuk fungsi linear', kelas: [8], bloomTarget: ['C1'] },
          { nama: 'Menggambar grafik fungsi linear', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Menentukan persamaan garis', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Soal cerita fungsi linear', kelas: [8], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Persamaan garis lurus', 
        kelas: [8], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Bentuk umum persamaan garis', kelas: [8], bloomTarget: ['C1'] },
          { nama: 'Menentukan gradien', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Persamaan garis melalui 2 titik', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Soal cerita persamaan garis', kelas: [8], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Fungsi kuadrat', 
        kelas: [9], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Bentuk fungsi kuadrat', kelas: [9], bloomTarget: ['C1'] },
          { nama: 'Nilai fungsi kuadrat', kelas: [9], bloomTarget: ['C2'] },
          { nama: 'Titik puncak & sumbu simetri', kelas: [9], bloomTarget: ['C3'] },
          { nama: 'Menggambar grafik fungsi kuadrat', kelas: [9], bloomTarget: ['C3'] },
          { nama: 'Soal cerita fungsi kuadrat', kelas: [9], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Persamaan kuadrat', 
        kelas: [9], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Pemfaktoran', kelas: [9], bloomTarget: ['C3'] },
          { nama: 'Rumus ABC', kelas: [9], bloomTarget: ['C3'] },
          { nama: 'Melengkapkan kuadrat sempurna', kelas: [9], bloomTarget: ['C3'] },
          { nama: 'Diskriminan', kelas: [9], bloomTarget: ['C4'] },
          { nama: 'Soal cerita persamaan kuadrat', kelas: [9], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Pertidaksamaan kuadrat', 
        kelas: [9], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Bentuk pertidaksamaan kuadrat', kelas: [9], bloomTarget: ['C1'] },
          { nama: 'Menyelesaikan pertidaksamaan kuadrat', kelas: [9], bloomTarget: ['C3'] },
          { nama: 'Soal cerita pertidaksamaan kuadrat', kelas: [9], bloomTarget: ['C4'] },
        ]
      },
    ]
  },
  {
    nama: 'Geometri dan Pengukuran',
    fase: ['D'],
    subElemen: [
      { 
        nama: 'Segitiga (sifat, keliling, luas)', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Jenis-jenis segitiga', kelas: [7], bloomTarget: ['C1'] },
          { nama: 'Keliling segitiga', kelas: [7], bloomTarget: ['C2'] },
          { nama: 'Luas segitiga', kelas: [7], bloomTarget: ['C2'] },
          { nama: 'Teorema Pythagoras', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Soal cerita segitiga', kelas: [7, 8, 9], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Segiempat (sifat, keliling, luas)', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Jenis-jenis segiempat', kelas: [7], bloomTarget: ['C1'] },
          { nama: 'Keliling segiempat', kelas: [7], bloomTarget: ['C2'] },
          { nama: 'Luas segiempat', kelas: [7, 8], bloomTarget: ['C2'] },
          { nama: 'Soal cerita segiempat', kelas: [7, 8, 9], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Lingkaran (keliling, luas)', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Unsur-unsur lingkaran', kelas: [7], bloomTarget: ['C1'] },
          { nama: 'Keliling lingkaran', kelas: [7], bloomTarget: ['C2'] },
          { nama: 'Luas lingkaran', kelas: [7], bloomTarget: ['C2'] },
          { nama: 'Soal cerita lingkaran', kelas: [7, 8, 9], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Bangun ruang (prisma, limas)', 
        kelas: [8, 9], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Volume prisma', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Volume limas', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Luas permukaan prisma', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Luas permukaan limas', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Soal cerita prisma & limas', kelas: [8, 9], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Bangun ruang (tabung, kerucut, bola)', 
        kelas: [8, 9], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Volume tabung', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Volume kerucut', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Volume bola', kelas: [9], bloomTarget: ['C3'] },
          { nama: 'Luas permukaan tabung', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Luas permukaan kerucut', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Luas permukaan bola', kelas: [9], bloomTarget: ['C3'] },
          { nama: 'Soal cerita tabung, kerucut, bola', kelas: [8, 9], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Kesebangunan', 
        kelas: [9], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Syarat kesebangunan', kelas: [9], bloomTarget: ['C1'] },
          { nama: 'Menentukan sisi yang sebangun', kelas: [9], bloomTarget: ['C3'] },
          { nama: 'Soal cerita kesebangunan', kelas: [9], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Kongruensi', 
        kelas: [9], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Syarat kekongruenan', kelas: [9], bloomTarget: ['C1'] },
          { nama: 'Menentukan bangun kongruen', kelas: [9], bloomTarget: ['C3'] },
          { nama: 'Soal cerita kekongruenan', kelas: [9], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Teorema Pythagoras', 
        kelas: [8], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Teorema Pythagoras', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Menentukan sisi segitiga siku-siku', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Soal cerita Pythagoras', kelas: [8], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Trigonometri dasar (sin, cos, tan)', 
        kelas: [9], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Perbandingan trigonometri', kelas: [9], bloomTarget: ['C3'] },
          { nama: 'Menentukan sin, cos, tan', kelas: [9], bloomTarget: ['C3'] },
          { nama: 'Soal cerita trigonometri', kelas: [9], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Transformasi geometri (refleksi, rotasi, translasi, dilatasi)', 
        kelas: [9], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Refleksi', kelas: [9], bloomTarget: ['C3'] },
          { nama: 'Rotasi', kelas: [9], bloomTarget: ['C3'] },
          { nama: 'Translasi', kelas: [9], bloomTarget: ['C3'] },
          { nama: 'Dilatasi', kelas: [9], bloomTarget: ['C3'] },
          { nama: 'Soal cerita transformasi', kelas: [9], bloomTarget: ['C4'] },
        ]
      },
    ]
  },
  {
    nama: 'Data dan Peluang',
    fase: ['D'],
    subElemen: [
      { 
        nama: 'Diagram batang, garis, lingkaran', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Membaca diagram', kelas: [7], bloomTarget: ['C2'] },
          { nama: 'Membuat diagram', kelas: [7, 8], bloomTarget: ['C2'] },
          { nama: 'Menafsirkan diagram', kelas: [7, 8, 9], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Tabel frekuensi', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Membuat tabel frekuensi', kelas: [7], bloomTarget: ['C2'] },
          { nama: 'Membaca tabel frekuensi', kelas: [7], bloomTarget: ['C2'] },
          { nama: 'Soal cerita tabel frekuensi', kelas: [7, 8, 9], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Mean', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Menghitung mean data tunggal', kelas: [7], bloomTarget: ['C2'] },
          { nama: 'Menghitung mean data kelompok', kelas: [8, 9], bloomTarget: ['C3'] },
          { nama: 'Soal cerita mean', kelas: [7, 8, 9], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Median', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Menentukan median data tunggal', kelas: [7], bloomTarget: ['C2'] },
          { nama: 'Menentukan median data kelompok', kelas: [8, 9], bloomTarget: ['C3'] },
          { nama: 'Soal cerita median', kelas: [7, 8, 9], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Modus', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Menentukan modus data tunggal', kelas: [7], bloomTarget: ['C2'] },
          { nama: 'Menentukan modus data kelompok', kelas: [8, 9], bloomTarget: ['C3'] },
          { nama: 'Soal cerita modus', kelas: [7, 8, 9], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Jangkauan', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Menentukan jangkauan', kelas: [7], bloomTarget: ['C2'] },
          { nama: 'Soal cerita jangkauan', kelas: [7, 8, 9], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Peluang teoritis', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Ruang sampel', kelas: [7], bloomTarget: ['C1'] },
          { nama: 'Menghitung peluang', kelas: [7, 8], bloomTarget: ['C2'] },
          { nama: 'Soal cerita peluang', kelas: [7, 8, 9], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Frekuensi relatif', 
        kelas: [7, 8, 9], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Menentukan frekuensi relatif', kelas: [7], bloomTarget: ['C2'] },
          { nama: 'Soal cerita frekuensi relatif', kelas: [7, 8, 9], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Ruang sampel', 
        kelas: [8, 9], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Menentukan ruang sampel', kelas: [8], bloomTarget: ['C3'] },
          { nama: 'Soal cerita ruang sampel', kelas: [8, 9], bloomTarget: ['C4'] },
        ]
      },
    ]
  }
];

// ==================== FASE E (Kelas 10) ====================
const elemenFaseE: Elemen[] = [
  {
    nama: 'Bilangan',
    fase: ['E'],
    subElemen: [
      { 
        nama: 'Eksponensial', 
        kelas: [10], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Sifat-sifat eksponensial', kelas: [10], bloomTarget: ['C2'] },
          { nama: 'Persamaan eksponensial', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Soal cerita eksponensial', kelas: [10], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Logaritma', 
        kelas: [10], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Sifat-sifat logaritma', kelas: [10], bloomTarget: ['C2'] },
          { nama: 'Persamaan logaritma', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Soal cerita logaritma', kelas: [10], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Barisan aritmatika', 
        kelas: [10], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Menentukan suku ke-n', kelas: [10], bloomTarget: ['C2'] },
          { nama: 'Menentukan beda', kelas: [10], bloomTarget: ['C2'] },
          { nama: 'Soal cerita barisan aritmatika', kelas: [10], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Barisan geometri', 
        kelas: [10], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Menentukan suku ke-n', kelas: [10], bloomTarget: ['C2'] },
          { nama: 'Menentukan rasio', kelas: [10], bloomTarget: ['C2'] },
          { nama: 'Soal cerita barisan geometri', kelas: [10], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Deret aritmatika', 
        kelas: [10], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Jumlah deret aritmatika', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Soal cerita deret aritmatika', kelas: [10], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Deret geometri', 
        kelas: [10], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Jumlah deret geometri', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Deret geometri tak hingga', kelas: [10], bloomTarget: ['C4'] },
          { nama: 'Soal cerita deret geometri', kelas: [10], bloomTarget: ['C4'] },
        ]
      },
    ]
  },
  {
    nama: 'Aljabar',
    fase: ['E'],
    subElemen: [
      { 
        nama: 'Persamaan kuadrat', 
        kelas: [10], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Pemfaktoran', kelas: [10], bloomTarget: ['C2'] },
          { nama: 'Rumus ABC', kelas: [10], bloomTarget: ['C2'] },
          { nama: 'Jumlah dan hasil kali akar', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Soal cerita persamaan kuadrat', kelas: [10], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Fungsi kuadrat', 
        kelas: [10], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Bentuk fungsi kuadrat', kelas: [10], bloomTarget: ['C1'] },
          { nama: 'Titik puncak', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Menggambar grafik', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Soal cerita fungsi kuadrat', kelas: [10], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Grafik fungsi kuadrat', 
        kelas: [10], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Membaca grafik', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Menggambar grafik', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Menentukan fungsi dari grafik', kelas: [10], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Pertidaksamaan', 
        kelas: [10], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Pertidaksamaan linear', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Pertidaksamaan kuadrat', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Soal cerita pertidaksamaan', kelas: [10], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Sistem persamaan linear & kuadrat', 
        kelas: [10], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'SPLKV', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Soal cerita SPLKV', kelas: [10], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Matriks dasar', 
        kelas: [10], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Mengenal matriks', kelas: [10], bloomTarget: ['C1'] },
          { nama: 'Ordo matriks', kelas: [10], bloomTarget: ['C1'] },
          { nama: 'Transpose matriks', kelas: [10], bloomTarget: ['C2'] },
        ]
      },
      { 
        nama: 'Operasi matriks', 
        kelas: [10], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Penjumlahan matriks', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Pengurangan matriks', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Perkalian matriks', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Soal cerita matriks', kelas: [10], bloomTarget: ['C4'] },
        ]
      },
    ]
  },
  {
    nama: 'Geometri',
    fase: ['E'],
    subElemen: [
      { 
        nama: 'Trigonometri (sin, cos, tan)', 
        kelas: [10], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Perbandingan trigonometri', kelas: [10], bloomTarget: ['C2'] },
          { nama: 'Menentukan sin, cos, tan', kelas: [10], bloomTarget: ['C2'] },
          { nama: 'Sudut-sudut istimewa', kelas: [10], bloomTarget: ['C2'] },
          { nama: 'Soal cerita trigonometri', kelas: [10], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Aturan sinus', 
        kelas: [10], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Aturan sinus', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Soal cerita aturan sinus', kelas: [10], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Aturan cosinus', 
        kelas: [10], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Aturan cosinus', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Soal cerita aturan cosinus', kelas: [10], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Luas segitiga dengan trigonometri', 
        kelas: [10], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Luas segitiga dengan sin', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Soal cerita luas segitiga', kelas: [10], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Persamaan lingkaran', 
        kelas: [10], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Persamaan lingkaran pusat (0,0)', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Persamaan lingkaran pusat (a,b)', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Soal cerita persamaan lingkaran', kelas: [10], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Garis singgung lingkaran', 
        kelas: [10], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Persamaan garis singgung', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Soal cerita garis singgung', kelas: [10], bloomTarget: ['C4'] },
        ]
      },
    ]
  },
  {
    nama: 'Data dan Peluang',
    fase: ['E'],
    subElemen: [
      { 
        nama: 'Statistika (simpangan baku, varians)', 
        kelas: [10], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Varians data', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Simpangan baku data', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Soal cerita statistika', kelas: [10], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Aturan perkalian', 
        kelas: [10], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Aturan perkalian', kelas: [10], bloomTarget: ['C2'] },
          { nama: 'Soal cerita aturan perkalian', kelas: [10], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Permutasi', 
        kelas: [10], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Permutasi n objek', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Permutasi siklik', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Soal cerita permutasi', kelas: [10], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Kombinasi', 
        kelas: [10], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Kombinasi n objek', kelas: [10], bloomTarget: ['C3'] },
          { nama: 'Soal cerita kombinasi', kelas: [10], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Peluang kejadian bersyarat', 
        kelas: [10], 
        bloomTarget: ['C4', 'C5'],
        subSubElemen: [
          { nama: 'Peluang bersyarat', kelas: [10], bloomTarget: ['C4'] },
          { nama: 'Soal cerita peluang bersyarat', kelas: [10], bloomTarget: ['C5'] },
        ]
      },
    ]
  }
];

// ==================== FASE F (Kelas 11-12) ====================
const elemenFaseF: Elemen[] = [
  {
    nama: 'Aljabar',
    fase: ['F'],
    subElemen: [
      { 
        nama: 'Polinomial (suku banyak)', 
        kelas: [11, 12], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Mengenal polinomial', kelas: [11], bloomTarget: ['C1'] },
          { nama: 'Operasi polinomial', kelas: [11], bloomTarget: ['C2'] },
          { nama: 'Pembagian polinomial', kelas: [11, 12], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Faktor polinomial', 
        kelas: [11, 12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Teorema faktor', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Memfaktorkan polinomial', kelas: [11, 12], bloomTarget: ['C3'] },
          { nama: 'Soal cerita faktor polinomial', kelas: [11, 12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Identitas polinomial', 
        kelas: [11, 12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Identitas polinomial', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Soal cerita identitas polinomial', kelas: [11, 12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Fungsi komposisi', 
        kelas: [11], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Menentukan fungsi komposisi', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Soal cerita fungsi komposisi', kelas: [11], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Fungsi invers', 
        kelas: [11], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Menentukan invers fungsi', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Soal cerita invers fungsi', kelas: [11], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Fungsi eksponensial lanjut', 
        kelas: [11], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Fungsi eksponensial', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Soal cerita eksponensial', kelas: [11], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Fungsi logaritma lanjut', 
        kelas: [11], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Fungsi logaritma', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Soal cerita logaritma', kelas: [11], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Fungsi trigonometri', 
        kelas: [11, 12], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Grafik fungsi trigonometri', kelas: [11], bloomTarget: ['C2'] },
          { nama: 'Persamaan fungsi trigonometri', kelas: [11, 12], bloomTarget: ['C3'] },
          { nama: 'Soal cerita fungsi trigonometri', kelas: [11, 12], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Identitas trigonometri', 
        kelas: [11, 12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Identitas trigonometri dasar', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Membuktikan identitas trigonometri', kelas: [11, 12], bloomTarget: ['C4'] },
          { nama: 'Soal cerita identitas trigonometri', kelas: [11, 12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Persamaan trigonometri', 
        kelas: [11, 12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Menyelesaikan persamaan trigonometri', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Soal cerita persamaan trigonometri', kelas: [11, 12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Pertidaksamaan trigonometri', 
        kelas: [11, 12], 
        bloomTarget: ['C4', 'C5'],
        subSubElemen: [
          { nama: 'Menyelesaikan pertidaksamaan trigonometri', kelas: [11], bloomTarget: ['C4'] },
          { nama: 'Soal cerita pertidaksamaan trigonometri', kelas: [11, 12], bloomTarget: ['C5'] },
        ]
      },
      { 
        nama: 'Limit fungsi', 
        kelas: [12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Konsep limit', kelas: [12], bloomTarget: ['C3'] },
          { nama: 'Limit fungsi aljabar', kelas: [12], bloomTarget: ['C3'] },
          { nama: 'Limit fungsi trigonometri', kelas: [12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Turunan (derivatif)', 
        kelas: [12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Konsep turunan', kelas: [12], bloomTarget: ['C3'] },
          { nama: 'Turunan fungsi aljabar', kelas: [12], bloomTarget: ['C3'] },
          { nama: 'Turunan fungsi trigonometri', kelas: [12], bloomTarget: ['C4'] },
          { nama: 'Aplikasi turunan', kelas: [12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Aturan rantai', 
        kelas: [12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Aturan rantai', kelas: [12], bloomTarget: ['C3'] },
          { nama: 'Soal cerita aturan rantai', kelas: [12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Integral tak tentu', 
        kelas: [12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Konsep integral tak tentu', kelas: [12], bloomTarget: ['C3'] },
          { nama: 'Integral fungsi aljabar', kelas: [12], bloomTarget: ['C3'] },
          { nama: 'Integral dengan substitusi', kelas: [12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Integral tentu', 
        kelas: [12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Konsep integral tentu', kelas: [12], bloomTarget: ['C3'] },
          { nama: 'Luas daerah dengan integral', kelas: [12], bloomTarget: ['C4'] },
          { nama: 'Volume benda putar', kelas: [12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Matriks lanjut', 
        kelas: [11, 12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Determinan matriks ordo 3x3', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Invers matriks ordo 3x3', kelas: [11, 12], bloomTarget: ['C4'] },
          { nama: 'Soal cerita matriks', kelas: [11, 12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Determinan matriks', 
        kelas: [11, 12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Determinan ordo 2x2', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Determinan ordo 3x3', kelas: [11, 12], bloomTarget: ['C4'] },
          { nama: 'Soal cerita determinan', kelas: [11, 12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Invers matriks', 
        kelas: [11, 12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Invers ordo 2x2', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Invers ordo 3x3', kelas: [11, 12], bloomTarget: ['C4'] },
          { nama: 'Soal cerita invers matriks', kelas: [11, 12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Program linear', 
        kelas: [11], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Fungsi tujuan', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Kendala', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Soal cerita program linear', kelas: [11], bloomTarget: ['C4'] },
        ]
      },
    ]
  },
  {
    nama: 'Geometri',
    fase: ['F'],
    subElemen: [
      { 
        nama: 'Vektor di bidang datar', 
        kelas: [11, 12], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Mengenal vektor', kelas: [11], bloomTarget: ['C1'] },
          { nama: 'Operasi vektor', kelas: [11], bloomTarget: ['C2'] },
          { nama: 'Panjang vektor', kelas: [11, 12], bloomTarget: ['C2'] },
        ]
      },
      { 
        nama: 'Vektor di ruang', 
        kelas: [11, 12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Vektor 3 dimensi', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Operasi vektor 3D', kelas: [11, 12], bloomTarget: ['C3'] },
          { nama: 'Soal cerita vektor 3D', kelas: [11, 12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Operasi vektor', 
        kelas: [11, 12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Penjumlahan vektor', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Pengurangan vektor', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Perkalian skalar', kelas: [11, 12], bloomTarget: ['C3'] },
          { nama: 'Soal cerita operasi vektor', kelas: [11, 12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Pembuktian geometris dengan vektor', 
        kelas: [11, 12], 
        bloomTarget: ['C4', 'C5'],
        subSubElemen: [
          { nama: 'Pembuktian dengan vektor', kelas: [11], bloomTarget: ['C4'] },
          { nama: 'Soal cerita pembuktian vektor', kelas: [11, 12], bloomTarget: ['C5'] },
        ]
      },
      { 
        nama: 'Transformasi geometri lanjut', 
        kelas: [11], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Transformasi dengan matriks', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Soal cerita transformasi', kelas: [11], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Persamaan lingkaran lanjut', 
        kelas: [11, 12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Persamaan umum lingkaran', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Soal cerita lingkaran lanjut', kelas: [11, 12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Persamaan elips', 
        kelas: [11, 12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Persamaan elips', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Soal cerita elips', kelas: [11, 12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Persamaan parabola', 
        kelas: [11, 12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Persamaan parabola', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Soal cerita parabola', kelas: [11, 12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Persamaan hiperbola', 
        kelas: [11, 12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Persamaan hiperbola', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Soal cerita hiperbola', kelas: [11, 12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Garis singgung elips', 
        kelas: [11, 12], 
        bloomTarget: ['C4', 'C5'],
        subSubElemen: [
          { nama: 'Garis singgung elips', kelas: [11], bloomTarget: ['C4'] },
          { nama: 'Soal cerita garis singgung elips', kelas: [11, 12], bloomTarget: ['C5'] },
        ]
      },
      { 
        nama: 'Dimensi tiga (jarak)', 
        kelas: [11, 12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Jarak titik ke titik', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Jarak titik ke garis', kelas: [11, 12], bloomTarget: ['C4'] },
          { nama: 'Jarak titik ke bidang', kelas: [11, 12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Dimensi tiga (sudut)', 
        kelas: [11, 12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Sudut antar garis', kelas: [11], bloomTarget: ['C3'] },
          { nama: 'Sudut antara garis dan bidang', kelas: [11, 12], bloomTarget: ['C4'] },
          { nama: 'Sudut antara 2 bidang', kelas: [11, 12], bloomTarget: ['C4'] },
        ]
      },
    ]
  },
  {
    nama: 'Data dan Peluang',
    fase: ['F'],
    subElemen: [
      { 
        nama: 'Variabel diskrit acak', 
        kelas: [12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Variabel acak diskrit', kelas: [12], bloomTarget: ['C3'] },
          { nama: 'Soal cerita variabel acak', kelas: [12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Fungsi peluang', 
        kelas: [12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Fungsi peluang diskrit', kelas: [12], bloomTarget: ['C3'] },
          { nama: 'Soal cerita fungsi peluang', kelas: [12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Distribusi seragam', 
        kelas: [12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Distribusi seragam diskrit', kelas: [12], bloomTarget: ['C3'] },
          { nama: 'Soal cerita distribusi seragam', kelas: [12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Distribusi binomial', 
        kelas: [12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Distribusi binomial', kelas: [12], bloomTarget: ['C3'] },
          { nama: 'Soal cerita distribusi binomial', kelas: [12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Distribusi normal', 
        kelas: [12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Distribusi normal', kelas: [12], bloomTarget: ['C3'] },
          { nama: 'Soal cerita distribusi normal', kelas: [12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Nilai harapan', 
        kelas: [12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Nilai harapan', kelas: [12], bloomTarget: ['C3'] },
          { nama: 'Soal cerita nilai harapan', kelas: [12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Uji hipotesis', 
        kelas: [12], 
        bloomTarget: ['C4', 'C5'],
        subSubElemen: [
          { nama: 'Uji hipotesis', kelas: [12], bloomTarget: ['C4'] },
          { nama: 'Soal cerita uji hipotesis', kelas: [12], bloomTarget: ['C5'] },
        ]
      },
      { 
        nama: 'Korelasi', 
        kelas: [12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Korelasi Pearson', kelas: [12], bloomTarget: ['C3'] },
          { nama: 'Soal cerita korelasi', kelas: [12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Regresi linear', 
        kelas: [12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Regresi linear', kelas: [12], bloomTarget: ['C3'] },
          { nama: 'Soal cerita regresi linear', kelas: [12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Statistika inferensial', 
        kelas: [12], 
        bloomTarget: ['C4', 'C5'],
        subSubElemen: [
          { nama: 'Statistika inferensial', kelas: [12], bloomTarget: ['C4'] },
          { nama: 'Soal cerita statistika inferensial', kelas: [12], bloomTarget: ['C5'] },
        ]
      },
    ]
  },
  {
    nama: 'Kalkulus',
    fase: ['F'],
    subElemen: [
      { 
        nama: 'Limit & kontinuitas', 
        kelas: [12], 
        bloomTarget: ['C2', 'C3'],
        subSubElemen: [
          { nama: 'Konsep limit & kontinuitas', kelas: [12], bloomTarget: ['C2'] },
          { nama: 'Soal cerita limit & kontinuitas', kelas: [12], bloomTarget: ['C3'] },
        ]
      },
      { 
        nama: 'Turunan fungsi polinomial', 
        kelas: [12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Turunan polinomial', kelas: [12], bloomTarget: ['C3'] },
          { nama: 'Soal cerita turunan polinomial', kelas: [12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Turunan fungsi eksponensial', 
        kelas: [12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Turunan eksponensial', kelas: [12], bloomTarget: ['C3'] },
          { nama: 'Soal cerita turunan eksponensial', kelas: [12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Turunan fungsi trigonometri', 
        kelas: [12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Turunan trigonometri', kelas: [12], bloomTarget: ['C3'] },
          { nama: 'Soal cerita turunan trigonometri', kelas: [12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Aplikasi turunan (optimasi)', 
        kelas: [12], 
        bloomTarget: ['C4', 'C5'],
        subSubElemen: [
          { nama: 'Optimasi dengan turunan', kelas: [12], bloomTarget: ['C4'] },
          { nama: 'Soal cerita optimasi', kelas: [12], bloomTarget: ['C5'] },
        ]
      },
      { 
        nama: 'Aplikasi turunan (laju berubah)', 
        kelas: [12], 
        bloomTarget: ['C4', 'C5'],
        subSubElemen: [
          { nama: 'Laju perubahan', kelas: [12], bloomTarget: ['C4'] },
          { nama: 'Soal cerita laju perubahan', kelas: [12], bloomTarget: ['C5'] },
        ]
      },
      { 
        nama: 'Aplikasi turunan (garis singgung)', 
        kelas: [12], 
        bloomTarget: ['C4', 'C5'],
        subSubElemen: [
          { nama: 'Garis singgung dengan turunan', kelas: [12], bloomTarget: ['C4'] },
          { nama: 'Soal cerita garis singgung', kelas: [12], bloomTarget: ['C5'] },
        ]
      },
      { 
        nama: 'Integral sebagai anti turunan', 
        kelas: [12], 
        bloomTarget: ['C3', 'C4'],
        subSubElemen: [
          { nama: 'Integral sebagai anti turunan', kelas: [12], bloomTarget: ['C3'] },
          { nama: 'Soal cerita anti turunan', kelas: [12], bloomTarget: ['C4'] },
        ]
      },
      { 
        nama: 'Integral untuk luas daerah', 
        kelas: [12], 
        bloomTarget: ['C4', 'C5'],
        subSubElemen: [
          { nama: 'Luas daerah dengan integral', kelas: [12], bloomTarget: ['C4'] },
          { nama: 'Soal cerita luas daerah', kelas: [12], bloomTarget: ['C5'] },
        ]
      },
      { 
        nama: 'Integral untuk volume benda putar', 
        kelas: [12], 
        bloomTarget: ['C4', 'C5'],
        subSubElemen: [
          { nama: 'Volume benda putar', kelas: [12], bloomTarget: ['C4'] },
          { nama: 'Soal cerita volume benda putar', kelas: [12], bloomTarget: ['C5'] },
        ]
      },
      { 
        nama: 'Teorema dasar kalkulus', 
        kelas: [12], 
        bloomTarget: ['C4', 'C5'],
        subSubElemen: [
          { nama: 'Teorema dasar kalkulus', kelas: [12], bloomTarget: ['C4'] },
          { nama: 'Soal cerita teorema dasar kalkulus', kelas: [12], bloomTarget: ['C5'] },
        ]
      },
    ]
  },

  {
    nama: 'TKA6',
    fase: ['F'],
   subElemen: [
    {
      nama: 'Kosong (TKA6)',
      kelas: [12],
      bloomTarget: ['C1']
      // subSubElemen tidak perlu, biarkan kosong
    }
  ]
  }

];

// ==================== GABUNGAN SEMUA FASE ====================
export const KISI_MATEMATIKA: Elemen[] = [
  ...elemenFaseA,
  ...elemenFaseB,
  ...elemenFaseC,
  ...elemenFaseD,
  ...elemenFaseE,
  ...elemenFaseF,
];

// ==================== HELPER FUNCTIONS ====================

export function getFaseDariKelas(kelas: number): Fase {
  if (kelas >= 1 && kelas <= 2) return 'A';
  if (kelas >= 3 && kelas <= 4) return 'B';
  if (kelas >= 5 && kelas <= 6) return 'C';
  if (kelas >= 7 && kelas <= 9) return 'D';
  if (kelas === 10) return 'E';
  if (kelas >= 11 && kelas <= 12) return 'F';
  throw new Error(`Kelas ${kelas} tidak valid`);
}

export function getElemenByFase(fase: Fase): Elemen[] {
  return KISI_MATEMATIKA.filter(e => e.fase.includes(fase));
}

export function getSubElemenByElemenDanFase(elemenNama: string, fase: Fase): SubElemen[] {
  const elemen = KISI_MATEMATIKA.find(e => e.nama === elemenNama && e.fase.includes(fase));
  return elemen?.subElemen || [];
}

export function getSubSubElemenBySubElemen(subElemenNama: string, elemenNama: string, fase: Fase): SubSubElemen[] {
  const elemen = KISI_MATEMATIKA.find(e => e.nama === elemenNama && e.fase.includes(fase));
  if (!elemen) return [];
  const sub = elemen.subElemen.find(s => s.nama === subElemenNama);
  return sub?.subSubElemen || [];
}

export function validasiElemenFase(elemen: string, fase: Fase): boolean {
  return KISI_MATEMATIKA.some(e => e.nama === elemen && e.fase.includes(fase));
}

export function validasiSubElemen(subElemen: string, elemen: string, fase: Fase): boolean {
  const elemenData = KISI_MATEMATIKA.find(e => e.nama === elemen && e.fase.includes(fase));
  return elemenData?.subElemen.some(se => se.nama === subElemen) || false;
}

export function validasiSubSubElemen(subSubElemen: string, subElemen: string, elemen: string, fase: Fase): boolean {
  const elemenData = KISI_MATEMATIKA.find(e => e.nama === elemen && e.fase.includes(fase));
  if (!elemenData) return false;
  const sub = elemenData.subElemen.find(s => s.nama === subElemen);
  return sub?.subSubElemen?.some(ss => ss.nama === subSubElemen) || false;
}

export function buatRingkasanKisiKisi(): string {
  const lines: string[] = [];

  ['A', 'B', 'C', 'D', 'E', 'F'].forEach(fase => {
    const elemen = getElemenByFase(fase as Fase);
    lines.push(`\nFASE ${fase}:`);
    elemen.forEach(e => {
      lines.push(`  - ${e.nama}: ${e.subElemen.length} sub-elemen`);
    });
  });

  return lines.join('\n');
}

export function buatRingkasanSubElemen(): string {
  const lines: string[] = [];

  KISI_MATEMATIKA.forEach(elemen => {
    elemen.subElemen.forEach(sub => {
      const subSubCount = sub.subSubElemen?.length || 0;
      lines.push(`- ${elemen.nama} > ${sub.nama} (Kelas ${sub.kelas.join(', ')}, Fase ${elemen.fase.join(', ')})${subSubCount > 0 ? `, ${subSubCount} sub-sub-elemen` : ''}`);
    });
  });

  return lines.join('\n');
}

export function buatRingkasanSubSubElemen(): string {
  const lines: string[] = [];

  KISI_MATEMATIKA.forEach(elemen => {
    elemen.subElemen.forEach(sub => {
      if (sub.subSubElemen && sub.subSubElemen.length > 0) {
        sub.subSubElemen.forEach(ss => {
          lines.push(`- ${elemen.nama} > ${sub.nama} > ${ss.nama} (Kelas ${ss.kelas.join(', ')})`);
        });
      }
    });
  });

  return lines.join('\n');
}

export function getBloomTarget(subElemenNama: string): string[] {
  for (const elemen of KISI_MATEMATIKA) {
    const sub = elemen.subElemen.find(s => s.nama === subElemenNama);
    if (sub) return sub.bloomTarget;
  }
  return ['C2', 'C3'];
}

export function getBloomTargetSubSub(subSubElemenNama: string): string[] {
  for (const elemen of KISI_MATEMATIKA) {
    for (const sub of elemen.subElemen) {
      if (sub.subSubElemen) {
        const ss = sub.subSubElemen.find(s => s.nama === subSubElemenNama);
        if (ss) return ss.bloomTarget;
      }
    }
  }
  return ['C2', 'C3'];
}

export function getSubElemenByKelas(kelas: number): SubElemen[] {
  const result: SubElemen[] = [];
  KISI_MATEMATIKA.forEach(elemen => {
    elemen.subElemen.forEach(sub => {
      if (sub.kelas.includes(kelas)) {
        result.push(sub);
      }
    });
  });
  return result;
}

export function getSubSubElemenByKelas(kelas: number): SubSubElemen[] {
  const result: SubSubElemen[] = [];
  KISI_MATEMATIKA.forEach(elemen => {
    elemen.subElemen.forEach(sub => {
      if (sub.subSubElemen) {
        sub.subSubElemen.forEach(ss => {
          if (ss.kelas.includes(kelas)) {
            result.push(ss);
          }
        });
      }
    });
  });
  return result;
}

// Statistik
export function getStatistikKisi(): { 
  totalElemen: number; 
  totalSubElemen: number; 
  totalSubSubElemen: number;
  byFase: Record<string, { subElemen: number; subSubElemen: number }> 
} {
  const byFase: Record<string, { subElemen: number; subSubElemen: number }> = {};
  let totalSubSub = 0;

  KISI_MATEMATIKA.forEach(elemen => {
    elemen.fase.forEach(f => {
      if (!byFase[f]) byFase[f] = { subElemen: 0, subSubElemen: 0 };
      byFase[f].subElemen += elemen.subElemen.length;
      
      elemen.subElemen.forEach(sub => {
        if (sub.subSubElemen) {
          byFase[f].subSubElemen += sub.subSubElemen.length;
          totalSubSub += sub.subSubElemen.length;
        }
      });
    });
  });

  return {
    totalElemen: KISI_MATEMATIKA.length,
    totalSubElemen: KISI_MATEMATIKA.reduce((acc, e) => acc + e.subElemen.length, 0),
    totalSubSubElemen: totalSubSub,
    byFase
  };
}

// ==================== EXPORT UNTUK KOMPATIBILITAS ====================
// Untuk kompatibilitas dengan kode lama yang menggunakan KISI_MATEMATIKA
export default KISI_MATEMATIKA;
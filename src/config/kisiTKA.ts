// config/kisiTKA.ts
// Kisi-kisi Matematika lengkap untuk semua fase (A-F)
// Berdasarkan Kurikulum Merdeka Kemendikdasmen

export type Fase = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

export interface SubElemen {
  nama: string;
  kelas: number[];
  bloomTarget: string[]; // C1-C6 yang umum untuk sub-elemen ini
}

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
      { nama: 'Bilangan cacah sampai 999', kelas: [1, 2], bloomTarget: ['C1', 'C2'] },
      { nama: 'Sistem nilai tempat', kelas: [1, 2], bloomTarget: ['C1', 'C2'] },
      { nama: 'Penjumlahan bilangan cacah', kelas: [1, 2], bloomTarget: ['C2', 'C3'] },
      { nama: 'Pengurangan bilangan cacah', kelas: [1, 2], bloomTarget: ['C2', 'C3'] },
      { nama: 'Bilangan pecahan sederhana (½, ¼, ⅛)', kelas: [2], bloomTarget: ['C1', 'C2'] },
    ]
  },
  {
    nama: 'Aljabar',
    fase: ['A'],
    subElemen: [
      { nama: 'Pola gambar berulang', kelas: [1, 2], bloomTarget: ['C1', 'C2'] },
      { nama: 'Pola bilangan membesar & mengecil', kelas: [1, 2], bloomTarget: ['C1', 'C2'] },
      { nama: 'Persamaan sederhana', kelas: [2], bloomTarget: ['C2', 'C3'] },
    ]
  },
  {
    nama: 'Pengukuran',
    fase: ['A'],
    subElemen: [
      { nama: 'Pengukuran panjang (satuan tidak baku)', kelas: [1], bloomTarget: ['C1', 'C2'] },
      { nama: 'Pengukuran berat (satuan tidak baku)', kelas: [1], bloomTarget: ['C1', 'C2'] },
      { nama: 'Satuan baku panjang (cm, m)', kelas: [2], bloomTarget: ['C2', 'C3'] },
      { nama: 'Satuan baku berat (gr, kg)', kelas: [2], bloomTarget: ['C2', 'C3'] },
      { nama: 'Satuan baku waktu (detik, menit, jam)', kelas: [2], bloomTarget: ['C2', 'C3'] },
    ]
  },
  {
    nama: 'Geometri',
    fase: ['A'],
    subElemen: [
      { nama: 'Bangun datar (segiempat, segitiga, lingkaran)', kelas: [1, 2], bloomTarget: ['C1', 'C2'] },
      { nama: 'Bangun ruang (balok, kubus)', kelas: [2], bloomTarget: ['C1', 'C2'] },
      { nama: 'Posisi benda (kanan, kiri, depan, belakang)', kelas: [1, 2], bloomTarget: ['C1', 'C2'] },
      { nama: 'Pengubinan bangun datar', kelas: [2], bloomTarget: ['C3', 'C4'] },
    ]
  },
  {
    nama: 'Data dan Peluang',
    fase: ['A'],
    subElemen: [
      { nama: 'Pengurutan & perbandingan data', kelas: [2], bloomTarget: ['C2', 'C3'] },
      { nama: 'Penyajian data dengan turus', kelas: [2], bloomTarget: ['C2', 'C3'] },
      { nama: 'Penyajian data dengan gambar', kelas: [2], bloomTarget: ['C2', 'C3'] },
    ]
  }
];

// ==================== FASE B (Kelas 3-4) ====================
const elemenFaseB: Elemen[] = [
  {
    nama: 'Bilangan',
    fase: ['B'],
    subElemen: [
      { nama: 'Bilangan cacah sampai 10.000', kelas: [3, 4], bloomTarget: ['C1', 'C2'] },
      { nama: 'Perkalian bilangan', kelas: [3, 4], bloomTarget: ['C2', 'C3'] },
      { nama: 'Pembagian bilangan', kelas: [3, 4], bloomTarget: ['C2', 'C3'] },
      { nama: 'Faktor & kelipatan', kelas: [4], bloomTarget: ['C2', 'C3'] },
      { nama: 'KPK & FPB', kelas: [4], bloomTarget: ['C3', 'C4'] },
      { nama: 'Pecahan (penjumlahan & pengurangan)', kelas: [3, 4], bloomTarget: ['C2', 'C3'] },
      { nama: 'Perbandingan pecahan', kelas: [4], bloomTarget: ['C2', 'C3'] },
    ]
  },
  {
    nama: 'Aljabar',
    fase: ['B'],
    subElemen: [
      { nama: 'Pola bilangan kompleks', kelas: [3, 4], bloomTarget: ['C2', 'C3'] },
      { nama: 'Sifat komutatif', kelas: [4], bloomTarget: ['C2', 'C3'] },
      { nama: 'Sifat asosiatif', kelas: [4], bloomTarget: ['C2', 'C3'] },
      { nama: 'Sifat distributif', kelas: [4], bloomTarget: ['C3', 'C4'] },
    ]
  },
  {
    nama: 'Pengukuran',
    fase: ['B'],
    subElemen: [
      { nama: 'Keliling bangun datar sederhana', kelas: [3], bloomTarget: ['C2', 'C3'] },
      { nama: 'Luas bangun datar sederhana', kelas: [3, 4], bloomTarget: ['C2', 'C3'] },
      { nama: 'Sudut', kelas: [4], bloomTarget: ['C1', 'C2'] },
      { nama: 'Satuan panjang (km, m, cm, mm)', kelas: [3, 4], bloomTarget: ['C2', 'C3'] },
      { nama: 'Satuan berat (kg, hg, g)', kelas: [3, 4], bloomTarget: ['C2', 'C3'] },
      { nama: 'Satuan waktu & uang', kelas: [3, 4], bloomTarget: ['C2', 'C3'] },
    ]
  },
  {
    nama: 'Geometri',
    fase: ['B'],
    subElemen: [
      { nama: 'Sifat bangun datar', kelas: [3, 4], bloomTarget: ['C1', 'C2'] },
      { nama: 'Simetri lipat & putar', kelas: [3, 4], bloomTarget: ['C2', 'C3'] },
      { nama: 'Jaring-jaring bangun ruang', kelas: [4], bloomTarget: ['C3', 'C4'] },
      { nama: 'Koordinat sederhana', kelas: [4], bloomTarget: ['C2', 'C3'] },
    ]
  },
  {
    nama: 'Data dan Peluang',
    fase: ['B'],
    subElemen: [
      { nama: 'Tabel frekuensi', kelas: [3, 4], bloomTarget: ['C2', 'C3'] },
      { nama: 'Diagram batang', kelas: [3, 4], bloomTarget: ['C2', 'C3'] },
      { nama: 'Mean sederhana', kelas: [4], bloomTarget: ['C2', 'C3'] },
      { nama: 'Median & modus sederhana', kelas: [4], bloomTarget: ['C2', 'C3'] },
    ]
  }
];

// ==================== FASE C (Kelas 5-6) ====================
const elemenFaseC: Elemen[] = [
  {
    nama: 'Bilangan',
    fase: ['C'],
    subElemen: [
      { nama: 'Bilangan bulat (positif & negatif)', kelas: [5, 6], bloomTarget: ['C1', 'C2'] },
      { nama: 'Operasi bilangan bulat', kelas: [5, 6], bloomTarget: ['C2', 'C3'] },
      { nama: 'Pecahan (perkalian & pembagian)', kelas: [5, 6], bloomTarget: ['C2', 'C3'] },
      { nama: 'Pecahan desimal', kelas: [5, 6], bloomTarget: ['C2', 'C3'] },
      { nama: 'Persen', kelas: [5, 6], bloomTarget: ['C2', 'C3'] },
      { nama: 'Perbandingan & skala', kelas: [5, 6], bloomTarget: ['C3', 'C4'] },
      { nama: 'Bilangan berpangkat', kelas: [6], bloomTarget: ['C2', 'C3'] },
      { nama: 'Akar bilangan', kelas: [6], bloomTarget: ['C2', 'C3'] },
    ]
  },
  {
    nama: 'Aljabar',
    fase: ['C'],
    subElemen: [
      { nama: 'Persamaan linear satu variabel', kelas: [5, 6], bloomTarget: ['C2', 'C3'] },
      { nama: 'Himpunan', kelas: [5, 6], bloomTarget: ['C1', 'C2'] },
      { nama: 'Operasi himpunan', kelas: [6], bloomTarget: ['C2', 'C3'] },
    ]
  },
  {
    nama: 'Pengukuran',
    fase: ['C'],
    subElemen: [
      { nama: 'Keliling segitiga & trapesium', kelas: [5, 6], bloomTarget: ['C2', 'C3'] },
      { nama: 'Luas segitiga, trapesium, layang-layang', kelas: [5, 6], bloomTarget: ['C2', 'C3'] },
      { nama: 'Luas lingkaran', kelas: [6], bloomTarget: ['C2', 'C3'] },
      { nama: 'Volume kubus & balok', kelas: [5], bloomTarget: ['C2', 'C3'] },
      { nama: 'Volume tabung & kerucut', kelas: [6], bloomTarget: ['C3', 'C4'] },
      { nama: 'Debit', kelas: [6], bloomTarget: ['C3', 'C4'] },
    ]
  },
  {
    nama: 'Geometri',
    fase: ['C'],
    subElemen: [
      { nama: 'Sifat bangun datar kompleks', kelas: [5, 6], bloomTarget: ['C1', 'C2'] },
      { nama: 'Bangun ruang & sifatnya', kelas: [5, 6], bloomTarget: ['C1', 'C2'] },
      { nama: 'Pencerminan', kelas: [6], bloomTarget: ['C2', 'C3'] },
      { nama: 'Rotasi', kelas: [6], bloomTarget: ['C2', 'C3'] },
      { nama: 'Translasi', kelas: [6], bloomTarget: ['C2', 'C3'] },
    ]
  },
  {
    nama: 'Data dan Peluang',
    fase: ['C'],
    subElemen: [
      { nama: 'Diagram lingkaran', kelas: [5, 6], bloomTarget: ['C2', 'C3'] },
      { nama: 'Mean', kelas: [5, 6], bloomTarget: ['C2', 'C3'] },
      { nama: 'Median', kelas: [5, 6], bloomTarget: ['C2', 'C3'] },
      { nama: 'Modus', kelas: [5, 6], bloomTarget: ['C2', 'C3'] },
      { nama: 'Peluang sederhana', kelas: [6], bloomTarget: ['C2', 'C3'] },
    ]
  }
];

// ==================== FASE D (Kelas 7-9) ====================
const elemenFaseD: Elemen[] = [
  {
    nama: 'Bilangan',
    fase: ['D'],
    subElemen: [
      { nama: 'Bilangan rasional', kelas: [7, 8, 9], bloomTarget: ['C1', 'C2'] },
      { nama: 'Bilangan irasional', kelas: [7, 8, 9], bloomTarget: ['C1', 'C2'] },
      { nama: 'Bilangan berpangkat bulat', kelas: [7, 8, 9], bloomTarget: ['C2', 'C3'] },
      { nama: 'Bentuk akar', kelas: [7, 8, 9], bloomTarget: ['C2', 'C3'] },
      { nama: 'Notasi ilmiah', kelas: [7, 8, 9], bloomTarget: ['C2', 'C3'] },
      { nama: 'Faktorisasi prima', kelas: [7, 8, 9], bloomTarget: ['C2', 'C3'] },
      { nama: 'Rasio & skala', kelas: [7, 8, 9], bloomTarget: ['C3', 'C4'] },
      { nama: 'Proporsi', kelas: [7, 8, 9], bloomTarget: ['C3', 'C4'] },
      { nama: 'Laju perubahan', kelas: [7, 8, 9], bloomTarget: ['C3', 'C4'] },
      { nama: 'Literasi finansial', kelas: [8, 9], bloomTarget: ['C3', 'C4'] },
    ]
  },
  {
    nama: 'Aljabar',
    fase: ['D'],
    subElemen: [
      { nama: 'Pola bilangan & barisan', kelas: [7, 8, 9], bloomTarget: ['C2', 'C3'] },
      { nama: 'Persamaan linear satu variabel', kelas: [7], bloomTarget: ['C2', 'C3'] },
      { nama: 'Pertidaksamaan linear', kelas: [7], bloomTarget: ['C2', 'C3'] },
      { nama: 'Persamaan linear dua variabel', kelas: [8], bloomTarget: ['C3', 'C4'] },
      { nama: 'Sistem persamaan linear dua variabel', kelas: [8], bloomTarget: ['C3', 'C4'] },
      { nama: 'Fungsi & relasi', kelas: [8], bloomTarget: ['C2', 'C3'] },
      { nama: 'Fungsi linear & grafiknya', kelas: [8], bloomTarget: ['C3', 'C4'] },
      { nama: 'Persamaan garis lurus', kelas: [8], bloomTarget: ['C3', 'C4'] },
      { nama: 'Fungsi kuadrat', kelas: [9], bloomTarget: ['C3', 'C4'] },
      { nama: 'Persamaan kuadrat', kelas: [9], bloomTarget: ['C3', 'C4'] },
      { nama: 'Pertidaksamaan kuadrat', kelas: [9], bloomTarget: ['C3', 'C4'] },
    ]
  },
  {
    nama: 'Geometri dan Pengukuran',
    fase: ['D'],
    subElemen: [
      { nama: 'Segitiga (sifat, keliling, luas)', kelas: [7, 8, 9], bloomTarget: ['C2', 'C3'] },
      { nama: 'Segiempat (sifat, keliling, luas)', kelas: [7, 8, 9], bloomTarget: ['C2', 'C3'] },
      { nama: 'Lingkaran (keliling, luas)', kelas: [7, 8, 9], bloomTarget: ['C2', 'C3'] },
      { nama: 'Bangun ruang (prisma, limas)', kelas: [8, 9], bloomTarget: ['C3', 'C4'] },
      { nama: 'Bangun ruang (tabung, kerucut, bola)', kelas: [8, 9], bloomTarget: ['C3', 'C4'] },
      { nama: 'Kesebangunan', kelas: [9], bloomTarget: ['C3', 'C4'] },
      { nama: 'Kongruensi', kelas: [9], bloomTarget: ['C3', 'C4'] },
      { nama: 'Teorema Pythagoras', kelas: [8], bloomTarget: ['C3', 'C4'] },
      { nama: 'Trigonometri dasar (sin, cos, tan)', kelas: [9], bloomTarget: ['C3', 'C4'] },
      { nama: 'Transformasi geometri (refleksi, rotasi, translasi, dilatasi)', kelas: [9], bloomTarget: ['C3', 'C4'] },
    ]
  },
  {
    nama: 'Data dan Peluang',
    fase: ['D'],
    subElemen: [
      { nama: 'Diagram batang, garis, lingkaran', kelas: [7, 8, 9], bloomTarget: ['C2', 'C3'] },
      { nama: 'Tabel frekuensi', kelas: [7, 8, 9], bloomTarget: ['C2', 'C3'] },
      { nama: 'Mean', kelas: [7, 8, 9], bloomTarget: ['C2', 'C3'] },
      { nama: 'Median', kelas: [7, 8, 9], bloomTarget: ['C2', 'C3'] },
      { nama: 'Modus', kelas: [7, 8, 9], bloomTarget: ['C2', 'C3'] },
      { nama: 'Jangkauan', kelas: [7, 8, 9], bloomTarget: ['C2', 'C3'] },
      { nama: 'Peluang teoritis', kelas: [7, 8, 9], bloomTarget: ['C2', 'C3'] },
      { nama: 'Frekuensi relatif', kelas: [7, 8, 9], bloomTarget: ['C2', 'C3'] },
      { nama: 'Ruang sampel', kelas: [8, 9], bloomTarget: ['C3', 'C4'] },
    ]
  }
];

// ==================== FASE E (Kelas 10) ====================
const elemenFaseE: Elemen[] = [
  {
    nama: 'Bilangan',
    fase: ['E'],
    subElemen: [
      { nama: 'Eksponensial', kelas: [10], bloomTarget: ['C2', 'C3'] },
      { nama: 'Logaritma', kelas: [10], bloomTarget: ['C2', 'C3'] },
      { nama: 'Barisan aritmatika', kelas: [10], bloomTarget: ['C2', 'C3'] },
      { nama: 'Barisan geometri', kelas: [10], bloomTarget: ['C2', 'C3'] },
      { nama: 'Deret aritmatika', kelas: [10], bloomTarget: ['C3', 'C4'] },
      { nama: 'Deret geometri', kelas: [10], bloomTarget: ['C3', 'C4'] },
    ]
  },
  {
    nama: 'Aljabar',
    fase: ['E'],
    subElemen: [
      { nama: 'Persamaan kuadrat', kelas: [10], bloomTarget: ['C2', 'C3'] },
      { nama: 'Fungsi kuadrat', kelas: [10], bloomTarget: ['C3', 'C4'] },
      { nama: 'Grafik fungsi kuadrat', kelas: [10], bloomTarget: ['C3', 'C4'] },
      { nama: 'Pertidaksamaan', kelas: [10], bloomTarget: ['C3', 'C4'] },
      { nama: 'Sistem persamaan linear & kuadrat', kelas: [10], bloomTarget: ['C3', 'C4'] },
      { nama: 'Matriks dasar', kelas: [10], bloomTarget: ['C2', 'C3'] },
      { nama: 'Operasi matriks', kelas: [10], bloomTarget: ['C3', 'C4'] },
    ]
  },
  {
    nama: 'Geometri',
    fase: ['E'],
    subElemen: [
      { nama: 'Trigonometri (sin, cos, tan)', kelas: [10], bloomTarget: ['C2', 'C3'] },
      { nama: 'Aturan sinus', kelas: [10], bloomTarget: ['C3', 'C4'] },
      { nama: 'Aturan cosinus', kelas: [10], bloomTarget: ['C3', 'C4'] },
      { nama: 'Luas segitiga dengan trigonometri', kelas: [10], bloomTarget: ['C3', 'C4'] },
      { nama: 'Persamaan lingkaran', kelas: [10], bloomTarget: ['C3', 'C4'] },
      { nama: 'Garis singgung lingkaran', kelas: [10], bloomTarget: ['C3', 'C4'] },
    ]
  },
  {
    nama: 'Data dan Peluang',
    fase: ['E'],
    subElemen: [
      { nama: 'Statistika (simpangan baku, varians)', kelas: [10], bloomTarget: ['C3', 'C4'] },
      { nama: 'Aturan perkalian', kelas: [10], bloomTarget: ['C2', 'C3'] },
      { nama: 'Permutasi', kelas: [10], bloomTarget: ['C3', 'C4'] },
      { nama: 'Kombinasi', kelas: [10], bloomTarget: ['C3', 'C4'] },
      { nama: 'Peluang kejadian bersyarat', kelas: [10], bloomTarget: ['C4', 'C5'] },
    ]
  }
];

// ==================== FASE F (Kelas 11-12) ====================
const elemenFaseF: Elemen[] = [
  {
    nama: 'Aljabar',
    fase: ['F'],
    subElemen: [
      { nama: 'Polinomial (suku banyak)', kelas: [11, 12], bloomTarget: ['C2', 'C3'] },
      { nama: 'Faktor polinomial', kelas: [11, 12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Identitas polinomial', kelas: [11, 12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Fungsi komposisi', kelas: [11], bloomTarget: ['C3', 'C4'] },
      { nama: 'Fungsi invers', kelas: [11], bloomTarget: ['C3', 'C4'] },
      { nama: 'Fungsi eksponensial lanjut', kelas: [11], bloomTarget: ['C3', 'C4'] },
      { nama: 'Fungsi logaritma lanjut', kelas: [11], bloomTarget: ['C3', 'C4'] },
      { nama: 'Fungsi trigonometri', kelas: [11, 12], bloomTarget: ['C2', 'C3'] },
      { nama: 'Identitas trigonometri', kelas: [11, 12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Persamaan trigonometri', kelas: [11, 12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Pertidaksamaan trigonometri', kelas: [11, 12], bloomTarget: ['C4', 'C5'] },
      { nama: 'Limit fungsi', kelas: [12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Turunan (derivatif)', kelas: [12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Aturan rantai', kelas: [12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Integral tak tentu', kelas: [12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Integral tentu', kelas: [12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Matriks lanjut', kelas: [11, 12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Determinan matriks', kelas: [11, 12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Invers matriks', kelas: [11, 12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Program linear', kelas: [11], bloomTarget: ['C3', 'C4'] },
    ]
  },
  {
    nama: 'Geometri',
    fase: ['F'],
    subElemen: [
      { nama: 'Vektor di bidang datar', kelas: [11, 12], bloomTarget: ['C2', 'C3'] },
      { nama: 'Vektor di ruang', kelas: [11, 12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Operasi vektor', kelas: [11, 12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Pembuktian geometris dengan vektor', kelas: [11, 12], bloomTarget: ['C4', 'C5'] },
      { nama: 'Transformasi geometri lanjut', kelas: [11], bloomTarget: ['C3', 'C4'] },
      { nama: 'Persamaan lingkaran lanjut', kelas: [11, 12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Persamaan elips', kelas: [11, 12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Persamaan parabola', kelas: [11, 12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Persamaan hiperbola', kelas: [11, 12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Garis singgung elips', kelas: [11, 12], bloomTarget: ['C4', 'C5'] },
      { nama: 'Dimensi tiga (jarak)', kelas: [11, 12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Dimensi tiga (sudut)', kelas: [11, 12], bloomTarget: ['C3', 'C4'] },
    ]
  },
  {
    nama: 'Data dan Peluang',
    fase: ['F'],
    subElemen: [
      { nama: 'Variabel diskrit acak', kelas: [12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Fungsi peluang', kelas: [12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Distribusi seragam', kelas: [12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Distribusi binomial', kelas: [12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Distribusi normal', kelas: [12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Nilai harapan', kelas: [12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Uji hipotesis', kelas: [12], bloomTarget: ['C4', 'C5'] },
      { nama: 'Korelasi', kelas: [12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Regresi linear', kelas: [12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Statistika inferensial', kelas: [12], bloomTarget: ['C4', 'C5'] },
    ]
  },
  {
    nama: 'Kalkulus',
    fase: ['F'],
    subElemen: [
      { nama: 'Limit & kontinuitas', kelas: [12], bloomTarget: ['C2', 'C3'] },
      { nama: 'Turunan fungsi polinomial', kelas: [12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Turunan fungsi eksponensial', kelas: [12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Turunan fungsi trigonometri', kelas: [12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Aplikasi turunan (optimasi)', kelas: [12], bloomTarget: ['C4', 'C5'] },
      { nama: 'Aplikasi turunan (laju berubah)', kelas: [12], bloomTarget: ['C4', 'C5'] },
      { nama: 'Aplikasi turunan (garis singgung)', kelas: [12], bloomTarget: ['C4', 'C5'] },
      { nama: 'Integral sebagai anti turunan', kelas: [12], bloomTarget: ['C3', 'C4'] },
      { nama: 'Integral untuk luas daerah', kelas: [12], bloomTarget: ['C4', 'C5'] },
      { nama: 'Integral untuk volume benda putar', kelas: [12], bloomTarget: ['C4', 'C5'] },
      { nama: 'Teorema dasar kalkulus', kelas: [12], bloomTarget: ['C4', 'C5'] },
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

export function validasiElemenFase(elemen: string, fase: Fase): boolean {
  return KISI_MATEMATIKA.some(e => e.nama === elemen && e.fase.includes(fase));
}

export function validasiSubElemen(subElemen: string, elemen: string, fase: Fase): boolean {
  const elemenData = KISI_MATEMATIKA.find(e => e.nama === elemen && e.fase.includes(fase));
  return elemenData?.subElemen.some(se => se.nama === subElemen) || false;
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
      lines.push(`- ${elemen.nama} > ${sub.nama} (Kelas ${sub.kelas.join(', ')}, Fase ${elemen.fase.join(', ')})`);
    });
  });

  return lines.join('\n');
}

export function getBloomTarget(subElemenNama: string): string[] {
  for (const elemen of KISI_MATEMATIKA) {
    const sub = elemen.subElemen.find(s => s.nama === subElemenNama);
    if (sub) return sub.bloomTarget;
  }
  return ['C2', 'C3']; // Default
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

// Statistik
export function getStatistikKisi(): { totalElemen: number; totalSubElemen: number; byFase: Record<string, number> } {
  const byFase: Record<string, number> = {};

  KISI_MATEMATIKA.forEach(elemen => {
    elemen.fase.forEach(f => {
      byFase[f] = (byFase[f] || 0) + elemen.subElemen.length;
    });
  });

  return {
    totalElemen: KISI_MATEMATIKA.length,
    totalSubElemen: KISI_MATEMATIKA.reduce((acc, e) => acc + e.subElemen.length, 0),
    byFase
  };
}

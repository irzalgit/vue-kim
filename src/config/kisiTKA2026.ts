// src/data/kisiTKA.ts
// Kisi TKA Matematika SMA/MA/SMK 2026
// Sumber: Pusat Asesmen Pendidikan - Kemendikdasmen
// https://pusmendik.kemendikdasmen.go.id/tka/

export type LevelKognitif = "L1" | "L2" | "L3";

export interface SubMateriTKA {
  id: string;
  nama: string;
  kompetensi: string;
  cakupan: string[];
  batasan?: string;
  levelKognitif: LevelKognitif[];
}

export interface ElemenTKA {
  id: string;
  nama: string;
  subMateri: SubMateriTKA[];
}

export const kisiTKA: ElemenTKA[] = [
  {
    id: "bilangan",
    nama: "Bilangan",
    subMateri: [
      {
        id: "bilangan-real",
        nama: "Bilangan Real",
        kompetensi:
          "Memahami, mengaplikasikan, dan bernalar untuk menyelesaikan permasalahan terkait bilangan real.",
        cakupan: [
          "Operasi bilangan",
          "Sifat-sifat operasi bilangan",
          "Bilangan rasional",
          "Bilangan irasional",
          "Pangkat",
          "Akar",
          "Notasi ilmiah",
          "Perbandingan",
          "Rasio",
          "Proporsi",
          "Persentase"
        ],
        levelKognitif: ["L1", "L2", "L3"]
      }
    ]
  },

  {
    id: "aljabar",
    nama: "Aljabar",
    subMateri: [
      {
        id: "persamaan-pertidaksamaan",
        nama: "Persamaan dan Pertidaksamaan",
        kompetensi:
          "Memahami, mengaplikasikan, dan bernalar untuk menyelesaikan permasalahan persamaan dan pertidaksamaan.",
        cakupan: [
          "Persamaan linear",
          "Pertidaksamaan linear",
          "Sistem persamaan linear",
          "Persamaan kuadrat",
          "Pertidaksamaan kuadrat",
          "Sistem persamaan",
          "Persamaan dan pertidaksamaan nilai mutlak"
        ],
        levelKognitif: ["L1", "L2", "L3"]
      },

      {
        id: "program-linear",
        nama: "Program Linear",
        kompetensi:
          "Memahami, mengaplikasikan, dan bernalar untuk menyelesaikan permasalahan program linear.",
        cakupan: [
          "Model matematika",
          "Sistem pertidaksamaan linear",
          "Daerah penyelesaian",
          "Nilai optimum",
          "Fungsi objektif",
          "Permasalahan kontekstual"
        ],
        levelKognitif: ["L2", "L3"]
      },

      {
        id: "fungsi",
        nama: "Fungsi",
        kompetensi:
          "Memahami, mengaplikasikan, dan bernalar untuk menyelesaikan permasalahan fungsi.",
        cakupan: [
          "Domain",
          "Kodomain",
          "Range",
          "Representasi fungsi",
          "Grafik fungsi",
          "Fungsi linear",
          "Fungsi kuadrat",
          "Fungsi rasional",
          "Fungsi akar",
          "Fungsi eksponensial",
          "Fungsi logaritma",
          "Fungsi nilai mutlak",
          "Fungsi trigonometri"
        ],
        levelKognitif: ["L1", "L2", "L3"]
      },

      {
        id: "barisan-deret",
        nama: "Barisan dan Deret",
        kompetensi:
          "Memahami, mengaplikasikan, dan bernalar untuk menyelesaikan permasalahan barisan dan deret.",
        cakupan: [
          "Barisan aritmetika",
          "Deret aritmetika",
          "Barisan geometri",
          "Deret geometri",
          "Suku ke-n",
          "Jumlah n suku",
          "Permasalahan kontekstual"
        ],
        levelKognitif: ["L1", "L2", "L3"]
      },

      {
        id: "polinomial",
        nama: "Polinomial",
        kompetensi:
          "Memahami, mengaplikasikan, dan bernalar untuk menyelesaikan permasalahan polinomial.",
        cakupan: [
          "Operasi polinomial",
          "Pemfaktoran polinomial",
          "Nilai polinomial",
          "Teorema faktor",
          "Teorema sisa",
          "Suku sisa"
        ],
        batasan:
          "Orde polinomial maksimum 4 dan koefisien polinomial berupa bilangan real.",
        levelKognitif: ["L1", "L2", "L3"]
      }
    ]
  },

  {
    id: "geometri-pengukuran",
    nama: "Geometri dan Pengukuran",
    subMateri: [
      {
        id: "geometri-bidang",
        nama: "Geometri Bidang",
        kompetensi:
          "Memahami, mengaplikasikan, dan bernalar untuk menyelesaikan permasalahan geometri bidang.",
        cakupan: [
          "Sudut",
          "Segitiga",
          "Segiempat",
          "Lingkaran",
          "Kesebangunan",
          "Kekongruenan",
          "Panjang",
          "Luas"
        ],
        levelKognitif: ["L1", "L2", "L3"]
      },

      {
        id: "geometri-ruang",
        nama: "Geometri Ruang",
        kompetensi:
          "Memahami, mengaplikasikan, dan bernalar untuk menyelesaikan permasalahan geometri ruang.",
        cakupan: [
          "Kedudukan titik, garis, dan bidang",
          "Jarak",
          "Sudut",
          "Bangun ruang",
          "Luas permukaan",
          "Volume"
        ],
        levelKognitif: ["L1", "L2", "L3"]
      },

      {
        id: "transformasi",
        nama: "Transformasi Geometri",
        kompetensi:
          "Memahami, mengaplikasikan, dan bernalar untuk menyelesaikan permasalahan transformasi geometri.",
        cakupan: [
          "Translasi",
          "Refleksi",
          "Rotasi",
          "Dilatasi",
          "Komposisi transformasi",
          "Representasi koordinat"
        ],
        levelKognitif: ["L1", "L2", "L3"]
      },

      {
        id: "vektor",
        nama: "Vektor",
        kompetensi:
          "Memahami, mengaplikasikan, dan bernalar untuk menyelesaikan permasalahan vektor.",
        cakupan: [
          "Vektor pada bidang",
          "Vektor pada ruang",
          "Panjang vektor",
          "Operasi vektor",
          "Komponen vektor",
          "Hubungan antarvektor"
        ],
        batasan: "Komponen vektor maksimum tiga.",
        levelKognitif: ["L1", "L2", "L3"]
      }
    ]
  },

  {
    id: "data-peluang",
    nama: "Data dan Peluang",
    subMateri: [
      {
        id: "statistika",
        nama: "Statistika",
        kompetensi:
          "Memahami, mengaplikasikan, dan bernalar untuk menyelesaikan permasalahan data dan statistika.",
        cakupan: [
          "Tabel data",
          "Diagram",
          "Mean",
          "Median",
          "Modus",
          "Kuartil",
          "Persentil",
          "Jangkauan",
          "Ukuran penyebaran",
          "Interpretasi data"
        ],
        levelKognitif: ["L1", "L2", "L3"]
      },

      {
        id: "kaidah-pencacahan",
        nama: "Kaidah Pencacahan",
        kompetensi:
          "Memahami, mengaplikasikan, dan bernalar untuk menyelesaikan permasalahan pencacahan.",
        cakupan: [
          "Aturan perkalian",
          "Aturan penjumlahan",
          "Permutasi",
          "Kombinasi"
        ],
        levelKognitif: ["L1", "L2", "L3"]
      },

      {
        id: "peluang",
        nama: "Peluang",
        kompetensi:
          "Memahami, mengaplikasikan, dan bernalar untuk menyelesaikan permasalahan peluang.",
        cakupan: [
          "Ruang sampel",
          "Kejadian",
          "Peluang kejadian",
          "Peluang bersyarat",
          "Kejadian saling bebas",
          "Kejadian saling lepas"
        ],
        levelKognitif: ["L1", "L2", "L3"]
      }
    ]
  },

  {
    id: "trigonometri",
    nama: "Trigonometri",
    subMateri: [
      {
        id: "perbandingan-trigonometri",
        nama: "Perbandingan Trigonometri",
        kompetensi:
          "Memahami, mengaplikasikan, dan bernalar untuk menyelesaikan permasalahan trigonometri.",
        cakupan: [
          "Sinus",
          "Kosinus",
          "Tangen",
          "Sudut istimewa",
          "Perbandingan trigonometri pada segitiga siku-siku",
          "Identitas trigonometri",
          "Grafik fungsi trigonometri"
        ],
        levelKognitif: ["L1", "L2", "L3"]
      },

      {
        id: "aturan-sinus-kosinus",
        nama: "Aturan Sinus dan Kosinus",
        kompetensi:
          "Memahami, mengaplikasikan, dan bernalar untuk menyelesaikan permasalahan segitiga.",
        cakupan: [
          "Aturan sinus",
          "Aturan kosinus",
          "Luas segitiga",
          "Permasalahan segitiga"
        ],
        levelKognitif: ["L1", "L2", "L3"]
      }
    ]
  }
];

export const levelKognitifTKA = {
  L1: {
    nama: "Pengetahuan dan Pemahaman",
    proses: [
      "Menghitung",
      "Memahami informasi",
      "Mengelompokkan",
      "Mengidentifikasi"
    ]
  },

  L2: {
    nama: "Aplikasi",
    proses: [
      "Memodelkan",
      "Menerapkan",
      "Menginterpretasikan"
    ]
  },

  L3: {
    nama: "Penalaran",
    proses: [
      "Menganalisis",
      "Memecahkan masalah",
      "Mengevaluasi",
      "Menyimpulkan",
      "Melakukan generalisasi",
      "Menjustifikasi"
    ]
  }
};

export default kisiTKA;
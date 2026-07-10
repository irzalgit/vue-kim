// ============================================================
// Site Configuration
// ============================================================

export interface SiteConfig {
  language: string;
  brandName: string;
}

export const siteConfig: SiteConfig = {
  language: "id",
  brandName: "CBT AI Tutor",
};

// ============================================================
// Navigation
// ============================================================

export interface NavLink {
  label: string;
  href: string;
}

export interface NavigationConfig {
  links: NavLink[];
  ctaText: string;
}

export const navigationConfig: NavigationConfig = {
  links: [
    { label: "Fitur", href: "#fitur" },
    { label: "Simulasi", href: "#simulasi" },
    { label: "Materi", href: "#materi" },
    { label: "Kontak", href: "#footer" },
  ],
  ctaText: "Mulai Belajar",
};

// ============================================================
// Hero
// ============================================================

export interface HeroConfig {
  title: string;
  subtitleLine1: string;
  subtitleLine2: string;
  ctaText: string;
}

export const heroConfig: HeroConfig = {
  title: "CBT AI Tutor",
  subtitleLine1: "Simulasi ujian berbasis komputer dengan bantuan AI untuk siswa SMA kelas X dan XI.",
  subtitleLine2: "Belajar matematika mandiri, kapan saja, di mana saja.",
  ctaText: "Jelajahi Fitur",
};

// ============================================================
// Capabilities (Curriculum section)
// ============================================================

export interface CapabilityItem {
  title: string;
  slug: string;
  description: string;
  image: string;
}

export interface CapabilitiesConfig {
  sectionLabel: string;
  items: CapabilityItem[];
}

export const capabilitiesConfig: CapabilitiesConfig = {
  sectionLabel: "Fitur Utama",
items: [
  {
    title: "TEORI BILANGAN",
    slug: "teori-bilangan",
    description:
      "Pelajari konsep bilangan prima, FPB, KPK, kongruensi, dan teori bilangan melalui latihan interaktif.",
    image: "images/capability-1.jpg",
  },
  {
    title: "ALJABAR",
    slug: "aljabar",
    description:
      "Pelajari persamaan, pertidaksamaan, fungsi, dan bentuk aljabar dengan bantuan AI Tutor.",
    image: "images/capability-2.jpg",
  },
  {
    title: "TRIGONOMETRI",
    slug: "trigonometri",
    description:
      "Pelajari identitas trigonometri, grafik fungsi, serta penyelesaian soal secara bertahap.",
    image: "images/capability-3.jpg",
  },
  {
    title: "GEOMETRI",
    slug: "geometri",
    description:
      "Pelajari bangun datar, bangun ruang, serta geometri analitik dengan pembahasan lengkap.",
    image: "images/capability-3.jpg",
  },
  {
    title: "DATA & PELUANG",
    slug: "data-peluang",
    description:
      "Analisis data, statistika, peluang, dan interpretasi grafik melalui latihan adaptif.",
    image: "images/capability-4.jpg",
  },
],
};

// ============================================================
// Capability Detail (sub-pages)
// ============================================================

export interface CapabilityDetailData {
  title: string;
  subtitle: string;
  paragraphs: string[];
}

export interface CapabilityDetailConfig {
  sectionLabel: string;
  backLinkText: string;
  prevLabel: string;
  nextLabel: string;
  notFoundText: string;
  capabilities: Record<string, CapabilityDetailData>;
}

export const capabilityDetailConfig: CapabilityDetailConfig = {
  sectionLabel: "Fitur",
  backLinkText: "Kembali ke beranda",
  prevLabel: "Sebelumnya",
  nextLabel: "Selanjutnya",
  notFoundText: "Fitur tidak ditemukan.",
  capabilities: {
  "teori-bilangan": {
  title: "Teori Bilangan",
  subtitle: "Dasar-dasar teori bilangan untuk SMA.",
  paragraphs: [
    "Materi mencakup bilangan prima, faktor, kelipatan, FPB, KPK, dan kongruensi.",
    "AI Tutor memberikan pembahasan langkah demi langkah.",
    "Siswa dapat mengerjakan latihan adaptif sesuai kemampuan.",
    "Perkembangan belajar disimpan untuk evaluasi berikutnya.",
  ],
},
"aljabar": {
  title: "Aljabar",
  subtitle: "Pelajari konsep aljabar secara bertahap.",
  paragraphs: [
    "Materi meliputi bentuk aljabar, persamaan, pertidaksamaan, fungsi, dan sistem persamaan.",
    "Soal disusun dari tingkat mudah hingga sulit.",
    "AI Tutor membantu menjelaskan setiap langkah penyelesaian.",
    "Analisis hasil belajar digunakan untuk menentukan materi berikutnya.",
  ],
},
"trigonometri": {
  title: "Trigonometri",
  subtitle: "Pelajari konsep trigonometri secara menyeluruh.",
  paragraphs: [
    "Materi meliputi perbandingan trigonometri, identitas, persamaan, dan grafik fungsi.",
    "Siswa dapat mencoba berbagai variasi soal.",
    "AI Tutor memberikan pembahasan secara rinci.",
    "Hasil latihan dianalisis untuk meningkatkan pemahaman.",
  ],
},
"geometri": {
  title: "Geometri",
  subtitle: "Pelajari geometri bidang dan ruang.",
  paragraphs: [
    "Materi mencakup garis, sudut, segitiga, lingkaran, bangun ruang, dan geometri analitik.",
    "Setiap soal dilengkapi pembahasan lengkap.",
    "AI Tutor membantu memahami konsep secara visual dan logis.",
    "Kemajuan belajar dicatat pada dashboard siswa.",
  ],
},
"data-peluang": {
  title: "Data dan Peluang",
  subtitle: "Statistika dan peluang berbasis latihan interaktif.",
  paragraphs: [
    "Materi meliputi penyajian data, ukuran pemusatan, penyebaran data, dan peluang.",
    "Latihan disusun mengikuti kurikulum SMA.",
    "AI Tutor memberikan penjelasan setiap penyelesaian.",
    "Dashboard menampilkan perkembangan kemampuan siswa.",
  ],
},
  },
};

// ============================================================
// Architecture (CinematicVision section)
// ============================================================

export interface ArchitectureConfig {
  sectionLabel: string;
  videoPath: string;
  title: string;
  description: string;
}

export const architectureConfig: ArchitectureConfig = {
  sectionLabel: "Teknologi",
  videoPath: "/videos/cinematic-vision.mp4",
  title: "Matematika menjadi lebih mudah dengan AI",
  description: "CBT AI Tutor menggabungkan teknologi kecerdasan buatan dengan metodologi pengajaran yang terstruktur. Sistem kami menganalisis pola jawaban siswa, mengidentifikasi area yang perlu perbaikan, dan menghasilkan rencana belajar yang personalisasi untuk setiap individu.",
};

// ============================================================
// Research (AlumniArchives section)
// ============================================================

export interface ResearchProject {
  title: string;
  year: string;
  discipline: string;
  image: string;
}

export interface ResearchConfig {
  sectionLabel: string;
  projects: ResearchProject[];
}

export const researchConfig: ResearchConfig = {
  sectionLabel: "Materi Pelajaran",
  projects: [
    { title: "Kombinatorika", year: "XI", discipline: "PAS - Kombinatorika", image: "images/research-1.jpg" },
    { title: "Geometri Lingkaran", year: "XI", discipline: "PAS - Geometri", image: "images/research-2.jpg" },
    { title: "Barisan dan Deret", year: "X", discipline: "PAS - Deret", image: "images/research-3.jpg" },
    { title: "Statistika", year: "X", discipline: "PAS - Statistik", image: "images/research-4.jpg" },
    { title: "Peluang", year: "X", discipline: "PAS - Peluang", image: "images/research-1.jpg" },
    { title: "Trigonometri", year: "X", discipline: "PAS - Trigonometri", image: "images/research-2.jpg" },
    { title: "Fungsi", year: "X", discipline: "PAS - Fungsi", image: "images/research-3.jpg" },
    { title: "Permutasi", year: "XI", discipline: "PAS - Kombinatorika", image: "images/research-4.jpg" },
  ],
};

// ============================================================
// Footer
// ============================================================

export interface FooterLinkColumn {
  title: string;
  links: string[];
}

export interface FooterBottomLink {
  label: string;
  href: string;
}

export interface FooterConfig {
  heading: string;
  columns: FooterLinkColumn[];
  copyright: string;
  bottomLinks: FooterBottomLink[];
}

export const footerConfig: FooterConfig = {
  heading: "Belajar Matematika Mandiri",
 columns: [
  {
    title: "Fitur",
    links: [
      "Simulasi CBT",
      "AI Tutor",
      "Jadwal Belajar",
      "Analisis Performa",
    ],
  },
  {
    title: "Materi",
    links: [
      "Teori Bilangan",
      "Aljabar",
      "Trigonometri",
      "Geometri",
      "Data & Peluang",
    ],
  },
],
  copyright: "\u00A9 2026 CBT AI Tutor. Semua hak dilindungi.",
  bottomLinks: [
    { label: "Tentang", href: "#" },
    { label: "Kebijakan Privasi", href: "#" },
    { label: "Kontak", href: "#" },
  ],
};

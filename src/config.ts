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
      title: "Simulasi CBT",
      slug: "simulasi-cbt",
      description: "Ujian berbasis komputer dengan 50 soal pilihan ganda, timer countdown, dan navigasi nomor soal yang intuitif untuk persiapan PAS yang optimal.",
      image: "images/capability-1.jpg",
    },
    {
      title: "AI Tutor Cerdas",
      slug: "ai-tutor",
      description: "Dapatkan penjelasan detail dari Gemini AI untuk setiap soal matematika yang sulit, lengkap dengan langkah-langkah penyelesaian yang mudah dipahami.",
      image: "images/capability-2.jpg",
    },
    {
      title: "Jadwal Adaptif",
      slug: "jadwal-adaptif",
      description: "Sistem jadwal belajar yang menyesuaikan dengan performa simulasi, fokus pada topik lemah dan memperkuat topik yang sudah dikuasai.",
      image: "images/capability-3.jpg",
    },
    {
      title: "Analisis Performa",
      slug: "analisis-performa",
      description: "Ringkasan hasil ujian real-time dengan statistik topik kuat dan lemah, progress bar, dan rekomendasi belajar berbasis data.",
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
    "simulasi-cbt": {
      title: "Simulasi CBT",
      subtitle: "Persiapkan diri menghadapi PAS dengan simulasi ujian nyata.",
      paragraphs: [
        "Simulasi CBT AI Tutor menyediakan pengalaman ujian yang mirip dengan Penilaian Akhir Semester (PAS) yang sebenarnya. Dengan 50 soal pilihan ganda per sesi, siswa dapat berlatih dalam kondisi yang mendekati ujian sesungguhnya.",
        "Setiap soal dilengkapi dengan opsi A-E, tombol tandai ragu-ragu, dan navigasi nomor soal yang memudahkan siswa untuk berpindah antar soal. Timer countdown otomatis memberikan pengalaman tekanan waktu yang realistis.",
        "Sistem mendukung dua kelas - Kelas X dan Kelas XI - dengan bank soal yang berbeda. Soal-soal mencakup berbagai topik matematika dari kombinatorika, deret, statistik, hingga geometri lingkaran.",
        "Setelah menyelesaikan simulasi, siswa mendapatkan ringkasan performa lengkap dengan jumlah jawaban benar, salah, waktu yang digunakan, dan rekomendasi topik yang perlu diperkuat.",
      ],
    },
    "ai-tutor": {
      title: "AI Tutor Cerdas",
      subtitle: "Bantuan matematika otomatis dengan kecerdasan buatan.",
      paragraphs: [
        "AI Tutor menggunakan teknologi Gemini AI untuk memberikan penjelasan mendalam pada setiap soal matematika. Siswa cukup menekan tombol bantuan AI dan akan mendapatkan penjelasan langkah demi langkah yang mudah dipahami.",
        "Sistem AI mampu menjelaskan konsep matematika mulai dari dasar hingga tingkat lanjut, termasuk kombinatorika, barisan dan deret, statistika, peluang, dan geometri. Penjelasan disesuaikan dengan tingkat pemahaman siswa.",
        "Fitur Generate Soal Serupa memungkinkan siswa untuk mendapatkan variasi soal dengan tingkat kemiripan yang dapat diatur (50-100%). Ini membantu siswa untuk benar-benar memahami konsep, bukan sekadar menghafal jawaban.",
        "Semua interaksi dengan AI Tutor tersedia dalam Bahasa Indonesia, memastikan tidak ada hambatan bahasa dalam proses belajar. Sistem juga mendukung rendering formula matematika dengan MathJax.",
      ],
    },
    "jadwal-adaptif": {
      title: "Jadwal Belajar Adaptif",
      subtitle: "Rencana belajar yang personalisasi berdasarkan performa.",
      paragraphs: [
        "Setelah menyelesaikan minimal 3 soal, sistem secara otomatis menganalisis performa siswa dan menghasilkan jadwal belajar yang disesuaikan dengan kebutuhan individu. Topik yang masih lemah akan mendapatkan prioritas lebih tinggi.",
        "Jadwal belajar ditampilkan dalam panel yang mudah dibaca, dengan kode warna untuk menandai topik yang perlu perhatian khusus (merah) dan topik yang sudah dikuasai (hijau). Setiap hari memiliki rekomendasi materi yang berbeda.",
        "Sistem dilengkapi dengan statistik real-time yang menunjukkan progress belajar, persentase jawaban benar per topik, dan estimasi waktu yang dibutuhkan untuk menguasai materi tertentu.",
        "Jadwal dapat digenerate secara lokal (offline) atau dengan bantuan AI untuk rekomendasi yang lebih personal dan kontekstual. Data performa disimpan di perangkat untuk menjaga privasi siswa.",
      ],
    },
    "analisis-performa": {
      title: "Analisis Performa",
      subtitle: "Pantau progress belajar dengan dashboard interaktif.",
      paragraphs: [
        "Dashboard analisis menampilkan ringkasan hasil simulasi dalam format yang mudah dipahami. Siswa dapat melihat jumlah soal yang dijawab benar, salah, dan yang belum dijawab dengan visualisasi warna yang jelas.",
        "Sistem secara otomatis mengidentifikasi topik kuat dan topik lemah berdasarkan performa siswa. Informasi ini digunakan untuk memberikan rekomendasi belajar yang tepat sasaran.",
        "Progress bar yang terintegrasi pada setiap sesi simulasi memberikan gambaran real-time tentang seberapa jauh siswa telah menyelesaikan soal. Tombol navigasi soal dengan indikator status (dijawab, ragu-ragu, belum) memudahkan monitoring.",
        "Semua data analisis dapat diakses kapan saja melalui panel jadwal belajar, memungkinkan siswa untuk melacak perkembangan belajar mereka dari waktu ke waktu dan menetapkan target yang realistis.",
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
      links: ["Simulasi CBT", "AI Tutor", "Jadwal Belajar", "Analisis Performa"],
    },
    {
      title: "Materi",
      links: ["Kombinatorika", "Statistika", "Geometri", "Barisan dan Deret"],
    },
  ],
  copyright: "\u00A9 2026 CBT AI Tutor. Semua hak dilindungi.",
  bottomLinks: [
    { label: "Tentang", href: "#" },
    { label: "Kebijakan Privasi", href: "#" },
    { label: "Kontak", href: "#" },
  ],
};

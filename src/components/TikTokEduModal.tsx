import { useMemo, useState } from 'react';
import {
  X,
  ExternalLink,
  Play,
  Sparkles,
  Hash,
  Folder,
  Users,
} from 'lucide-react';
import { getVideoByElemen, KOLEKSI_VIDEO_PAIRZAL, KATALOG_VIDEO_PAIRZAL } from '../data/tiktokVideoCatalog';

// Daftar Akun Kreator Edukasi TikTok yang Relevan
export const AKUN_TIKTOK_EDUKASI = [
  {
    username: '@pairzal',
    nama: 'Pak Rizal (Utama)',
    kategori: 'TKA & Konsep Matematika',
    avatar: '👨‍🏫',
    isPrimary: true,
  },
  {
    username: '@kokbisa',
    nama: 'Kok Bisa?',
    kategori: 'Sains & Matematika Populer',
    avatar: '💡',
    isPrimary: false,
  },
  {
    username: '@ruangguru',
    nama: 'Ruangguru',
    kategori: 'Pembahasan Soal & Trik Cepat',
    avatar: '📚',
    isPrimary: false,
  },
  {
    username: '@pahamify',
    nama: 'Pahamify',
    kategori: 'Bedah Konsep & TPS/TKA',
    avatar: '🎯',
    isPrimary: false,
  },
  {
    username: '@zenius',
    nama: 'Zenius Education',
    kategori: 'Fundamental & Logika Matematika',
    avatar: '🧠',
    isPrimary: false,
  },
  {
    username: '@gurusekitar',
    nama: 'Guru Sekitar',
    kategori: 'Matematika SD, SMP, SMA',
    avatar: '✏️',
    isPrimary: false,
  },
];

interface TikTokEduModalProps {
  isOpen: boolean;
  onClose: () => void;
  materi: string;
  elemen?: string;
  mataPelajaran?: string;
  kelas?: number;
  videoUrl?: string;
  videoTitle?: string;
}

// ============================================================
// BERSIHKAN MATERI
// ============================================================

function bersihkanMateri(text: string = ''): string {
  return text
    // Hapus command LaTeX seperti \frac, \sqrt, \alpha, dll.
    .replace(/\\[a-zA-Z]+/g, ' ')

    // Hapus karakter LaTeX
    .replace(/[$_\\{}^()[\]]/g, ' ')

    // Hapus operator yang tidak diperlukan
    .replace(/[*/+=<>|]/g, ' ')

    // Hapus tanda baca
    .replace(/[.,!?;:"'`~@#%^&]/g, ' ')

    // Rapikan spasi
    .replace(/\s+/g, ' ')

    .trim();
}

// ============================================================
// MEMBUAT HASHTAG
// ============================================================

function buatHashtag(text: string): string {
  const bersih = text
    .replace(/[^a-zA-Z0-9À-ÿ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!bersih) return '';

  return (
    '#' +
    bersih
      .split(' ')
      .filter(Boolean)
      .map(
        (kata) =>
          kata.charAt(0).toUpperCase() + kata.slice(1)
      )
      .join('')
  );
}

// ============================================================
// HAPUS DUPLIKAT
// ============================================================

function hapusDuplikat(tags: string[]): string[] {
  const hasil: string[] = [];
  const sudahAda = new Set<string>();

  tags.forEach((tag) => {
    if (!tag) return;

    const normal = tag.toLowerCase().trim();

    if (!sudahAda.has(normal)) {
      sudahAda.add(normal);
      hasil.push(tag);
    }
  });

  return hasil;
}

// ============================================================
// HASHTAG UMUM EDUKASI MATEMATIKA
// ============================================================

const HASHTAG_UMUM = [
  '#BelajarDiTikTok',
  '#TikTokEdukasi',
  '#Edukasi',
  '#Belajar',
  '#BelajarOnline',
  '#TipsBelajar',
  '#TrikBelajar',
  '#LatihanSoal',
  '#PembahasanSoal',
  '#Soal',
  '#Pelajar',
  '#Siswa',
  '#FYP',
];

// ============================================================
// HASHTAG MATEMATIKA
// ============================================================

const HASHTAG_MATEMATIKA = [
  '#Matematika',
  '#BelajarMatematika',
  '#MatematikaDasar',
  '#MatematikaSMA',
  '#MatematikaSMP',
  '#MatematikaSD',
  '#SoalMatematika',
  '#PembahasanMatematika',
  '#RumusMatematika',
  '#KonsepMatematika',
  '#TrikMatematika',
  '#TipsMatematika',
  '#CaraCepatMatematika',
  '#LatihanMatematika',
  '#BelajarMatematikaMudah',
  '#MatematikaMudah',
  '#MatematikaSeru',
  '#MatematikaIndonesia',
];

// ============================================================
// HASHTAG TKA MATEMATIKA
// ============================================================

const HASHTAG_TKA = [
  '#TKA',
  '#TKAMatematika',
  '#TKA2026',
  '#TKAMatematika2026',
  '#TesKemampuanAkademik',
  '#TesKemampuanAkademikMatematika',
  '#PersiapanTKA',
  '#PersiapanTKAMatematika',
  '#BelajarTKA',
  '#BelajarTKAMatematika',
  '#LatihanTKA',
  '#LatihanTKAMatematika',
  '#SoalTKA',
  '#SoalTKAMatematika',
  '#PembahasanTKA',
  '#PembahasanTKAMatematika',
  '#TryoutTKA',
  '#TryoutTKAMatematika',
  '#SimulasiTKA',
  '#SimulasiTKAMatematika',
  '#TipsTKA',
  '#TipsTKAMatematika',
  '#StrategiTKA',
  '#StrategiTKAMatematika',
  '#TKAIndonesia',
  '#PersiapanUjian',
];

// ============================================================
// HASHTAG TOPIK MATEMATIKA / TKA
// ============================================================

const HASHTAG_TOPIK = [
  '#Bilangan',
  '#Aritmetika',
  '#Aljabar',
  '#Persamaan',
  '#Pertidaksamaan',
  '#PersamaanLinear',
  '#PersamaanKuadrat',
  '#Fungsi',
  '#FungsiLinear',
  '#FungsiKuadrat',
  '#FungsiEksponensial',
  '#FungsiLogaritma',
  '#SistemPersamaan',
  '#SPLDV',
  '#SPLTV',
  '#Eksponen',
  '#Logaritma',
  '#Polinomial',
  '#SukuBanyak',
  '#Barisan',
  '#BarisanAritmetika',
  '#BarisanGeometri',
  '#Deret',
  '#DeretAritmetika',
  '#DeretGeometri',
  '#Geometri',
  '#GeometriAnalitik',
  '#BangunDatar',
  '#BangunRuang',
  '#Lingkaran',
  '#TransformasiGeometri',
  '#Trigonometri',
  '#IdentitasTrigonometri',
  '#PersamaanTrigonometri',
  '#Kalkulus',
  '#Limit',
  '#Turunan',
  '#Integral',
  '#Matriks',
  '#Determinan',
  '#Vektor',
  '#Statistika',
  '#StatistikaDasar',
  '#Mean',
  '#Median',
  '#Modus',
  '#Peluang',
  '#PeluangMatematika',
  '#Kombinatorika',
  '#Permutasi',
  '#Kombinasi',
  '#ProgramLinear',
  '#Optimasi',
  '#GrafikFungsi',
  '#Data',
  '#InterpretasiData',
];

// ============================================================
// HASHTAG TKA BERDASARKAN KETERAMPILAN
// ============================================================

const HASHTAG_KETERAMPILAN = [
  '#PenalaranMatematika',
  '#PenalaranNumerik',
  '#PenalaranLogis',
  '#PemecahanMasalah',
  '#ProblemSolving',
  '#BerpikirKritis',
  '#AnalisisMatematika',
  '#StrategiMengerjakanSoal',
  '#StrategiMenjawabSoal',
  '#CaraCepatMengerjakanSoal',
  '#TrikMengerjakanSoal',
  '#PembahasanSoalTKA',
  '#SoalHOTS',
  '#MatematikaHOTS',
  '#SoalPenalaran',
];

// ============================================================
// HASHTAG BERDASARKAN KELAS
// ============================================================

function buatHashtagKelas(kelas?: number): string[] {
  if (!kelas) return [];

  return [
    `#Kelas${kelas}`,
    `#MatematikaKelas${kelas}`,
    `#BelajarMatematikaKelas${kelas}`,
    `#SoalMatematikaKelas${kelas}`,
    `#LatihanMatematikaKelas${kelas}`,
  ];
}

// ============================================================
// HASHTAG BERDASARKAN MATERI
// ============================================================

function buatHashtagMateri(
  materi: string,
  kelas?: number
): string[] {
  if (!materi) return [];

  const hasil = [
    // Materi langsung
    buatHashtag(materi),

    // Matematika + materi
    buatHashtag(`Matematika ${materi}`),

    // Materi
    buatHashtag(`Materi ${materi}`),

    // Konsep
    buatHashtag(`Konsep ${materi}`),

    // Rumus
    buatHashtag(`Rumus ${materi}`),

    // Soal
    buatHashtag(`Soal ${materi}`),

    // Pembahasan
    buatHashtag(`Pembahasan ${materi}`),

    // Belajar
    buatHashtag(`Belajar ${materi}`),

    // Trik
    buatHashtag(`Trik ${materi}`),

    // Cara cepat
    buatHashtag(`Cara Cepat ${materi}`),

    // TKA
    buatHashtag(`TKA ${materi}`),

    // TKA Matematika
    buatHashtag(`TKA Matematika ${materi}`),
  ];

  if (kelas) {
    hasil.push(
      buatHashtag(`Matematika Kelas ${kelas} ${materi}`),
      buatHashtag(`Soal Kelas ${kelas} ${materi}`)
    );
  }

  return hasil;
}

// ============================================================
// MENCARI TOPIK TKA DARI NAMA MATERI
// ============================================================

function cariHashtagTopik(materi: string): string[] {
  if (!materi) return [];

  const teks = materi.toLowerCase();

  const hasil: string[] = [];

  const keywordTopik: Record<string, string[]> = {
    aljabar: [
      '#Aljabar',
      '#TKAAljabar',
    ],

    fungsi: [
      '#Fungsi',
      '#TKAFungsi',
    ],

    persamaan: [
      '#Persamaan',
      '#TKAPersamaan',
    ],

    pertidaksamaan: [
      '#Pertidaksamaan',
      '#TKAPertidaksamaan',
    ],

    eksponen: [
      '#Eksponen',
      '#TKAEksponen',
    ],

    logaritma: [
      '#Logaritma',
      '#TKALogaritma',
    ],

    barisan: [
      '#Barisan',
      '#TKABarisan',
    ],

    deret: [
      '#Deret',
      '#TKADeret',
    ],

    geometri: [
      '#Geometri',
      '#TKAGeometri',
    ],

    trigonometri: [
      '#Trigonometri',
      '#TKATrigonometri',
    ],

    kalkulus: [
      '#Kalkulus',
      '#TKAKalkulus',
    ],

    limit: [
      '#Limit',
      '#TKALimit',
    ],

    turunan: [
      '#Turunan',
      '#TKATurunan',
    ],

    integral: [
      '#Integral',
      '#TKAIntegral',
    ],

    matriks: [
      '#Matriks',
      '#TKAMatriks',
    ],

    vektor: [
      '#Vektor',
      '#TKAVektor',
    ],

    statistika: [
      '#Statistika',
      '#TKAStatistika',
    ],

    peluang: [
      '#Peluang',
      '#TKAPeluang',
    ],

    kombinatorika: [
      '#Kombinatorika',
      '#TKAKombinatorika',
    ],

    permutasi: [
      '#Permutasi',
      '#TKAPermutasi',
    ],

    kombinasi: [
      '#Kombinasi',
      '#TKAKombinasi',
    ],

    'program linear': [
      '#ProgramLinear',
      '#TKAProgramLinear',
    ],

    polinomial: [
      '#Polinomial',
      '#TKAPolinomial',
    ],

    'persamaan kuadrat': [
      '#PersamaanKuadrat',
      '#TKAPersamaanKuadrat',
    ],

    'fungsi kuadrat': [
      '#FungsiKuadrat',
      '#TKAFungsiKuadrat',
    ],

    lingkaran: [
      '#Lingkaran',
      '#TKALingkaran',
    ],

    'bangun ruang': [
      '#BangunRuang',
      '#TKABangunRuang',
    ],

    'bangun datar': [
      '#BangunDatar',
      '#TKABangunDatar',
    ],
  };

  Object.entries(keywordTopik).forEach(
    ([keyword, hashtags]) => {
      if (teks.includes(keyword)) {
        hasil.push(...hashtags);
      }
    }
  );

  return hasil;
}

// ============================================================
// KOMPONEN UTAMA
// ============================================================

export default function TikTokEduModal({
  isOpen,
  onClose,
  materi,
  elemen,
  mataPelajaran = 'Matematika',
  kelas,
  videoUrl,
  videoTitle,
}: TikTokEduModalProps) {
  const [activeKeyword, setActiveKeyword] =
    useState<string>('');
  const [selectedCreator, setSelectedCreator] =
    useState<string>('@pairzal');

  // ----------------------------------------------------------
  // Bersihkan materi dan elemen
  // ----------------------------------------------------------

  const elemenBersih = useMemo(() => {
    return bersihkanMateri(elemen || '');
  }, [elemen]);

  const queryBersih = useMemo(() => {
    const rawMateri = bersihkanMateri(materi || '');
    if (rawMateri && rawMateri.toLowerCase() !== 'umum' && rawMateri.toLowerCase() !== mataPelajaran.toLowerCase()) {
      return rawMateri;
    }
    return elemenBersih || rawMateri || mataPelajaran;
  }, [materi, elemenBersih, mataPelajaran]);

  // ----------------------------------------------------------
  // Semua hashtag
  // ----------------------------------------------------------

  const semuaHashtag = useMemo(() => {
    const hasil = [
      ...HASHTAG_UMUM,
      ...HASHTAG_MATEMATIKA,
      ...HASHTAG_TKA,
      ...HASHTAG_TOPIK,
      ...HASHTAG_KETERAMPILAN,

      ...buatHashtagKelas(kelas),

      ...buatHashtagMateri(
        queryBersih,
        kelas
      ),

      ...(elemenBersih && elemenBersih !== queryBersih ? buatHashtagMateri(elemenBersih, kelas) : []),

      ...cariHashtagTopik(
        queryBersih
      ),
    ];

    return hapusDuplikat(hasil);
  }, [queryBersih, elemenBersih, kelas]);

  // ----------------------------------------------------------
  // Keyword pencarian utama (langsung fokus ke elemen/materi & tagar)
  // ----------------------------------------------------------

  const searchKeyword = useMemo(() => {
    const creatorPrefix = selectedCreator === 'all' ? '' : selectedCreator;

    if (activeKeyword) {
      if (creatorPrefix && !activeKeyword.includes('@')) {
        return `${creatorPrefix} ${activeKeyword}`;
      }
      return activeKeyword;
    }

    // Prioritaskan nama elemen/materi spesifik (contoh: "Aljabar", "Bilangan Real", "Geometri")
    const keywordUtama = [
      elemenBersih && elemenBersih.toLowerCase() !== 'umum' ? elemenBersih : '',
      queryBersih && queryBersih !== elemenBersih ? queryBersih : '',
    ]
      .filter(Boolean)
      .join(' ') || queryBersih || mataPelajaran;

    const tagElemen = elemenBersih ? buatHashtag(elemenBersih) : '';
    const tagMateri = buatHashtag(queryBersih);

    return [
      creatorPrefix,
      keywordUtama,
      tagElemen,
      tagMateri !== tagElemen ? tagMateri : '',
      '#TKAMatematika',
      kelas ? `#Kelas${kelas}` : '',
    ]
      .filter(Boolean)
      .join(' ');
  }, [
    activeKeyword,
    selectedCreator,
    elemenBersih,
    queryBersih,
    mataPelajaran,
    kelas,
  ]);

  // ----------------------------------------------------------
  // Hashtag prioritas untuk pencarian
  // ----------------------------------------------------------

  const hashtagPencarian = useMemo(() => {
    const hasil = [
      '#TKAMatematika',
      '#TKA2026',
    ];

    if (queryBersih) {
      hasil.push(
        buatHashtag(queryBersih)
      );
    }

    if (kelas) {
      hasil.push(
        `#Kelas${kelas}`
      );
    }

    const topik = cariHashtagTopik(
      queryBersih
    );

    hasil.push(...topik);

    return hapusDuplikat(hasil)
      .slice(0, 4)
      .join(' ');
  }, [
    queryBersih,
    kelas,
  ]);

  // ----------------------------------------------------------
  // URL TikTok (langsung jalankan pencarian query & tagar)
  // ----------------------------------------------------------

  const tiktokSearchUrl = useMemo(() => {
    // Gunakan keyword pencarian utama yang ringkas dan langsung to the point
    const query = searchKeyword || `@pairzal ${queryBersih || 'Matematika'} #TKAMatematika`;

    return (
      'https://www.tiktok.com/search?q=' +
      encodeURIComponent(query.trim())
    );
  }, [
    searchKeyword,
    queryBersih,
  ]);

  // Jangan tampilkan modal jika tidak aktif
  if (!isOpen) return null;

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >

      <div
        className="bg-gray-900 border border-pink-500/30 rounded-2xl w-full max-w-xl text-white relative shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) =>
          e.stopPropagation()
        }
      >

        {/* ===================================================
            HEADER
        ==================================================== */}

        <div className="p-5 bg-gradient-to-r from-gray-900 via-gray-800 to-black border-b border-gray-800 flex items-center justify-between">

          <div className="flex items-center gap-3">

            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00f2fe] via-[#fe0979] to-[#ff0050] flex items-center justify-center shadow-lg">

              <Play
                className="text-white fill-white ml-0.5"
                size={18}
              />

            </div>

            <div>

              <h3 className="text-lg font-bold text-white flex items-center gap-1.5">

                Video Edukasi TikTok

                <span className="text-[10px] px-2 py-0.5 rounded-full bg-pink-500/20 text-pink-300 border border-pink-500/30 font-medium">
                  #BelajarDiTikTok
                </span>

              </h3>

              <p className="text-xs text-gray-400">

                Topik:{' '}

                <span className="text-cyan-300 font-semibold">
                  {queryBersih ||
                    'Matematika'}
                </span>

                {kelas && (
                  <span className="text-gray-500">
                    {' '}• Kelas {kelas}
                  </span>
                )}

              </p>

            </div>

          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-800 text-gray-400 hover:text-white transition"
            aria-label="Tutup"
          >
            <X size={20} />
          </button>

        </div>

        {/* ===================================================
            ISI MODAL
        ==================================================== */}

        <div className="p-6 space-y-5 overflow-y-auto flex-1">

          {/* INFO */}

          <div className="p-4 rounded-xl bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-cyan-500/10 border border-pink-500/20 text-sm">

            <div className="flex items-center gap-2 text-pink-300 font-semibold mb-1">

              <Sparkles size={16} />

              <span>
                Video Edukasi Matematika & TKA
              </span>

            </div>

            <p className="text-xs text-gray-300 leading-relaxed">
              Temukan video pembelajaran, pembahasan soal konsep, rumus, trik cepat, dan strategi mengerjakan soal TKA Matematika dari akun @pairzal.
            </p>
          </div>
          {/* =================================================
              DAFTAR VIDEO POSTINGAN & KOLEKSI @PAIRZAL
          ================================================== */}
          <div className="p-4 rounded-xl bg-gray-950/80 border border-pink-500/30 space-y-4">
            
            {/* 1. POSTINGAN SPESIFIK MATERI / SOAL */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-pink-400 flex items-center gap-1.5">
                  <Play size={14} className="text-pink-400" />
                  Video Postingan Soal
                </span>
                <span className="text-[10px] bg-green-500/20 text-green-300 px-2 py-0.5 rounded-full font-semibold border border-green-500/30">
                  Direct Post
                </span>
              </div>

              {(() => {
                const videoData = getVideoByElemen(elemenBersih || queryBersih);
                const postNum = videoData ? `#${videoData.id}` : '#51';
                const finalTitle = videoTitle || (videoData ? videoData.judul : 'Video Pembahasan Soal TKA Matematika #51');
                const finalUrl = videoUrl || (videoData && videoData.directUrl ? videoData.directUrl : 'https://vt.tiktok.com/ZSVwdD4o9/');
                const finalTags = videoData ? videoData.tags : '#TKAMatematika #pairzal';

                return (
                  <div className="p-3 bg-gray-900 border border-green-500/40 rounded-xl flex items-center justify-between gap-3 hover:border-green-400 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-extrabold bg-green-900/60 text-green-300 px-1.5 py-0.5 rounded border border-green-500/40">
                          POST {postNum}
                        </span>
                        <div className="text-sm font-semibold text-white">
                          {finalTitle}
                        </div>
                      </div>
                      <div className="text-xs text-green-400 mt-0.5 font-mono">
                        {finalTags}
                      </div>
                    </div>
                    <a
                      href={finalUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3.5 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-lg shadow-green-600/30 whitespace-nowrap"
                    >
                      <Play size={13} fill="white" />
                      Putar Video
                    </a>
                  </div>
                );
              })()}
            </div>

            {/* 2. KOLEKSI / PLAYLIST MATEMATIKA @PAIRZAL */}
            <div className="border-t border-gray-800 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1.5">
                  <Folder size={14} className="text-cyan-400" />
                  Koleksi / Playlist Video @pairzal
                </span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full font-semibold border border-cyan-500/30">
                  {KOLEKSI_VIDEO_PAIRZAL.length} Koleksi
                </span>
              </div>

              <div className="space-y-2.5">
                {KOLEKSI_VIDEO_PAIRZAL.map((kol) => {
                  const targetVideo = KATALOG_VIDEO_PAIRZAL[kol.targetPostId];
                  const urlTarget = targetVideo?.directUrl || `https://www.tiktok.com/search?q=${encodeURIComponent(`@pairzal ${kol.nama}`)}`;
                  const postLabel = `POST #${kol.targetPostId}`;
                  const tagsLabel = targetVideo?.tags || `#${kol.id} #TKAMatematika #pairzal`;

                  return (
                    <div
                      key={kol.id}
                      className="p-3 bg-gray-900/90 border border-gray-800 hover:border-cyan-500/50 rounded-xl transition flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-extrabold bg-cyan-950 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-700/50">
                            {postLabel}
                          </span>
                          <span className="text-xs font-semibold text-white truncate">
                            {kol.nama}
                          </span>
                        </div>
                        <div className="text-[11px] text-gray-400 truncate mb-0.5">
                          {kol.deskripsi}
                        </div>
                        <div className="text-[10px] text-cyan-400 font-mono">
                          {tagsLabel}
                        </div>
                      </div>

                      <a
                        href={urlTarget}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3.5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-md shadow-cyan-900/40 whitespace-nowrap shrink-0 transition"
                      >
                        <Play size={12} fill="white" />
                        Putar Video
                      </a>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. PEMILIH AKUN KREATOR TIKTOK EDUKASI (MULTI-AKUN) */}
            <div className="border-t border-gray-800 pt-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-pink-400 flex items-center gap-1.5">
                  <Users size={14} className="text-pink-400" />
                  Pilih Akun TikTok Edukasi
                </span>
                <span className="text-[10px] bg-pink-500/20 text-pink-300 px-2 py-0.5 rounded-full font-semibold border border-pink-500/30">
                  {AKUN_TIKTOK_EDUKASI.length} Akun
                </span>
              </div>

              {/* Dropdown & Pilihan Cepat Kreator */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <select
                    value={selectedCreator}
                    onChange={(e) => setSelectedCreator(e.target.value)}
                    className="flex-1 bg-gray-900 border border-pink-500/40 text-white text-xs rounded-lg px-3 py-2 focus:outline-none focus:border-pink-400 font-semibold"
                  >
                    {AKUN_TIKTOK_EDUKASI.map((akun) => (
                      <option key={akun.username} value={akun.username}>
                        {akun.avatar} {akun.username} - {akun.nama} ({akun.kategori})
                      </option>
                    ))}
                    <option value="all">🔍 Semua Akun TikTok (Pencarian Global)</option>
                  </select>

                  <a
                    href={
                      selectedCreator === 'all'
                        ? `https://www.tiktok.com/search?q=${encodeURIComponent(`${queryBersih || 'Matematika'} ${kelas ? `Kelas ${kelas}` : ''} #TKAMatematika`.trim())}`
                        : `https://www.tiktok.com/${selectedCreator}?q=${encodeURIComponent(`${queryBersih || 'Matematika'} ${kelas ? `Kelas ${kelas}` : ''}`.trim())}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 bg-gradient-to-r from-pink-600 to-rose-600 hover:from-pink-500 hover:to-rose-500 text-white text-xs font-bold rounded-lg flex items-center gap-1 shrink-0 shadow-md shadow-pink-900/40"
                  >
                    <ExternalLink size={12} />
                    Buka Profil
                  </a>
                </div>

                {/* Badge tombol pilihan cepat akun */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {AKUN_TIKTOK_EDUKASI.map((akun) => {
                    const isSelected = selectedCreator === akun.username;
                    return (
                      <button
                        key={akun.username}
                        type="button"
                        onClick={() => setSelectedCreator(akun.username)}
                        className={`text-[11px] px-2.5 py-1 rounded-md border flex items-center gap-1 transition ${
                          isSelected
                            ? 'bg-pink-600 text-white border-pink-400 font-bold shadow-sm'
                            : 'bg-gray-900/90 text-gray-300 border-gray-800 hover:border-gray-600 hover:text-white'
                        }`}
                      >
                        <span>{akun.avatar}</span>
                        <span>{akun.username}</span>
                      </button>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setSelectedCreator('all')}
                    className={`text-[11px] px-2.5 py-1 rounded-md border flex items-center gap-1 transition ${
                      selectedCreator === 'all'
                        ? 'bg-cyan-600 text-white border-cyan-400 font-bold shadow-sm'
                        : 'bg-gray-900/90 text-gray-300 border-gray-800 hover:border-gray-600 hover:text-white'
                    }`}
                  >
                    <span>🔍</span>
                    <span>Semua Akun</span>
                  </button>
                </div>
              </div>
            </div>

          </div>

          {/* =================================================
              TOPIK
          ================================================== */}

          <div className="p-4 rounded-xl bg-gray-800/50 border border-gray-700">

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">

              <div>

                <div className="text-[10px] text-gray-500 uppercase">
                  Mata Pelajaran
                </div>

                <div className="text-sm font-semibold text-cyan-300">
                  Matematika
                </div>

              </div>

              <div>

                <div className="text-[10px] text-gray-500 uppercase">
                  Materi
                </div>

                <div className="text-sm font-semibold text-pink-300">
                  {queryBersih || '-'}
                </div>

              </div>

              <div>

                <div className="text-[10px] text-gray-500 uppercase">
                  Kelas
                </div>

                <div className="text-sm font-semibold text-purple-300">
                  {kelas || '-'}
                </div>

              </div>

            </div>

          </div>

          {/* =================================================
              HASHTAG
          ================================================== */}

          <div>

            <label className="text-xs font-semibold text-gray-400 block mb-2 flex items-center gap-1.5">

              <Hash
                size={14}
                className="text-cyan-400"
              />

              <span>
                Hashtag Matematika & TKA
              </span>

            </label>

            <div className="flex flex-wrap gap-2">

              {semuaHashtag.map(
                (tag, idx) => {

                  const aktif =
                    activeKeyword === tag ||
                    (
                      !activeKeyword &&
                      idx === 0
                    );

                  return (
                    <button
                      key={`${tag}-${idx}`}
                      type="button"
                      onClick={() => {

                        setActiveKeyword(
                          activeKeyword === tag
                            ? ''
                            : tag
                        );

                      }}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition ${
                        aktif
                          ? 'bg-pink-600/30 text-pink-200 border-pink-500/60 font-semibold'
                          : 'bg-gray-800 text-gray-400 border-gray-700 hover:text-white hover:border-gray-600'
                      }`}
                    >
                      {tag}
                    </button>
                  );

                }
              )}

            </div>

          </div>

          {/* =================================================
              KEYWORD
          ================================================== */}

          <div className="p-4 rounded-xl bg-gray-950 border border-gray-800">

            <div className="text-[10px] text-gray-500 uppercase mb-1">
              Fokus pencarian TikTok
            </div>

            <div className="text-sm text-cyan-300 font-mono break-words">
              {searchKeyword}
            </div>

          </div>

          {/* =================================================
              HASHTAG PENCARIAN
          ================================================== */}

          <div className="p-4 rounded-xl bg-gray-950 border border-gray-800">

            <div className="text-[10px] text-gray-500 uppercase mb-2">
              Hashtag yang digunakan
            </div>

            <div className="text-xs text-pink-300 leading-relaxed break-words">
              {hashtagPencarian}
            </div>

          </div>

          {/* =================================================
              ACTION
          ================================================== */}

          <div className="p-5 rounded-xl bg-black/40 border border-gray-800 flex flex-col items-center text-center space-y-3">

            <div className="text-3xl">
              🎬
            </div>

            <div>

              <div className="text-sm font-semibold text-white">
                Cari & Putar Video Materi
              </div>

              <div className="text-xs text-cyan-400 font-mono mt-1 break-words">
                {searchKeyword}
              </div>

            </div>

            <a
              href={tiktokSearchUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#fe0979] to-[#ff0050] hover:opacity-95 text-white font-bold text-sm shadow-lg shadow-pink-500/25 transition-transform hover:scale-[1.02]"
            >

              <span>
                Buka Video di TikTok
              </span>

              <ExternalLink size={16} />

            </a>

          </div>

          {/* =================================================
              SEMUA HASHTAG
          ================================================== */}

          <details className="rounded-xl bg-gray-950 border border-gray-800">

            <summary className="cursor-pointer px-4 py-3 text-xs font-semibold text-gray-400 hover:text-white">

              Tampilkan semua hashtag

            </summary>

            <div className="px-4 pb-4">

              <div className="text-xs text-gray-500 mb-2">

                {semuaHashtag.length} hashtag tersedia

              </div>

              <div className="text-xs text-gray-300 leading-relaxed break-words">

                {semuaHashtag.join(' ')}

              </div>

            </div>

          </details>

        </div>

        {/* ===================================================
            FOOTER
        ==================================================== */}

        <div className="p-4 bg-gray-950/60 border-t border-gray-800 flex justify-end">

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-400 hover:text-white transition"
          >
            Tutup
          </button>

        </div>

      </div>

    </div>
  );
}
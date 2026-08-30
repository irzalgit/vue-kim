// src/pages/SoalPage.tsx
import { useState, useEffect, useCallback, useRef } from 'react';
import './SoalPage.css';
import { generateRaport } from '../agent/raport';
import { generateSoalAdaptif, type SoalItemGenerated } from '../agent/generateSoal';
import {
  getDaftarTopikRotasi,
  type SelectedItem,
  type TopikRotasi,
} from '../agent/generateSoalWithChecklist';
import { QUOTA_EXCEEDED_ERROR } from '../agent/providers/gemini';
import { usePayment } from '../App';
import {
  getRiwayat,
  tambahRiwayat,
  type RiwayatEntry,
  type DetailSoalEntry,
} from '../utils/riwayat';
import katex from 'katex';
import 'katex/dist/katex.min.css';
import { getSoalFromBank, saveSoalToBank } from '../utils/soalCache';
import Certificate from '../components/Certificate';
import { bersihkanPrefixPilihan } from '../services/soal-generator/parser';

// Skor minimum (dalam %) supaya siswa berhak mendapatkan sertifikat.
const AMBANG_NILAI_SERTIFIKAT = 75;

// Helper fungsi escapeHtml, renderLatex, isFormulaMurni, normalisasiTeksSoal tetap sama...
function escapeHtml(str: string): string {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function renderLatex(teks: string): string {
  if (!teks) return '';
  try {
    const regex = /(\$\$[\s\S]*?\$\$|\$[^$]*?\$)/g;
    const bagian = teks.split(regex);
    return bagian.map((bag) => {
      if (!bag) return '';
      if (bag.startsWith('$$') && bag.endsWith('$$')) {
        return katex.renderToString(bag.slice(2, -2).trim(), { throwOnError: false, displayMode: true, trust: true, strict: false });
      }
      if (bag.startsWith('$') && bag.endsWith('$')) {
        return katex.renderToString(bag.slice(1, -1).trim(), { throwOnError: false, displayMode: false, trust: true, strict: false });
      }
      return escapeHtml(bag).replace(/\n/g, '<br/>');
    }).join('');
  } catch {
    return escapeHtml(teks);
  }
}

function isFormulaMurni(teks: string): boolean {
  const punyaCommandLatex = /\\[a-zA-Z]+/.test(teks);
  const jumlahKata = teks.trim().split(/\s+/).length;
  const adaKataKalimat = /\b(yang|adalah|berapa|jika|maka|dengan|dari|nilai|hitunglah|tentukan|berikut|manakah|apa|sebuah|di|ke|pada|untuk|dan|atau)\b/i.test(teks);
  if (adaKataKalimat) return false;
  const hanyaKarakterMatematis = /^[\d\s+\-*/=.,()^_{}\\a-zA-Z<>≤≥±√π%]+$/.test(teks);
  if (punyaCommandLatex && jumlahKata <= 8) return true;
  if (!punyaCommandLatex && hanyaKarakterMatematis && jumlahKata <= 6) return true;
  return false;
}

function normalisasiTeksSoal(teks: string): string {
  if (!teks) return '';
  if (teks.includes('\\begin{') || teks.includes('$')) return teks;
  if (isFormulaMurni(teks)) return `$${teks}$`;

  // Teks campuran (kalimat + rumus inline): bungkus hanya token yang
  // terlihat seperti LaTeX (mengandung backslash command, {, }, ^, atau _)
  // dengan $...$, biarkan kalimat biasa di sekitarnya apa adanya.
  const isMathToken = (t: string) => /\\[a-zA-Z]+|[{}^_]/.test(t);
  const tokens = teks.split(/(\s+)/);
  let hasil = '';
  let bufferRumus = '';

  const flushBuffer = () => {
    if (bufferRumus) {
      hasil += `$${bufferRumus}$`;
      bufferRumus = '';
    }
  };

  for (const tok of tokens) {
    if (/^\s+$/.test(tok)) {
      flushBuffer();
      hasil += tok;
    } else if (isMathToken(tok)) {
      bufferRumus += tok;
    } else {
      flushBuffer();
      hasil += tok;
    }
  }
  flushBuffer();

  return hasil;
}

// Bentuk soal mentah yang dikembalikan backend /api/generate-soal (lihat
// generateSoalTool di src/mcp/tools/generateSoal.ts). Dibuat longgar (semua
// field opsional selain yang esensial) supaya perubahan kecil di format
// backend tidak langsung membuat parsing gagal total.
interface SoalDariBackend {
  pertanyaan: string;
  pilihan: string[];
  jawaban_benar: string;
  elemen?: string;
  subElemen?: string;
  subSubElemen?: string;
  fase?: string;
  kelas?: number;
  taxonomiBloom?: string;
}

// Panggil backend Express (api-server.ts) yang membungkus generateSoalTool.
// Ini memindahkan pemanggilan LLM ke server, sehingga:
// - API key provider (Gemini/dst) tidak perlu ter-expose ke browser
// - Tidak tergantung fetch langsung dari HP/browser ke API eksternal
// Base URL diambil dari VITE_API_URL (lihat .env), fallback ke localhost:3000
// kalau env var itu tidak diset.
async function fetchSoalDariBackend(
  mataPelajaran: string,
  jumlahSoal: number
): Promise<SoalItemGenerated[]> {
  const apiUrl = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:3000';

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/generate-soal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mataPelajaran, jumlahSoal }),
    });
  } catch (errNetwork) {
    throw new Error(
      `Tidak bisa menghubungi backend di ${apiUrl}. Pastikan 'npm run api' sedang berjalan dan URL-nya benar. (${errNetwork instanceof Error ? errNetwork.message : String(errNetwork)})`
    );
  }

  if (!response.ok) {
    const errBody = await response.json().catch(() => ({} as { error?: string }));
    throw new Error(errBody?.error || `Backend API error: ${response.status}`);
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error('Format respons backend tidak sesuai (bukan array soal).');
  }

  // Normalisasi field opsional supaya cocok dengan tipe SoalItemGenerated
  // yang dipakai di tempat lain (lib client-side AI generation).
  return (data as SoalDariBackend[]).map((s) => ({
    pertanyaan: s.pertanyaan,
    pilihan: s.pilihan,
    jawaban_benar: s.jawaban_benar,
    elemen: s.elemen || '',
    subElemen: s.subElemen || '',
    subSubElemen: s.subSubElemen || '',
    fase: s.fase || '',
    kelas: s.kelas ?? 0,
    taxonomiBloom: s.taxonomiBloom || '',
  })) as SoalItemGenerated[];
}

// Generate soal per-topik dengan ROTASI yang sama rumusnya dengan yang
// dipakai di SoalGeneratorWithChecklist.tsx: total soal = jumlahSesi x
// jumlahSoalPerSesi, dikelompokkan per topik hasil rotasi (round-robin,
// wrap-around kalau jumlahSesi > jumlah topik tercentang). Beda dengan
// SoalGeneratorWithChecklist yang generate 1 soal per panggilan LLM, di
// sini setiap "slot" langsung minta `jumlahSoalPerSesi` soal dalam SATU
// panggilan (lebih efisien untuk pola load-semua-di-awal ala SoalPage),
// dengan riwayat pertanyaan per topik tetap dilacak supaya slot berikutnya
// untuk topik yang sama (saat wrap-around) tidak mengulang soal yang sama.
async function buatSoalDariTopikRotasi(
  selectedItems: SelectedItem[],
  mataPelajaran: string,
  jumlahSesi: number,
  jumlahSoalPerSesi: number
): Promise<SoalItemGenerated[]> {
  const rotasi: TopikRotasi[] = getDaftarTopikRotasi(selectedItems);
  if (rotasi.length === 0) return [];

  const riwayatPerTopik: Record<string, string[]> = {};
  const hasil: SoalItemGenerated[] = [];

  for (let slot = 0; slot < jumlahSesi; slot++) {
    const topik = rotasi[slot % rotasi.length];
    const riwayatTopikIni = riwayatPerTopik[topik.id] || [];
    const fokusSubSubElemen = topik.isSubSubElemen ? topik.namaFokus : undefined;

    // 1. Cek ketersediaan di Bank Soal Lokal
    let soalDariBank: SoalItemGenerated[] = [];
    try {
      const bankItems = await getSoalFromBank(topik.id, jumlahSoalPerSesi * 3);
      soalDariBank = bankItems.filter((s) => !riwayatTopikIni.includes(s.pertanyaan));
    } catch (e) {
      console.warn('[buatSoalDariTopikRotasi] Gagal membaca bank cache:', e);
    }

    if (soalDariBank.length >= jumlahSoalPerSesi) {
      const terpilih = soalDariBank.slice(0, jumlahSoalPerSesi);
      riwayatPerTopik[topik.id] = [
        ...riwayatTopikIni,
        ...terpilih.map((s) => s.pertanyaan),
      ];
      hasil.push(...terpilih);
      continue;
    }

    // 2. Jika di bank soal belum mencukupi, generate sisa kekurangan dengan AI
    const sisaButuh = jumlahSoalPerSesi - soalDariBank.length;
    try {
      const soalBatch = await generateSoalAdaptif(
        mataPelajaran,
        sisaButuh > 0 ? sisaButuh : jumlahSoalPerSesi,
        {},
        undefined,
        'sampai',
        undefined,
        undefined,
        [topik.namaFokus],
        riwayatTopikIni,
        fokusSubSubElemen,
        topik.kelasValid
      );

      // Simpan soal baru yang dibuat AI ke Bank Soal lokal
      saveSoalToBank(topik.id, soalBatch).catch((err) =>
        console.warn('[buatSoalDariTopikRotasi] Gagal simpan ke cache bank soal:', err)
      );

      const gabungan = [...soalDariBank, ...soalBatch].slice(0, jumlahSoalPerSesi);
      riwayatPerTopik[topik.id] = [
        ...riwayatTopikIni,
        ...gabungan.map((s) => s.pertanyaan),
      ];
      hasil.push(...gabungan);
    } catch (err) {
      console.error(`[buatSoalDariTopikRotasi] Gagal generate untuk topik "${topik.konteksLengkap}":`, err);
      if (soalDariBank.length > 0) {
        hasil.push(...soalDariBank);
      }
    }
  }

  return hasil;
}

interface SoalData {
  judul: string;
  kode: string;
  waktu: number;
  soal: {
    pertanyaan: string;
    pilihan: string[];
    jawaban_benar: string | string[];
    tipeSoal?: 'single' | 'multi';
    elemen: string;
    fase: string;
    taxonomiBloom: string;
    kelas?: number;
    subElemen?: string;
    subSubElemen?: string;
    sumber?: 'ai' | 'statis';
    model?: string;
  }[];
}

interface SoalPageProps {
  kodeSoal: string;
  selectedItems?: SelectedItem[];
  jumlahSesi?: number;
  jumlahSoalPerSesi?: number;
  customSoal?: any[];
  customJudul?: string;
  onKembali: () => void;
}

export default function SoalPage({
  kodeSoal,
  selectedItems = [],
  jumlahSesi = 10,
  jumlahSoalPerSesi = 1,
  customSoal,
  customJudul,
  onKembali,
}: SoalPageProps) {
  const { triggerPayment } = usePayment();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [judul, setJudul] = useState<string>('');
  const [soalList, setSoalList] = useState<SoalData['soal']>([]);
  const [jawaban, setJawaban] = useState<string[]>([]);
  const [waktu, setWaktu] = useState<number>(5400);
  const [raport, setRaport] = useState<string | null>(null);
  const [analisisLoading, setAnalisisLoading] = useState<boolean>(false);
  const [analisisError, setAnalisisError] = useState<string>('');
  const [nilaiAkhir, setNilaiAkhir] = useState<number | null>(null);
  const [showCertificate, setShowCertificate] = useState<boolean>(false);
  const [showKonfirmasiRaportModal, setShowKonfirmasiRaportModal] = useState<boolean>(false);

  const [loadingMessage, setLoadingMessage] = useState<string>('Memuat soal...');

  // ==================== MUAT SOAL ====================
  const muatSoal = useCallback(async () => {
    setLoading(true);
    setLoadingMessage('Memuat soal...');

    try {
      // JIKA MEMAKAI SOAL LANGSUNG DARI FIREBASE (/soal_mapel)
      if (customSoal && customSoal.length > 0) {
        const title = customJudul || 'Simulasi MAPEL (Firebase Realtime)';
        setJudul(title);
        setWaktu(customSoal.length * 90); // 1.5 menit per soal

        const formatSoal = customSoal.map((s: any) => {
          const rawPilihan = Array.isArray(s.pilihan) ? s.pilihan : [];
          const cleanPilihan = rawPilihan.map((p: string) => bersihkanPrefixPilihan(p));
          const rawJawaban = s.jawaban_benar || (rawPilihan.length > 0 ? rawPilihan[0] : '');
          let cleanJawaban: string | string[];
          if (Array.isArray(rawJawaban)) {
            cleanJawaban = rawJawaban.map((j: string) => {
              const jc = bersihkanPrefixPilihan(j);
              const idx = rawPilihan.findIndex((p: string) => p === j || bersihkanPrefixPilihan(p) === jc);
              return idx !== -1 ? cleanPilihan[idx] : jc;
            });
          } else {
            const jc = bersihkanPrefixPilihan(rawJawaban);
            const idx = rawPilihan.findIndex((p: string) => p === rawJawaban || bersihkanPrefixPilihan(p) === jc);
            cleanJawaban = idx !== -1 ? cleanPilihan[idx] : jc;
          }

          return {
            pertanyaan: normalisasiTeksSoal(s.pertanyaan || ''),
            pilihan: cleanPilihan.map(normalisasiTeksSoal),
            jawaban_benar: Array.isArray(cleanJawaban)
              ? cleanJawaban.map(normalisasiTeksSoal)
              : normalisasiTeksSoal(cleanJawaban as string),
            elemen: s.elemen || s.mapel || s.topik || 'Umum',
            subElemen: s.subElemen || s.topik || '',
            subSubElemen: s.subSubElemen || '',
            fase: s.fase || 'F',
            taxonomiBloom: s.taxonomiBloom || 'C3',
            kelas: s.kelas ?? 12,
            sumber: 'firebase' as any,
          };
        });

        setSoalList(formatSoal);
        setJawaban(new Array(formatSoal.length).fill(''));
        setLoading(false);
        return;
      }
      let response: Response | null = null;
      const candidates = [
        `data/soal-${kodeSoal}.json`,
        `./data/soal-${kodeSoal}.json`,
        `/data/soal-${kodeSoal}.json`,
        `${import.meta.env.BASE_URL || ''}data/soal-${kodeSoal}.json`.replace(/\/{2,}/g, '/'),
      ];

      for (const url of candidates) {
        try {
          const res = await fetch(url);
          if (res.ok) {
            response = res;
            break;
          }
        } catch {
          // Lanjut ke URL berikutnya
        }
      }

      if (!response || !response.ok) {
        throw new Error(`[TAHAP: fetch JSON] File soal 'soal-${kodeSoal}.json' tidak dapat diakses atau tidak ditemukan.`);
      }

      let data: SoalData;
      try {
        data = await response.json();
      } catch (errParse) {
        console.error('[muatSoal] GAGAL DI TAHAP: parse JSON', errParse);
        throw new Error(`[TAHAP: parse JSON] ${errParse instanceof Error ? errParse.message : String(errParse)}`);
      }
      setJudul(data.judul);
      setWaktu(data.waktu * 60);
      
      const riwayat = getRiwayat(data.judul);
      const sesiSaatIni = riwayat.length + 1;

      // Total soal keseluruhan = jumlahSesi x jumlahSoalPerSesi (sama rumus
      // dengan SoalGeneratorWithChecklist). Kalau parent belum mengirim
      // prop ini, default 10 x 1 = 10, sama seperti perilaku lama.
      const jumlahSesiValid = Math.max(1, Math.min(50, Math.round(jumlahSesi) || 10));
      const jumlahSoalPerSesiValid = Math.max(1, Math.min(20, Math.round(jumlahSoalPerSesi) || 1));
      const totalSoalDiminta = jumlahSesiValid * jumlahSoalPerSesiValid;

      let soalProses: SoalData['soal'] = [];

      const preferredModel = typeof localStorage !== 'undefined' ? localStorage.getItem('preferredModel') : null;
      const isForceStatis = preferredModel === 'statis';

      if (isForceStatis) {
        setLoadingMessage('📖 Memuat soal statis dari bank data...');
        soalProses = data.soal.map(s => ({ ...s, sumber: 'statis' }));
      } else if (selectedItems && selectedItems.length > 0) {
        setLoadingMessage('✨ AI sedang menyusun soal berdasarkan topik pilihanmu...');
        try {
          const soalAI = await buatSoalDariTopikRotasi(selectedItems, data.judul, jumlahSesiValid, jumlahSoalPerSesiValid);
          soalProses = (soalAI && soalAI.length > 0) ? soalAI.map(s => ({ ...s, sumber: 'ai' })) : data.soal.map(s => ({ ...s, sumber: 'statis' }));
        } catch (errAI) {
          console.error('[muatSoal] buatSoalDariTopikRotasi gagal, fallback ke statis:', errAI);
          soalProses = data.soal.map(s => ({ ...s, sumber: 'statis' }));
        }
      } else if (sesiSaatIni === 1) {
        soalProses = data.soal.map(s => ({ ...s, sumber: 'statis' }));
      } else {
        setLoadingMessage('🌐 Mengambil soal dari server...');
        try {
          const soalBackend = await fetchSoalDariBackend(data.judul, totalSoalDiminta);
          soalProses = (soalBackend && soalBackend.length > 0) ? soalBackend.map(s => ({ ...s, sumber: 'ai' })) : data.soal.map(s => ({ ...s, sumber: 'statis' }));
        } catch (errBackend) {
          console.warn('[muatSoal] Backend gagal, coba AI langsung:', errBackend);
          setLoadingMessage('✨ AI sedang menyusun soal adaptif...');
          try {
            const soalAI = await generateSoalAdaptif(data.judul, totalSoalDiminta, {}, undefined, 'sampai');
            soalProses = (soalAI && soalAI.length > 0) ? soalAI.map(s => ({ ...s, sumber: 'ai' })) : data.soal.map(s => ({ ...s, sumber: 'statis' }));
          } catch (errAI) {
            console.error('[muatSoal] generateSoalAdaptif gagal, fallback ke statis:', errAI);
            soalProses = data.soal.map(s => ({ ...s, sumber: 'statis' }));
          }
        }
      }

      let soalFinal: SoalData['soal'];
      try {
        soalFinal = soalProses.map((s) => {
          const rawPilihan = Array.isArray(s.pilihan) ? s.pilihan : [];
          const cleanPilihan = rawPilihan.map((p) => bersihkanPrefixPilihan(p));
          const rawJawaban = s.jawaban_benar || (rawPilihan.length > 0 ? rawPilihan[0] : '');
          let cleanJawaban: string | string[];

          if (Array.isArray(rawJawaban)) {
            cleanJawaban = rawJawaban.map((j: string) => {
              const jc = bersihkanPrefixPilihan(j);
              const idx = rawPilihan.findIndex((p) => p === j || bersihkanPrefixPilihan(p) === jc);
              return idx !== -1 ? cleanPilihan[idx] : jc;
            });
          } else {
            const jc = bersihkanPrefixPilihan(String(rawJawaban));
            const idx = rawPilihan.findIndex((p) => p === rawJawaban || bersihkanPrefixPilihan(p) === jc);
            cleanJawaban = idx !== -1 ? cleanPilihan[idx] : jc;
          }

          return {
            ...s,
            pertanyaan: normalisasiTeksSoal(s.pertanyaan),
            pilihan: cleanPilihan.map(normalisasiTeksSoal),
            jawaban_benar: Array.isArray(cleanJawaban) 
              ? cleanJawaban.map(normalisasiTeksSoal) 
              : normalisasiTeksSoal(cleanJawaban as string),
          };
        });
      } catch (errFinal) {
        console.error('[muatSoal] GAGAL DI TAHAP: proses akhir (normalisasi soal)', errFinal, 'soalProses=', soalProses);
        throw new Error(`[TAHAP: proses akhir] ${errFinal instanceof Error ? errFinal.message : String(errFinal)}`);
      }

      setSoalList(soalFinal);
      setJawaban(new Array(soalFinal.length).fill(''));
      setLoading(false);
    } catch (err: unknown) {
      console.error('Gagal memuat soal:', err);
      setError('Gagal memuat soal: ' + (err instanceof Error ? err.message : String(err)));
      setLoading(false);
    }
  }, [kodeSoal, jumlahSesi, jumlahSoalPerSesi, selectedItems]);

  const [selectedModelForRetry, setSelectedModelForRetry] = useState<string>('gemini-3.5-flash');

  const kirimJawaban = useCallback(async (modelOverride?: string) => {
    setShowKonfirmasiRaportModal(false);
    const total = soalList.length;
    const nilaiPerSoal = total > 0 ? 100 / total : 0;
    let nilai = 0;
    
    soalList.forEach((s, i) => {
      let jawabanSiswa;
      try {
        jawabanSiswa = s.tipeSoal === 'multi' ? JSON.parse(jawaban[i] || '[]') : jawaban[i];
      } catch {
        jawabanSiswa = s.tipeSoal === 'multi' ? [] : '';
      }

      const isBenar = Array.isArray(s.jawaban_benar)
        ? Array.isArray(jawabanSiswa) && s.jawaban_benar.length === jawabanSiswa.length && s.jawaban_benar.every((val: string) => jawabanSiswa.includes(val))
        : s.jawaban_benar === jawabanSiswa;

      if (isBenar) {
        nilai += nilaiPerSoal;
      }
    });
    nilai = Math.round(nilai);
    setNilaiAkhir(nilai);

    const statistikElemen: Record<string, { benar: number; total: number }> = {};
    soalList.forEach((s, i) => {
      if (!statistikElemen[s.elemen]) statistikElemen[s.elemen] = { benar: 0, total: 0 };
      statistikElemen[s.elemen].total += 1;
      
      let jawabanSiswa;
      try {
        jawabanSiswa = s.tipeSoal === 'multi' ? JSON.parse(jawaban[i] || '[]') : jawaban[i];
      } catch {
        jawabanSiswa = s.tipeSoal === 'multi' ? [] : '';
      }

      const isBenar = Array.isArray(s.jawaban_benar)
        ? Array.isArray(jawabanSiswa) && s.jawaban_benar.length === jawabanSiswa.length && s.jawaban_benar.every((val: string) => jawabanSiswa.includes(val))
        : s.jawaban_benar === jawabanSiswa;
        
      if (isBenar) statistikElemen[s.elemen].benar += 1;
    });

    const detailSoal: DetailSoalEntry[] = soalList.map((s, i) => {
      let jawabanSiswa;
      try {
        jawabanSiswa = s.tipeSoal === 'multi' ? JSON.parse(jawaban[i] || '[]') : jawaban[i];
      } catch {
        jawabanSiswa = s.tipeSoal === 'multi' ? [] : '';
      }

      const isBenar = Array.isArray(s.jawaban_benar)
        ? Array.isArray(jawabanSiswa) && s.jawaban_benar.length === jawabanSiswa.length && s.jawaban_benar.every((val: string) => jawabanSiswa.includes(val))
        : s.jawaban_benar === jawabanSiswa;
      
      return {
        nomor: i + 1,
        elemen: s.elemen,
        subElemen: s.subElemen || '',
        fase: s.fase,
        kelas: s.kelas ?? 0,
        taxonomiBloom: s.taxonomiBloom,
        benar: isBenar,
      };
    });

    const riwayatSebelum = getRiwayat(judul);
    setAnalisisLoading(true);
    setAnalisisError('');

    const riwayatBaru: RiwayatEntry = {
      tanggal: new Date().toISOString(),
      mataPelajaran: judul,
      nilai,
      statistikElemen,
      detailSoal,
    };

    try {
      tambahRiwayat(riwayatBaru);
    } catch (err) {
      console.error('Gagal menyimpan riwayat:', err);
    }

    try {
      const hasilRaport = await generateRaport(judul, soalList.map((s, i) => ({
        nomor: i + 1,
        pertanyaan: s.pertanyaan,
        pilihan: s.pilihan,
        jawabanSiswa: jawaban[i] || '',
        jawabanBenar: s.jawaban_benar,
        elemen: s.elemen,
        fase: s.fase,
        taxonomiBloom: s.taxonomiBloom,
        kelas: s.kelas ?? 0,
        subElemen: s.subElemen || '',
      })), riwayatSebelum, modelOverride || selectedModelForRetry);

      setRaport(hasilRaport);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (errorMessage.startsWith(QUOTA_EXCEEDED_ERROR)) {
        setAnalisisError('Kuota model saat ini habis. Silakan pilih model lain di bawah dan coba lagi.');
      } else {
        setAnalisisError('Gagal menganalisis hasil: ' + errorMessage);
      }
      if (errorMessage.startsWith(QUOTA_EXCEEDED_ERROR)) triggerPayment();
    } finally {
      setAnalisisLoading(false);
    }
  }, [soalList, jawaban, judul, triggerPayment, selectedModelForRetry]);

  const kirimJawabanRef = useRef(kirimJawaban);
  
  useEffect(() => {
    kirimJawabanRef.current = kirimJawaban;
  }, [kirimJawaban]);

  useEffect(() => {
    const timer = setInterval(() => {
      setWaktu((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          kirimJawabanRef.current();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    muatSoal();
    return () => clearInterval(timer);
  }, [kodeSoal, muatSoal]);

  const formatWaktu = (): string => {
    const menit = Math.floor(waktu / 60);
    const detik = waktu % 60;
    return `${String(menit).padStart(2, '0')}:${String(detik).padStart(2, '0')}`;
  };

  const totalSoal = soalList.length;

  const tanganiSelesaiUjian = () => {
    const belumDijawab = jawaban.filter((j) => !j || j === '[]').length;
    if (belumDijawab > 0) {
      setShowKonfirmasiRaportModal(true);
    } else {
      kirimJawaban();
    }
  };

  if (loading) {
    return <div className="loading"><p>{loadingMessage}</p></div>;
  }

  if (error) return <div className="error">{error}</div>;

  if (analisisLoading || raport !== null || analisisError) {
    const layakSertifikat = nilaiAkhir !== null && nilaiAkhir >= AMBANG_NILAI_SERTIFIKAT;

    return (
      <div className="soal-page">
        <div className="header">
          <button onClick={onKembali} className="btn-kembali">← Kembali</button>
          <h1>Rapor Hasil Belajar — {judul}</h1>
          {/* Credit badge */}
          <div style={{ marginTop: 8, fontSize: 14, color: (window as any)._userCredits !== undefined && (window as any)._userCredits > 0 ? '#34d399' : '#f87171' }}>
            Kredit tersisa: {(window as any)._userCredits !== undefined ? (window as any)._userCredits : '-'}
          </div>
        </div>
        <div className="soal-container" style={{ padding: '24px' }}>
          {/* Ringkasan Rapor */}
          <div className="raport-sesi-summary">
            <div className="raport-summary-item">
              <span className="raport-summary-label">Total Soal</span>
              <span className="raport-summary-value">{totalSoal} Soal</span>
            </div>
            <div className="raport-summary-item">
              <span className="raport-summary-label">Soal Terjawab</span>
              <span className="raport-summary-value">{jawaban.filter(j => j && j !== '[]').length} Soal</span>
            </div>
            <div className="raport-summary-item">
              <span className="raport-summary-label">Nilai Akhir</span>
              <span className="raport-summary-value" style={{ color: layakSertifikat ? '#34d399' : '#f59e0b' }}>
                {nilaiAkhir !== null ? `${nilaiAkhir}/100` : '-'}
              </span>
            </div>
          </div>

          {analisisLoading && <p>⏳ Sedang menganalisis jawabanmu dengan AI...</p>}
          {analisisError && (
            <div className="error-box" style={{ background: '#7f1d1d', padding: 16, borderRadius: 12, marginBottom: 16 }}>
              <p className="error" style={{ color: '#fca5a5', marginBottom: 12 }}>{analisisError}</p>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <select 
                  className="bg-gray-700 text-white rounded-lg p-2 border border-gray-600"
                  value={selectedModelForRetry}
                  onChange={(e) => setSelectedModelForRetry(e.target.value)}
                >
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
                  <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                  <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
                  <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
                </select>
                <button 
                  onClick={() => kirimJawabanRef.current(selectedModelForRetry)} 
                  className="btn-nav"
                  style={{ background: '#b91c1c', borderColor: '#b91c1c' }}
                >
                  🔄 Coba Lagi
                </button>
              </div>
            </div>
          )}
          {!analisisLoading && raport && (
            <div dangerouslySetInnerHTML={{ __html: renderLatex(raport) }} />
          )}

          {!analisisLoading && layakSertifikat && (
            <div
              style={{
                marginTop: 20,
                padding: 16,
                background: 'rgba(34, 197, 94, 0.1)',
                border: '1px solid rgba(34, 197, 94, 0.3)',
                borderRadius: 12,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12,
              }}
            >
              <span style={{ fontSize: 14 }}>
                🎉 Skor kamu <strong>{nilaiAkhir}%</strong> — memenuhi syarat sertifikat!
              </span>
              <button
                onClick={() => setShowCertificate(true)}
                className="btn-nav"
                style={{ background: '#16a34a', borderColor: '#16a34a' }}
              >
                🏆 Cetak Sertifikat
              </button>
            </div>
          )}

          <button onClick={onKembali} className="btn-nav" style={{ marginTop: '20px' }}>
            Kembali ke Dashboard
          </button>
        </div>

        {showCertificate && nilaiAkhir !== null && (
          <Certificate
            mataPelajaran={judul}
            nilai={nilaiAkhir}
            tanggal={new Date().toISOString()}
            onClose={() => setShowCertificate(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="soal-page">
      {/* Header Utama */}
      <div className="header">
        <button onClick={onKembali} className="btn-kembali">← Kembali</button>
        <h1 className="text-xl sm:text-2xl font-bold">{judul}</h1>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div className="text-sm bg-gray-700/80 px-3 py-1.5 rounded-lg border border-gray-600">
            Total: <strong>{totalSoal} Soal</strong>
          </div>
          <div className="timer">⏱️ {formatWaktu()}</div>
        </div>
      </div>

      {/* Progress Bar Soal Keseluruhan */}
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${totalSoal > 0 ? ((jawaban.filter(j => j && j !== '[]').length) / totalSoal) * 100 : 0}%`,
          }}
        />
      </div>

      {/* Area Daftar Semua Soal (Sederhana & Sekaligus) */}
      <div className="soal-container space-y-6">
        {soalList.map((item, idx) => {
          const isMulti = item.tipeSoal === 'multi';
          const jawabanSaatIni = jawaban[idx] || (isMulti ? '[]' : '');

          return (
            <div key={idx} className="soal-item">
              <div className="soal-info">
                <span className="nomor">Soal {idx + 1} dari {totalSoal}</span>
                {item.elemen && <span className="info-badge">{item.elemen}</span>}
                {item.fase && <span className="info-badge">Fase {item.fase}</span>}
                {item.kelas != null && <span className="info-badge">Kelas {item.kelas}</span>}
                {item.taxonomiBloom && <span className="info-badge">{item.taxonomiBloom}</span>}
              </div>

              <div className="pertanyaan">
                <span dangerouslySetInnerHTML={{ __html: renderLatex(item.pertanyaan) }} />
              </div>

              <div className="pilihan">
                {item.pilihan.map((pilihan, pIndex) => {
                  let isSelected = false;
                  if (isMulti) {
                    try {
                      isSelected = JSON.parse(jawabanSaatIni).includes(pilihan);
                    } catch {
                      isSelected = false;
                    }
                  } else {
                    isSelected = jawabanSaatIni === pilihan;
                  }

                  const abjad = String.fromCharCode(65 + pIndex);

                  return (
                    <label key={pIndex} className={isSelected ? 'dipilih' : ''}>
                      <input
                        type={isMulti ? 'checkbox' : 'radio'}
                        name={`soal-${idx}`}
                        value={pilihan}
                        checked={isSelected}
                        onChange={(e) => {
                          if (isMulti) {
                            let arr = [];
                            try {
                              arr = JSON.parse(jawabanSaatIni || '[]');
                            } catch {
                              arr = [];
                            }
                            const baru = e.target.checked
                              ? [...arr, pilihan]
                              : arr.filter((p: string) => p !== pilihan);
                            const copy = [...jawaban];
                            copy[idx] = JSON.stringify(baru);
                            setJawaban(copy);
                          } else {
                            const copy = [...jawaban];
                            copy[idx] = pilihan;
                            setJawaban(copy);
                          }
                        }}
                      />
                      <span className="font-semibold mr-2">{abjad}.</span>
                      <span dangerouslySetInnerHTML={{ __html: renderLatex(pilihan) }} />
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Tombol Selesai & Kirim Semua Jawaban */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-gray-800/80 rounded-xl border border-gray-700 mt-8">
          <div className="text-sm text-gray-300">
            Terjawab: <strong className="text-emerald-400 font-bold">{jawaban.filter(j => j && j !== '[]').length}</strong> dari <strong className="text-white">{totalSoal}</strong> soal
          </div>
          <button onClick={tanganiSelesaiUjian} className="btn-kirim w-full sm:w-auto">
            🏁 Selesai & Buat Rapor Hasil Belajar
          </button>
        </div>
      </div>

      {/* ===== MODAL KONFIRMASI BUAT RAPORT ===== */}
      {showKonfirmasiRaportModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon">📋</div>
            <h3 className="modal-title">Selesaikan Simulasi?</h3>
            <p className="modal-desc">
              Masih ada{' '}
              <strong style={{ color: '#f87171' }}>
                {jawaban.filter((j) => !j || j === '[]').length} soal
              </strong>{' '}
              yang belum kamu jawab dari total {totalSoal} soal.
              <br />
              Apakah kamu yakin ingin menyelesaikan dan membuat rapor hasil belajar sekarang?
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal-primary"
                style={{ background: '#ef4444' }}
                onClick={() => kirimJawaban()}
              >
                📊 Ya, Buat Rapor Sekarang
              </button>
              <button
                type="button"
                className="btn-modal-secondary"
                onClick={() => setShowKonfirmasiRaportModal(false)}
              >
                ✏️ Periksa Jawaban Lagi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


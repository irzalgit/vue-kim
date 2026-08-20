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
import Certificate from '../components/Certificate';

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

    try {
      const soalBatch = await generateSoalAdaptif(
        mataPelajaran,
        jumlahSoalPerSesi,
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
      riwayatPerTopik[topik.id] = [...riwayatTopikIni, ...soalBatch.map(s => s.pertanyaan)];
      hasil.push(...soalBatch);
    } catch (err) {
      // Kalau satu slot topik gagal (misal semua retry kena validasi kelas
      // yang gagal terus), lanjut ke slot berikutnya alih-alih membuat
      // seluruh quiz gagal total. Slot ini akan kosong (lebih baik soal
      // sedikit daripada error total ke user).
      console.error(`[buatSoalDariTopikRotasi] Gagal generate untuk topik "${topik.konteksLengkap}":`, err);
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
  // Jumlah "sesi" (kelompok topik hasil rotasi) & jumlah soal per sesi —
  // dikirim dari Dashboard (SoalGeneratorWithChecklist), sama makna &
  // rumusnya dengan yang dipakai di sana: totalSoal = jumlahSesi * jumlahSoalPerSesi.
  // Default 10 & 1 dipertahankan supaya caller lama yang belum mengirim
  // prop ini tetap berjalan seperti sebelumnya (10 soal, 1 per topik).
  jumlahSesi?: number;
  jumlahSoalPerSesi?: number;
  onKembali: () => void;
}

export default function SoalPage({
  kodeSoal,
  selectedItems = [],
  jumlahSesi = 10,
  jumlahSoalPerSesi = 1,
  onKembali,
}: SoalPageProps) {
  const { triggerPayment } = usePayment();
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [judul, setJudul] = useState<string>('');
  const [soalList, setSoalList] = useState<SoalData['soal']>([]);
  const [jawaban, setJawaban] = useState<string[]>([]);
  const [waktu, setWaktu] = useState<number>(5400);
  const [nomorSoal, setNomorSoal] = useState<number>(0);

  const [raport, setRaport] = useState<string | null>(null);
  const [analisisLoading, setAnalisisLoading] = useState<boolean>(false);
  const [analisisError, setAnalisisError] = useState<string>('');
  const [nilaiAkhir, setNilaiAkhir] = useState<number | null>(null);
  const [showCertificate, setShowCertificate] = useState<boolean>(false);

  const [loadingMessage, setLoadingMessage] = useState<string>('Memuat soal...');

  // ==================== MUAT SOAL ====================
  const muatSoal = useCallback(async () => {
    setLoading(true);
    setLoadingMessage('Memuat soal...');

    try {
      let response: Response;
      try {
        const url = new URL(`/data/soal-${kodeSoal}.json`, window.location.origin).href;
        response = await fetch(url);
      } catch (errFetchJson) {
        console.error('[muatSoal] GAGAL DI TAHAP: fetch JSON statis', errFetchJson);
        throw new Error(`[TAHAP: fetch JSON] ${errFetchJson instanceof Error ? errFetchJson.message : String(errFetchJson)}`);
      }

      if (!response.ok) {
        throw new Error(`[TAHAP: fetch JSON] File soal 'soal-${kodeSoal}.json' tidak ditemukan di folder public/data/ (status ${response.status})`);
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

      if (selectedItems && selectedItems.length > 0) {
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
        soalFinal = soalProses.map((s) => ({
          ...s,
          pertanyaan: normalisasiTeksSoal(s.pertanyaan),
          pilihan: s.pilihan.map(normalisasiTeksSoal),
          // Sementara cast ke string sampai UI diperbarui untuk multi-choice
          jawaban_benar: Array.isArray(s.jawaban_benar) 
            ? s.jawaban_benar.map(normalisasiTeksSoal) 
            : normalisasiTeksSoal(s.jawaban_benar as string),
        }));
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

  const pilihJawaban = (nilai: string) => {
    const baru = [...jawaban];
    baru[nomorSoal] = nilai;
    setJawaban(baru);
  };

  const navigasiSoal = (arah: 'prev' | 'next') => {
    if (arah === 'prev' && nomorSoal > 0) setNomorSoal(nomorSoal - 1);
    else if (arah === 'next' && nomorSoal < soalList.length - 1) setNomorSoal(nomorSoal + 1);
  };

  const [selectedModelForRetry, setSelectedModelForRetry] = useState<string>('gemini-3.5-flash');

  const kirimJawaban = useCallback(async (modelOverride?: string) => {
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
        </div>
        <div className="soal-container" style={{ padding: '24px' }}>
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

  const soal = soalList[nomorSoal];

  return (
    <div className="soal-page">
      <div className="header">
        <button onClick={onKembali} className="btn-kembali">← Kembali</button>
        <h1>{judul}</h1>
        <div className="timer">⏱️ {formatWaktu()}</div>
      </div>

      <div className="soal-container">
        <div className="soal-item">
          <div className="soal-info">
            <span className="nomor">Soal {nomorSoal + 1}/{soalList.length}</span>
            <span className="info-badge">Fase {soal.fase}</span>
            {soal.kelas != null && <span className="info-badge">Kelas {soal.kelas}</span>}
            <span className="info-badge">Bloom: {soal.taxonomiBloom}</span>
            <span className="info-topik">Elemen: {soal.elemen}</span>
            {soal.sumber && (
              <span className={`info-badge sumber-${soal.sumber}`}>
                Sumber: {soal.sumber === 'ai' ? (soal.model ? `AI (${soal.model})` : 'AI (Gemini)') : 'Data Statis'}
              </span>
            )}
            {soal.subElemen && <span className="info-topik">Sub Elemen: {soal.subElemen}</span>}
            {soal.subSubElemen && <span className="info-topik">Sub Sub Elemen: {soal.subSubElemen}</span>}
          </div>
          <p className="pertanyaan">
            <span dangerouslySetInnerHTML={{ __html: renderLatex(soal.pertanyaan) }} />
          </p>

          <div className="pilihan">
            {soal.pilihan.map((pilihan, pIndex) => {
              const isMulti = soal.tipeSoal === 'multi';
              const jawabanSaatIni = jawaban[nomorSoal] || (isMulti ? '[]' : '');
              const isSelected = isMulti 
                ? JSON.parse(jawabanSaatIni).includes(pilihan)
                : jawabanSaatIni === pilihan;

              return (
                <label key={pIndex} className={isSelected ? 'dipilih' : ''}>
                  <input
                    type={isMulti ? 'checkbox' : 'radio'}
                    name={`soal-${nomorSoal}`}
                    value={pilihan}
                    checked={isSelected}
                    onChange={(e) => {
                      if (isMulti) {
                        const arr = JSON.parse(jawabanSaatIni || '[]');
                        const baru = e.target.checked
                          ? [...arr, pilihan]
                          : arr.filter((p: string) => p !== pilihan);
                        pilihJawaban(JSON.stringify(baru));
                      } else {
                        pilihJawaban(pilihan);
                      }
                    }}
                  />
                  <span dangerouslySetInnerHTML={{ __html: renderLatex(pilihan) }} />
                </label>
              );
            })}
          </div>
        </div>

        <div className="navigasi">
          <button onClick={() => navigasiSoal('prev')} disabled={nomorSoal === 0} className="btn-nav">
            ← Sebelumnya
          </button>
          {nomorSoal === soalList.length - 1 ? (
            <button onClick={() => kirimJawaban()} className="btn-kirim">Kirim Jawaban</button>
          ) : (
            <button onClick={() => navigasiSoal('next')} className="btn-nav">Selanjutnya →</button>
          )}
        </div>
      </div>
    </div>
  );
}

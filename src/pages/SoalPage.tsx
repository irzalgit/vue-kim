// src/pages/SoalPage.tsx
import { useState, useEffect } from 'react';
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
  return teks;
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
    jawaban_benar: string;
    elemen: string;
    fase: string;
    taxonomiBloom: string;
    kelas?: number;
    subElemen?: string;
    subSubElemen?: string;
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

  const [loadingMessage, setLoadingMessage] = useState<string>('Memuat soal...');

  useEffect(() => {
    const timer = setInterval(() => {
      setWaktu((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          kirimJawaban();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    muatSoal();
    return () => clearInterval(timer);
  }, [kodeSoal]);

  // ==================== MUAT SOAL ====================
  const muatSoal = async () => {
    setLoading(true);
    setLoadingMessage('Memuat soal...');

    try {
      const base = import.meta.env.BASE_URL || '/';
      let response = await fetch(`${base}data/soal-${kodeSoal}.json`);
      
      if (!response.ok) {
        response = await fetch(`/data/soal-${kodeSoal}.json`);
      }

      if (!response.ok) {
        throw new Error(`File soal 'soal-${kodeSoal}.json' tidak ditemukan di folder public/data/`);
      }

      const data: SoalData = await response.json();
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
          console.log('[muatSoal] Hasil buatSoalDariTopikRotasi (checklist):', soalAI);
          soalProses = (soalAI && soalAI.length > 0) ? soalAI : data.soal;
        } catch (errAI) {
          console.error('[muatSoal] buatSoalDariTopikRotasi gagal (checklist), fallback ke hardcode:', errAI);
          soalProses = data.soal;
        }
      } else if (sesiSaatIni === 1) {
        soalProses = data.soal;
      } else {
        setLoadingMessage('✨ AI sedang menyusun soal adaptif...');
        try {
          const soalAI = await generateSoalAdaptif(data.judul, totalSoalDiminta, {}, undefined, 'sampai');
          console.log('[muatSoal] Hasil generateSoalAdaptif (adaptif):', soalAI);
          soalProses = (soalAI && soalAI.length > 0) ? soalAI : data.soal;
        } catch (errAI) {
          console.error('[muatSoal] generateSoalAdaptif gagal (adaptif), fallback ke hardcode:', errAI);
          soalProses = data.soal;
        }
      }

      const soalFinal = soalProses.map((s) => ({
        ...s,
        pertanyaan: normalisasiTeksSoal(s.pertanyaan),
        pilihan: s.pilihan.map(normalisasiTeksSoal),
        jawaban_benar: normalisasiTeksSoal(s.jawaban_benar),
      }));

      setSoalList(soalFinal);
      setJawaban(new Array(soalFinal.length).fill(''));
      setLoading(false);
    } catch (err: any) {
      console.error('Gagal memuat soal:', err);
      setError('Gagal memuat soal: ' + err.message);
      setLoading(false);
    }
  };


  const pilihJawaban = (nilai: string) => {
    const baru = [...jawaban];
    baru[nomorSoal] = nilai;
    setJawaban(baru);
  };

  const navigasiSoal = (arah: 'prev' | 'next') => {
    if (arah === 'prev' && nomorSoal > 0) setNomorSoal(nomorSoal - 1);
    else if (arah === 'next' && nomorSoal < soalList.length - 1) setNomorSoal(nomorSoal + 1);
  };

  const kirimJawaban = async () => {
    const total = soalList.length;
    const nilaiPerSoal = total > 0 ? 100 / total : 0;
    let nilai = 0;
    
    soalList.forEach((s, i) => {
      if (s.jawaban_benar === jawaban[i]) {
        nilai += nilaiPerSoal;
      }
    });
    nilai = Math.round(nilai);

    const statistikElemen: Record<string, { benar: number; total: number }> = {};
    soalList.forEach((s, i) => {
      if (!statistikElemen[s.elemen]) statistikElemen[s.elemen] = { benar: 0, total: 0 };
      statistikElemen[s.elemen].total += 1;
      if (s.jawaban_benar === jawaban[i]) statistikElemen[s.elemen].benar += 1;
    });

    const detailSoal: DetailSoalEntry[] = soalList.map((s, i) => ({
      nomor: i + 1,
      elemen: s.elemen,
      subElemen: s.subElemen || '',
      fase: s.fase,
      kelas: s.kelas ?? 0,
      taxonomiBloom: s.taxonomiBloom,
      benar: s.jawaban_benar === jawaban[i],
    }));

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
      })), riwayatSebelum);

      setRaport(hasilRaport);
    } catch (err: any) {
      if (err?.message === QUOTA_EXCEEDED_ERROR) triggerPayment();
      setAnalisisError('Gagal menganalisis hasil: ' + (err?.message ?? String(err)));
    } finally {
      setAnalisisLoading(false);
    }
  };

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
    return (
      <div className="soal-page">
        <div className="header">
          <button onClick={onKembali} className="btn-kembali">← Kembali</button>
          <h1>Rapor Hasil Belajar — {judul}</h1>
        </div>
        <div className="soal-container" style={{ padding: '24px' }}>
          {analisisLoading && <p>⏳ Sedang menganalisis jawabanmu dengan AI...</p>}
          {analisisError && <p className="error">{analisisError}</p>}
          {!analisisLoading && raport && (
            <div dangerouslySetInnerHTML={{ __html: renderLatex(raport) }} />
          )}
          <button onClick={onKembali} className="btn-nav" style={{ marginTop: '20px' }}>
            Kembali ke Dashboard
          </button>
        </div>
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
          <p className="pertanyaan">
            <span className="nomor">Soal {nomorSoal + 1}/{soalList.length}</span>
            <br />
            <span dangerouslySetInnerHTML={{ __html: renderLatex(soal.pertanyaan) }} />
          </p>

          <div className="pilihan">
            {soal.pilihan.map((pilihan, pIndex) => (
              <label key={pIndex} className={jawaban[nomorSoal] === pilihan ? 'dipilih' : ''}>
                <input
                  type="radio"
                  name={`soal-${nomorSoal}`}
                  value={pilihan}
                  checked={jawaban[nomorSoal] === pilihan}
                  onChange={() => pilihJawaban(pilihan)}
                />
                <span dangerouslySetInnerHTML={{ __html: renderLatex(pilihan) }} />
              </label>
            ))}
          </div>
        </div>

        <div className="navigasi">
          <button onClick={() => navigasiSoal('prev')} disabled={nomorSoal === 0} className="btn-nav">
            ← Sebelumnya
          </button>
          {nomorSoal === soalList.length - 1 ? (
            <button onClick={kirimJawaban} className="btn-kirim">Kirim Jawaban</button>
          ) : (
            <button onClick={() => navigasiSoal('next')} className="btn-nav">Selanjutnya →</button>
          )}
        </div>
      </div>
    </div>
  );
}

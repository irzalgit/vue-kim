import { useState, useEffect } from 'react';
import './SoalPage.css';
import { generateRaport } from '../agent/raport';
import { generateSoalAdaptif, generateSoalBerbasisPosisi, type SoalItemGenerated } from '../agent/generateSoal';
import { QUOTA_EXCEEDED_ERROR } from '../agent/providers/gemini';
import { usePayment } from '../App';
import {
  getRiwayat,
  tambahRiwayat,
  hapusRiwayatMapel,
  perbaruiCapaian,
  type RiwayatEntry,
  type DetailSoalEntry,
} from '../utils/riwayat';
import katex from 'katex';
import 'katex/dist/katex.min.css';

// ============================================================
//  HELPER: ESCAPE HTML
// ============================================================
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ============================================================
//  HELPER: RENDER LATEX (CAMPURAN TEKS + RUMUS)
// ============================================================
function renderLatex(teks: string): string {
  if (!teks) return '';

  try {
    const regex = /(\$\$[\s\S]*?\$\$|\$[^$]*?\$)/g;
    const bagian = teks.split(regex);

    return bagian
      .map((bag) => {
        if (!bag) return '';

        // Display $$...$$
        if (bag.startsWith('$$') && bag.endsWith('$$')) {
          const rumus = bag.slice(2, -2).trim();
          try {
            return katex.renderToString(rumus, {
              throwOnError: false,
              displayMode: true,
              trust: true,
              strict: false,
            });
          } catch {
            return `<span style="color: #f87171;">${escapeHtml(bag)}</span>`;
          }
        }

        // Inline $...$
        if (bag.startsWith('$') && bag.endsWith('$')) {
          const rumus = bag.slice(1, -1).trim();
          try {
            return katex.renderToString(rumus, {
              throwOnError: false,
              displayMode: false,
              trust: true,
              strict: false,
            });
          } catch {
            return `<span style="color: #f87171;">${escapeHtml(bag)}</span>`;
          }
        }

        // Teks biasa
        return escapeHtml(bag).replace(/\n/g, '<br/>');
      })
      .join('');
  } catch (error) {
    console.error('Error rendering:', error);
    return escapeHtml(teks);
  }
}

// ============================================================
//  DETEKSI RUMUS MURNI (BUKAN KALIMAT)
// ============================================================
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

// ============================================================
//  NORMALISASI TEKS SOAL (BUNGKUS RUMUS DENGAN $...$)
// ============================================================
function normalisasiTeksSoal(teks: string): string {
  if (!teks) return '';

  if (teks.includes('\\begin{') || teks.includes('$')) {
    return teks;
  }

  if (isFormulaMurni(teks)) {
    return `$${teks}$`;
  }

  return teks;
}

// ============================================================
//  INTERFACE
// ============================================================
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
  }[];
}

interface SoalPageProps {
  kodeSoal: string;
  onKembali: () => void;
}

// ============================================================
//  KOMPONEN UTAMA
// ============================================================
export default function SoalPage({ kodeSoal, onKembali }: SoalPageProps) {
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
  const [nilaiAkhir, setNilaiAkhir] = useState<number>(0);
  const [riwayatSebelumnya, setRiwayatSebelumnya] = useState<RiwayatEntry[]>([]);

  const [sumberSoal, setSumberSoal] = useState<'hardcode' | 'adaptif'>('hardcode');
  // Ubah menjadi:

  const [sesiUjian, setSesiUjian] = useState<number>(1);
  const [loadingMessage, setLoadingMessage] = useState<string>('Memuat soal...');

  // Timer otomatis
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
      const base = import.meta.env.BASE_URL || '/vue-kim/';
      const response = await fetch(`${base}data/soal-${kodeSoal}.json`);
      if (!response.ok) throw new Error('Soal tidak ditemukan');

      const data: SoalData = await response.json();
      setJudul(data.judul);
      setWaktu(data.waktu * 60);

      const kelasValues = data.soal
        .map((s) => s.kelas)
        .filter((k): k is number => typeof k === 'number');
      const kelasTargetHitung = kelasValues.length > 0 ? Math.max(...kelasValues) : undefined;


      const riwayat = getRiwayat(data.judul);
      const sesiSaatIni = riwayat.length + 1;
      setSesiUjian(sesiSaatIni);

      const cacheKey = `soal_adaptif_${data.judul}`;
      const cachedSoal = localStorage.getItem(cacheKey);

      let soalProses: SoalData['soal'] = [];

      if (sesiSaatIni === 1) {
        setSumberSoal('hardcode');
        soalProses = data.soal;
      } else if (cachedSoal) {
        setSumberSoal('adaptif');
        soalProses = JSON.parse(cachedSoal);
      } else {
        setLoadingMessage(' AI sedang menyusun soal personalisasi untukmu...');
        try {
          const riwayatTerbaru = riwayat[0];
          const detailSoalSebelumnya = riwayatTerbaru?.detailSoal;

          let soalAI: SoalItemGenerated[];

          if (detailSoalSebelumnya && detailSoalSebelumnya.length > 0) {
            soalAI = await generateSoalBerbasisPosisi(data.judul, detailSoalSebelumnya);
          } else {
            const statistikDariRiwayat = riwayatTerbaru?.statistikElemen || {};
            soalAI = await generateSoalAdaptif(
              data.judul,
              data.soal.length,
              statistikDariRiwayat,
              kelasTargetHitung,
              'sampai'
            );
          }

          if (soalAI && soalAI.length > 0) {
            setSumberSoal('adaptif');
            soalProses = soalAI;
            localStorage.setItem(cacheKey, JSON.stringify(soalAI));
          } else {
            throw new Error('Soal AI kosong');
          }
        } catch (aiErr: any) {
          console.warn('[DEBUG] Gagal generate soal AI, fallback ke hardcode:', aiErr);
          setSumberSoal('hardcode');
          soalProses = data.soal;
          setError('Soal AI gagal dimuat, menggunakan soal standar. Error: ' + aiErr.message);
        }
      }

      // Normalisasi teks (urutan pilihan TIDAK diacak, mengikuti urutan asli data)
      // PENTING: jawaban_benar juga harus dinormalisasi dengan cara yang SAMA
      // seperti pilihan, agar perbandingan "jawaban_benar === pilihan yang dipilih"
      // selalu cocok (mencegah nilai salah hitung akibat format teks berbeda,
      // misal "x^2" vs "$x^2$").
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
      console.error('[DEBUG] Gagal memuat soal:', err);
      setError('Gagal memuat soal: ' + err.message);
    } finally {
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

    // Setiap jawaban benar menambah nilai sebesar (100 / jumlah soal)
    let nilai = 0;
    let benar = 0;
    soalList.forEach((s, i) => {
      if (s.jawaban_benar === jawaban[i]) {
        nilai += nilaiPerSoal;
        benar += 1;
      }
    });
    nilai = Math.round(nilai);
    setNilaiAkhir(nilai);

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
    setRiwayatSebelumnya(riwayatSebelum);
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

    const cacheKey = `soal_adaptif_${judul}`;
    const items = soalList.map((s, i) => ({
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
    }));

    const [hasilRaport, hasilSoalBaru] = await Promise.allSettled([
      generateRaport(judul, items, riwayatSebelum),
      generateSoalBerbasisPosisi(judul, detailSoal),
    ]);

    if (hasilSoalBaru.status === 'fulfilled') {
      const soalNormal = hasilSoalBaru.value.map((s: any) => ({
        ...s,
        pertanyaan: normalisasiTeksSoal(s.pertanyaan),
        pilihan: s.pilihan.map(normalisasiTeksSoal),
        jawaban_benar: normalisasiTeksSoal(s.jawaban_benar),
      }));
      localStorage.setItem(cacheKey, JSON.stringify(soalNormal));
    } else {
      console.warn('[DEBUG] Gagal generate soal berikutnya (berbasis posisi):', hasilSoalBaru.reason);
      localStorage.removeItem(cacheKey);
    }

    try {
      if (hasilRaport.status === 'rejected') throw hasilRaport.reason;
      const hasil = hasilRaport.value;
      setRaport(hasil);
      const capaianMatch = hasil.match(/\*\*Capaian:\*\*\s*(.+)/);
      const capaian = capaianMatch ? capaianMatch[1].trim() : undefined;
      perbaruiCapaian(judul, riwayatBaru.tanggal, capaian);
    } catch (err: any) {
      console.error('Gagal analisis rapor:', err);
      if (err?.message === QUOTA_EXCEEDED_ERROR) {
        triggerPayment();
      }
      setAnalisisError('Gagal menganalisis hasil: ' + (err?.message ?? String(err)));
    } finally {
      setAnalisisLoading(false);
    }
  };

  const handleHapusRiwayat = () => {
    if (window.confirm(`Yakin ingin menghapus semua riwayat untuk "${judul}"?`)) {
      hapusRiwayatMapel(judul);
      localStorage.removeItem(`soal_adaptif_${judul}`);
      setRiwayatSebelumnya([]);
      alert(`Riwayat untuk "${judul}" telah dihapus.`);
    }
  };

  const formatWaktu = (): string => {
    const menit = Math.floor(waktu / 60);
    const detik = waktu % 60;
    return `${String(menit).padStart(2, '0')}:${String(detik).padStart(2, '0')}`;
  };

  // ============================================================
  //  RENDER
  // ============================================================

  if (loading) {
    return (
      <div className="loading">
        <p>{loadingMessage}</p>
        {sesiUjian > 1 && <p style={{ fontSize: '14px', opacity: 0.7 }}>Sesi ke-{sesiUjian} • Mohon tunggu sebentar</p>}
      </div>
    );
  }

  if (error) return <div className="error">{error}</div>;

  // ========== HALAMAN RAPOR ==========
  if (analisisLoading || raport !== null || analisisError) {
    return (
      <div className="soal-page">
        <div className="header">
          <button onClick={onKembali} className="btn-kembali">← Kembali</button>
          <h1>Rapor Hasil Belajar — {judul}</h1>
        </div>

        <div className="soal-container" style={{ padding: '24px' }}>
          {analisisLoading && <p>⏳ Sedang menganalisis jawabanmu dengan AI, mohon tunggu...</p>}

          {!analisisLoading && analisisError && (
            <>
              <p style={{ color: '#f87171' }}>{analisisError}</p>
              <p>Nilai kamu: <strong>{nilaiAkhir}/100</strong></p>
            </>
          )}

          {!analisisLoading && raport && (
            <>
              <div
                style={{
                  whiteSpace: 'pre-wrap',
                  lineHeight: 1.7,
                  background: '#111827',
                  color: '#fff',
                  padding: '20px',
                  borderRadius: '12px',
                }}
                dangerouslySetInnerHTML={{ __html: renderLatex(raport) }}
              />
              <button
                onClick={handleHapusRiwayat}
                style={{
                  marginTop: '16px',
                  background: 'transparent',
                  color: '#f87171',
                  border: '1px solid #f87171',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                🗑️ Hapus Riwayat {judul}
              </button>
            </>
          )}

          {riwayatSebelumnya.length > 0 && (
            <div style={{ marginTop: '24px' }}>
              <h3 style={{ marginBottom: '10px' }}>📈 Riwayat Nilai — {judul}</h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', color: '#fff' }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1px solid #334155' }}>
                    <th style={{ padding: '8px' }}>Tanggal</th>
                    <th style={{ padding: '8px' }}>Nilai</th>
                    <th style={{ padding: '8px' }}>Capaian</th>
                  </tr>
                </thead>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #1f2937', fontWeight: 'bold' }}>
                    <td style={{ padding: '8px' }}>
                      {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })} (hari ini)
                    </td>
                    <td style={{ padding: '8px' }}>{nilaiAkhir}/100</td>
                    <td style={{ padding: '8px' }}>—</td>
                  </tr>
                  {riwayatSebelumnya.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #1f2937' }}>
                      <td style={{ padding: '8px' }}>
                        {new Date(r.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </td>
                      <td style={{ padding: '8px' }}>{r.nilai}/100</td>
                      <td style={{ padding: '8px' }}>{r.capaian || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <button onClick={onKembali} className="btn-nav" style={{ marginTop: '20px' }}>
            Kembali ke Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ========== HALAMAN PENGERJAAN SOAL ==========
  const soal = soalList[nomorSoal];

  return (
    <div className="soal-page">
      <div className="header">
        <button onClick={onKembali} className="btn-kembali">← Kembali</button>
        <h1>{judul}</h1>
        <div className="timer">⏱️ {formatWaktu()}</div>
      </div>

      {/* Badge header */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px', margin: '10px 0', flexWrap: 'wrap' }}>
        <span
          style={{
            background: sumberSoal === 'adaptif' ? '#10b981' : '#6b7280',
            color: '#fff',
            padding: '4px 12px',
            borderRadius: '999px',
            fontSize: '12px',
            fontWeight: 'bold',
          }}
        >
          {sumberSoal === 'adaptif' ? ' Soal AI' : '📚 Soal Standar'}
        </span>
        <span style={{ background: '#4338ca', color: '#fff', padding: '4px 12px', borderRadius: '999px', fontSize: '12px' }}>
          Sesi ke-{sesiUjian}
        </span>
        {soal.kelas && (
          <span style={{ background: '#7c3aed', color: '#fff', padding: '4px 12px', borderRadius: '999px', fontSize: '12px' }}>
            🎯 Kelas {soal.kelas}
          </span>
        )}
        {soal.subElemen && (
          <span style={{ background: '#0d9488', color: '#fff', padding: '4px 12px', borderRadius: '999px', fontSize: '12px' }}>
             {soal.subElemen}
          </span>
        )}
      </div>

      <div className="progress-bar">
        <div className="progress-fill" style={{ width: `${((nomorSoal + 1) / soalList.length) * 100}%` }} />
      </div>

      <div className="soal-container">
        <div className="soal-item">
          {/* Meta badges */}
          <div className="meta-badges" style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
            <span style={{ background: '#4338ca', color: '#fff', padding: '4px 10px', borderRadius: '999px', fontSize: '12px' }}>
              📂 {soal.elemen}
            </span>
            <span style={{ background: '#0369a1', color: '#fff', padding: '4px 10px', borderRadius: '999px', fontSize: '12px' }}>
              🎓 Fase {soal.fase}
            </span>
            <span style={{ background: '#b45309', color: '#fff', padding: '4px 10px', borderRadius: '999px', fontSize: '12px' }}>
              🧠 {soal.taxonomiBloom}
            </span>
            {soal.subElemen && (
              <span style={{ background: '#0d9488', color: '#fff', padding: '4px 10px', borderRadius: '999px', fontSize: '12px' }}>
                📌 {soal.subElemen}
              </span>
            )}
            {soal.kelas && (
              <span style={{ background: '#7c3aed', color: '#fff', padding: '4px 10px', borderRadius: '999px', fontSize: '12px' }}>
                🎯 Kelas {soal.kelas}
              </span>
            )}
          </div>

          {/* Pertanyaan */}
          <p className="pertanyaan">
            <span className="nomor">Soal {nomorSoal + 1}/{soalList.length}</span>
            <br />
            <span dangerouslySetInnerHTML={{ __html: renderLatex(soal.pertanyaan) }} />
          </p>

          {/* Pilihan */}
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

      <div className="nomor-navigasi">
        {soalList.map((_, i) => (
          <button
            key={i}
            onClick={() => setNomorSoal(i)}
            className={`nomor-btn ${jawaban[i] ? 'sudah-jawab' : ''} ${i === nomorSoal ? 'aktif' : ''}`}
          >
            {i + 1}
          </button>
        ))}
      </div>
    </div>
  );
}

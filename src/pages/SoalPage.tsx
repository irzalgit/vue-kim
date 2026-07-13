import { useState, useEffect } from 'react';
import './SoalPage.css';
import { generateRaport } from '../agent/raport';
import { generateSoalAdaptif } from '../agent/generateSoal';
import { getRiwayat, tambahRiwayat, hapusRiwayatMapel, perbaruiCapaian, type RiwayatEntry } from '../utils/riwayat';

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
  }[];
}

interface SoalPageProps {
  kodeSoal: string;
  onKembali: () => void;
}

export default function SoalPage({ kodeSoal, onKembali }: SoalPageProps) {
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
  const [kelasTargetSesi, setKelasTargetSesi] = useState<number | undefined>(undefined);
  const [sesiUjian, setSesiUjian] = useState<number>(1);
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

  const muatSoal = async () => {
    console.log('[DEBUG-SOALPAGE] muatSoal dijalankan, kodeSoal:', kodeSoal);
    setLoading(true);
    setLoadingMessage('Memuat soal...');
    
    try {
      const base = import.meta.env.BASE_URL || '/vue-kim/';
      const response = await fetch(`${base}data/soal-${kodeSoal}.json`);
      if (!response.ok) throw new Error('Soal tidak ditemukan');

      const data: SoalData = await response.json();
      setJudul(data.judul);
      setWaktu(data.waktu * 60);

      // Hitung kelasTarget dari kelas tertinggi pada soal hardcode
      const kelasValues = data.soal
        .map((s) => s.kelas)
        .filter((k): k is number => typeof k === 'number');
      const kelasTargetHitung = kelasValues.length > 0 ? Math.max(...kelasValues) : undefined;
      setKelasTargetSesi(kelasTargetHitung);
      console.log('[DEBUG-SOALPAGE] kelasTarget dihitung dari data soal:', kelasTargetHitung);

      // Cek riwayat untuk menentukan sesi
      const riwayat = getRiwayat(data.judul);
      const sesiSaatIni = riwayat.length + 1;
      setSesiUjian(sesiSaatIni);
      console.log(`[DEBUG-SOALPAGE] Sesi ke-${sesiSaatIni}, riwayat ada: ${riwayat.length} entri`);

      // ========== STRATEGI CACHE + AI ==========
      const cacheKey = `soal_adaptif_${data.judul}`;
      const cachedSoal = localStorage.getItem(cacheKey);

      // ✅ Sesi 1: Selalu pakai hardcode (belum ada data untuk AI)
      if (sesiSaatIni === 1) {
        console.log('[DEBUG-SOALPAGE] Sesi 1 -> gunakan hardcode');
        setSumberSoal('hardcode');
        setSoalList(data.soal);
        setJawaban(new Array(data.soal.length).fill(''));
        setLoading(false);
        return;
      }

      // ✅ Sesi 2+: Coba cache dulu
      if (cachedSoal) {
        const soalDariCache = JSON.parse(cachedSoal);
        console.log('[DEBUG-SOALPAGE] Sesi 2+ -> menggunakan soal dari cache');
        setSumberSoal('adaptif');
        setSoalList(soalDariCache);
        setJawaban(new Array(soalDariCache.length).fill(''));
        setLoading(false);
        return;
      }

      // ✅ Sesi 2+ tapi cache kosong -> Generate soal AI langsung!
      console.log('[DEBUG-SOALPAGE] Sesi 2+ tanpa cache -> generate soal AI...');
      setLoadingMessage('🤖 AI sedang menyusun soal personalisasi untukmu...');
      
      try {
        // Ambil statistik dari riwayat terakhir untuk konteks
        const riwayatTerakhir = riwayat[riwayat.length - 1];
        const statistikDariRiwayat = riwayatTerakhir?.statistikElemen || {};
        
        const soalAI = await generateSoalAdaptif(
          data.judul,
          data.soal.length,
          statistikDariRiwayat,
          kelasTargetHitung,
          'sampai'
        );

        if (soalAI && soalAI.length > 0) {
          console.log('[DEBUG-SOALPAGE] Soal AI berhasil dibuat:', soalAI.length, 'soal');
          setSumberSoal('adaptif');
          setSoalList(soalAI);
          setJawaban(new Array(soalAI.length).fill(''));
          
          // Simpan ke cache untuk sesi berikutnya
          localStorage.setItem(cacheKey, JSON.stringify(soalAI));
          setLoading(false);
          return;
        } else {
          throw new Error('Soal AI kosong');
        }
      } catch (aiErr: any) {
        console.warn('[DEBUG-SOALPAGE] Gagal generate soal AI, fallback ke hardcode:', aiErr);
        setSumberSoal('hardcode');
        setSoalList(data.soal);
        setJawaban(new Array(data.soal.length).fill(''));
        setError('Soal AI gagal dimuat, menggunakan soal standar. Error: ' + aiErr.message);
        setLoading(false);
        return;
      }

    } catch (err: any) {
      console.error('[DEBUG-SOALPAGE] Gagal memuat soal:', err);
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
    if (arah === 'prev' && nomorSoal > 0) {
      setNomorSoal(nomorSoal - 1);
    } else if (arah === 'next' && nomorSoal < soalList.length - 1) {
      setNomorSoal(nomorSoal + 1);
    }
  };

  const kirimJawaban = async () => {
    console.log('[DEBUG-SOALPAGE] kirimJawaban dipanggil');
    const total = soalList.length;
    const benar = soalList.filter((s, i) => s.jawaban_benar === jawaban[i]).length;
    const nilai = total > 0 ? Math.round((benar / total) * 100) : 0;
    setNilaiAkhir(nilai);

    // Hitung statistik elemen dari sesi ini
    const statistikElemen: Record<string, { benar: number; total: number }> = {};
    soalList.forEach((s, i) => {
      if (!statistikElemen[s.elemen]) statistikElemen[s.elemen] = { benar: 0, total: 0 };
      statistikElemen[s.elemen].total += 1;
      if (s.jawaban_benar === jawaban[i]) statistikElemen[s.elemen].benar += 1;
    });
    console.log('[DEBUG-SOALPAGE] Statistik elemen sesi ini:', statistikElemen);

    // Ambil riwayat lama
    const riwayatSebelum = getRiwayat(judul);
    console.log('[DEBUG-SOALPAGE] Riwayat sebelum simpan:', riwayatSebelum);
    setRiwayatSebelumnya(riwayatSebelum);

    setAnalisisLoading(true);
    setAnalisisError('');

    const riwayatBaru: RiwayatEntry = {
      tanggal: new Date().toISOString(),
      mataPelajaran: judul,
      nilai,
      statistikElemen,
    };

    try {
      tambahRiwayat(riwayatBaru);
      console.log('[DEBUG-SOALPAGE] Riwayat baru disimpan');
    } catch (err: any) {
      console.error('[DEBUG-SOALPAGE] Gagal menyimpan riwayat:', err);
    }

    // Rapor + Soal sesi berikutnya (parallel)
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
    }));

    const [hasilRaport, hasilSoalBaru] = await Promise.allSettled([
      generateRaport(judul, items, riwayatSebelum),
      generateSoalAdaptif(judul, soalList.length, statistikElemen, kelasTargetSesi, 'sampai'),
    ]);

    // Simpan cache soal untuk sesi berikutnya
    if (hasilSoalBaru.status === 'fulfilled') {
      localStorage.setItem(cacheKey, JSON.stringify(hasilSoalBaru.value));
      console.log('[DEBUG-SOALPAGE] Soal untuk sesi berikutnya telah disimpan di cache');
    } else {
      console.warn('[DEBUG-SOALPAGE] Gagal generate soal untuk sesi berikutnya:', hasilSoalBaru.reason);
      localStorage.removeItem(cacheKey);
    }

    // Tampilkan rapor
    try {
      if (hasilRaport.status === 'rejected') throw hasilRaport.reason;
      const hasil = hasilRaport.value;
      setRaport(hasil);

      const capaianMatch = hasil.match(/\*\*Capaian:\*\*\s*(.+)/);
      const capaian = capaianMatch ? capaianMatch[1].trim() : undefined;
      perbaruiCapaian(judul, riwayatBaru.tanggal, capaian);
    } catch (err: any) {
      console.error('[DEBUG-SOALPAGE] Gagal analisis rapor:', err);
      setAnalisisError('Gagal menganalisis hasil: ' + (err?.message ?? String(err)));
    } finally {
      setAnalisisLoading(false);
    }
  };

  const handleHapusRiwayat = () => {
    if (window.confirm(`Yakin ingin menghapus semua riwayat untuk "${judul}"? Tindakan ini tidak bisa dibatalkan.`)) {
      hapusRiwayatMapel(judul);
      localStorage.removeItem(`soal_adaptif_${judul}`);
      setRiwayatSebelumnya([]);
      alert(`Riwayat untuk "${judul}" telah dihapus.`);
    }
  };

  const formatWaktu = (): string => {
    const menit = Math.floor(waktu / 60);
    const detik = waktu % 60;
    return `${menit.toString().padStart(2, '0')}:${detik.toString().padStart(2, '0')}`;
  };

  if (loading) return (
    <div className="loading">
      <p>{loadingMessage}</p>
      {sesiUjian > 1 && <p style={{ fontSize: '14px', opacity: 0.7 }}>Sesi ke-{sesiUjian} • Mohon tunggu sebentar</p>}
    </div>
  );
  
  if (error) return <div className="error">{error}</div>;

  // ===== HALAMAN RAPOR =====
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
              >
                {raport}
              </div>

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

  // ===== HALAMAN PENGERJAAN SOAL =====
  const soal = soalList[nomorSoal];
  return (
    <div className="soal-page">
      <div className="header">
        <button onClick={onKembali} className="btn-kembali">← Kembali</button>
        <h1>{judul}</h1>
        <div className="timer">⏱️ {formatWaktu()}</div>
      </div>

      {/* Badge Sumber Soal & Sesi */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '10px', 
        margin: '10px 0',
        flexWrap: 'wrap'
      }}>
        <span style={{ 
          background: sumberSoal === 'adaptif' ? '#10b981' : '#6b7280', 
          color: '#fff', 
          padding: '4px 12px', 
          borderRadius: '999px', 
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {sumberSoal === 'adaptif' ? '🤖 Soal AI' : '📚 Soal Standar'}
        </span>
        <span style={{ 
          background: '#4338ca', 
          color: '#fff', 
          padding: '4px 12px', 
          borderRadius: '999px', 
          fontSize: '12px' 
        }}>
          Sesi ke-{sesiUjian}
        </span>
      </div>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${((nomorSoal + 1) / soalList.length) * 100}%` }}
        />
      </div>

      <div className="soal-container">
        <div className="soal-item">
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
          </div>
          <p className="pertanyaan">
            <span className="nomor">Soal {nomorSoal + 1}/{soalList.length}</span>
            <br />
            {soal.pertanyaan}
          </p>
          <div className="pilihan">
            {soal.pilihan.map((pilihan, pIndex) => (
              <label
                key={pIndex}
                className={jawaban[nomorSoal] === pilihan ? 'dipilih' : ''}
              >
                <input
                  type="radio"
                  name={`soal-${nomorSoal}`}
                  value={pilihan}
                  checked={jawaban[nomorSoal] === pilihan}
                  onChange={() => pilihJawaban(pilihan)}
                />
                {pilihan}
              </label>
            ))}
          </div>
        </div>

        <div className="navigasi">
          <button
            onClick={() => navigasiSoal('prev')}
            disabled={nomorSoal === 0}
            className="btn-nav"
          >
            ← Sebelumnya
          </button>

          {nomorSoal === soalList.length - 1 ? (
            <button onClick={kirimJawaban} className="btn-kirim">
              Kirim Jawaban
            </button>
          ) : (
            <button onClick={() => navigasiSoal('next')} className="btn-nav">
              Selanjutnya →
            </button>
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

import { useState, useEffect } from 'react';
import './SoalPage.css';
import { generateRaport } from '../agent/raport';
import { getRiwayat, tambahRiwayat, type RiwayatEntry } from '../utils/riwayat';

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

  // State untuk rapor hasil analisis AI
  const [raport, setRaport] = useState<string | null>(null);
  const [analisisLoading, setAnalisisLoading] = useState<boolean>(false);
  const [analisisError, setAnalisisError] = useState<string>('');
  const [nilaiAkhir, setNilaiAkhir] = useState<number>(0);
  const [riwayatSebelumnya, setRiwayatSebelumnya] = useState<RiwayatEntry[]>([]);

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
    try {
      const base = import.meta.env.BASE_URL || '/vue-kim/';
      const response = await fetch(`${base}data/soal-${kodeSoal}.json`);

      if (!response.ok) throw new Error('Soal tidak ditemukan');

      const data: SoalData = await response.json();
      setJudul(data.judul);
      setSoalList(data.soal);
      setJawaban(new Array(data.soal.length).fill(''));
      setWaktu(data.waktu * 60);
    } catch (err: any) {
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
    const total = soalList.length;
    const benar = soalList.filter((s, i) => s.jawaban_benar === jawaban[i]).length;
    const nilai = total > 0 ? Math.round((benar / total) * 100) : 0;
    setNilaiAkhir(nilai);

    setAnalisisLoading(true);
    setAnalisisError('');

    try {
      const items = soalList.map((s, i) => ({
        nomor: i + 1,
        pertanyaan: s.pertanyaan,
        pilihan: s.pilihan,
        jawabanSiswa: jawaban[i] || '',
        jawabanBenar: s.jawaban_benar,
        elemen: s.elemen,
        fase: s.fase,
        taxonomiBloom: s.taxonomiBloom,
      }));

      const riwayatSebelum = getRiwayat(judul);
      setRiwayatSebelumnya(riwayatSebelum);

      const hasil = await generateRaport(judul, items, riwayatSebelum);
      setRaport(hasil);

      // Ekstrak baris "Capaian" dari hasil rapor untuk disimpan ringkas (opsional)
      const capaianMatch = hasil.match(/\*\*Capaian:\*\*\s*(.+)/);
      const capaian = capaianMatch ? capaianMatch[1].trim() : undefined;

      tambahRiwayat({
        tanggal: new Date().toISOString(),
        mataPelajaran: judul,
        nilai,
        capaian,
      });
    } catch (err: any) {
      setAnalisisError('Gagal menganalisis hasil: ' + err.message);

      // Tetap simpan nilai meskipun analisis AI gagal, supaya riwayat tidak hilang
      tambahRiwayat({
        tanggal: new Date().toISOString(),
        mataPelajaran: judul,
        nilai,
      });
    } finally {
      setAnalisisLoading(false);
    }
  };

  const formatWaktu = (): string => {
    const menit = Math.floor(waktu / 60);
    const detik = waktu % 60;
    return `${menit.toString().padStart(2, '0')}:${detik.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="loading">Memuat soal...</div>;
  if (error) return <div className="error">{error}</div>;

  // Layar rapor: tampil setelah jawaban dikirim (sedang dianalisis atau sudah selesai)
  if (analisisLoading || raport !== null || analisisError) {
    return (
      <div className="soal-page">
        <div className="header">
          <button onClick={onKembali} className="btn-kembali">← Kembali</button>
          <h1>Rapor Hasil Belajar — {judul}</h1>
        </div>

        <div className="soal-container" style={{ padding: '24px' }}>
          {analisisLoading && (
            <p>⏳ Sedang menganalisis jawabanmu dengan AI, mohon tunggu...</p>
          )}

          {!analisisLoading && analisisError && (
            <>
              <p style={{ color: '#f87171' }}>{analisisError}</p>
              <p>Nilai kamu: <strong>{nilaiAkhir}/100</strong></p>
            </>
          )}

          {!analisisLoading && raport && (
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

          <button
            onClick={onKembali}
            className="btn-nav"
            style={{ marginTop: '20px' }}
          >
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
            <button
              onClick={() => navigasiSoal('next')}
              className="btn-nav"
            >
              Selanjutnya →
            </button>
          )}
        </div>
      </div>

      {/* Navigasi Nomor Soal */}
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
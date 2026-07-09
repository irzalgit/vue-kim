import { useState, useEffect } from 'react';
import './SoalPage.css';

interface SoalData {
  judul: string;
  kode: string;
  waktu: number;
  soal: {
    pertanyaan: string;
    pilihan: string[];
    jawaban_benar: string;
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

  const kirimJawaban = () => {
    const benar = soalList.filter((s, i) => s.jawaban_benar === jawaban[i]).length;
    alert(`Skor Anda: ${benar} / ${soalList.length}`);
    onKembali();
  };

  const formatWaktu = (): string => {
    const menit = Math.floor(waktu / 60);
    const detik = waktu % 60;
    return `${menit.toString().padStart(2, '0')}:${detik.toString().padStart(2, '0')}`;
  };

  if (loading) return <div className="loading">Memuat soal...</div>;
  if (error) return <div className="error">{error}</div>;

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

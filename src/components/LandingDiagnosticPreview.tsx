import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ref, onValue } from 'firebase/database';
import { db } from '../lib/firebase';

type Option = {
  id: string;
  teks: string;
};

type Question = {
  id: string;
  elemen: string;
  submateri: string;
  level: string;
  bentuk: string;
  pertanyaan: string;
  opsi: Option[];
};

type QuizData = {
  judul: string;
  jumlah_soal: number;
  durasi_menit: number;
  soal: Question[];
};

function normalizePreviewData(raw: any): QuizData {
  const rawSoal = Array.isArray(raw?.soal) ? raw.soal : [];
  const normalizedSoal: Question[] = rawSoal.map((s: any, idx: number) => {
    let opsi: Option[] = [];
    if (Array.isArray(s.opsi)) {
      opsi = s.opsi.map((o: any) => ({
        id: String(o.id ?? ''),
        teks: String(o.teks ?? o.text ?? ''),
      }));
    } else if (s.pilihan && typeof s.pilihan === 'object') {
      opsi = Object.entries(s.pilihan).map(([key, val]) => ({
        id: key,
        teks: String(val),
      }));
    }

    return {
      id: String(s.id || `SOAL-${idx + 1}`),
      elemen: String(s.elemen || s.materi || 'Matematika'),
      submateri: String(s.submateri || s.topik || ''),
      level: String(s.level || s.level_kognitif || 'Standar'),
      bentuk: String(s.bentuk || s.bentuk_soal || 'PG'),
      pertanyaan: String(s.pertanyaan || s.soal || ''),
      opsi,
    };
  });

  return {
    judul: String(raw.judul || 'Latihan Soal TKA Matematika'),
    jumlah_soal: Number(raw.jumlah_soal) || normalizedSoal.length,
    durasi_menit: Number(raw.durasi_menit) || 60,
    soal: normalizedSoal,
  };
}

export default function LandingDiagnosticPreview() {
  const { user } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [data, setData] = useState<QuizData | null>(null);

  useEffect(() => {
    if (!user) {
      setIsPremium(false);
      return;
    }

    const userRef = ref(db, `users/${user.uid}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      const val = snapshot.val();
      if (val) {
        const until = Math.max(
          Number(val.premium_until) || 0,
          Number(val.premiumExpired) || 0
        );
        setIsPremium(until > Date.now());
      } else {
        setIsPremium(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    let cancelled = false;
    const targetFile = isPremium ? 'soal_1.json' : 'soal-tka-diagnostik.json';
    const primaryUrl = `${import.meta.env.BASE_URL}data/${targetFile}`;
    const fallbackUrl = isPremium ? `${import.meta.env.BASE_URL}data/sesi_1.json` : null;

    const loadPreview = async () => {
      try {
        let response = await fetch(primaryUrl);
        if (!response.ok && fallbackUrl) {
          response = await fetch(fallbackUrl);
        }
        if (!response.ok) throw new Error('Gagal memuat soal');
        const raw = await response.json();
        if (cancelled) return;
        setData(normalizePreviewData(raw));
      } catch (error) {
        if (!cancelled) console.error('Soal pratinjau:', error);
      }
    };

    loadPreview();

    return () => {
      cancelled = true;
    };
  }, [isPremium]);

  const mulaiTes = () => {
    window.location.hash = '#/tka';
  };

  return (
    <section
      aria-labelledby="diagnostik-title"
      style={{
        margin: '24px auto 40px',
        maxWidth: '900px',
        padding: '24px',
        borderRadius: '24px',
        border: '1px solid #334155',
        background: 'linear-gradient(145deg, #172554, #0f172a)',
        color: '#fff',
      }}
    >
      <div style={{ textAlign: 'center', marginBottom: '24px' }}>
        <div style={{ fontSize: '36px' }}>{isPremium ? '👑' : '📝'}</div>
        <h2
          id="diagnostik-title"
          style={{ fontSize: '26px', fontWeight: 800, margin: '8px 0' }}
        >
          {isPremium ? 'Latihan Soal Prediksi TKA 2026' : 'Tes Diagnostik Matematika'}
        </h2>
        <p style={{ color: '#cbd5e1', lineHeight: 1.7 }}>
          {isPremium
            ? 'Akses Premium Aktif! Kerjakan 25 butir soal prediksi TKA Matematika Wajib kelas XII.'
            : 'Uji kemampuan awalmu dan temukan materi matematika yang perlu ditingkatkan.'}
        </p>
        {data && (
          <p style={{ color: '#67e8f9', fontSize: '14px', marginTop: '8px' }}>
            {data.jumlah_soal} soal · {data.durasi_menit} menit
          </p>
        )}
      </div>

      {data?.soal?.[0] ? (
        <div
          style={{
            background: '#fff',
            color: '#0f172a',
            borderRadius: '18px',
            padding: '22px',
          }}
        >
          <p style={{ color: '#0891b2', fontWeight: 700, fontSize: '13px' }}>
            {isPremium ? 'CONTOH SOAL PREDIKSI TKA' : 'CONTOH SOAL'} · {data.soal[0].elemen}
          </p>
          <p style={{ fontSize: '17px', fontWeight: 600, lineHeight: 1.8, margin: '12px 0' }}>
            {data.soal[0].pertanyaan}
          </p>

          <div style={{ display: 'grid', gap: '10px' }}>
            {data.soal[0].opsi.map((option) => (
              <div
                key={option.id}
                style={{
                  padding: '12px 14px',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  lineHeight: 1.6,
                }}
              >
                <strong style={{ marginRight: '10px' }}>{option.id}.</strong>
                {option.teks}
              </div>
            ))}
          </div>
          <p style={{ color: '#64748b', fontSize: '12px', marginTop: '14px' }}>
            Ini pratinjau soal. Jawaban dan skor dikerjakan pada halaman tes.
          </p>
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: '#cbd5e1' }}>
          {isPremium ? 'Memuat contoh soal latihan...' : 'Memuat contoh soal diagnostik...'}
        </p>
      )}

      <button
        type="button"
        onClick={mulaiTes}
        style={{
          display: 'block',
          width: '100%',
          marginTop: '22px',
          padding: '16px',
          border: 0,
          borderRadius: '14px',
          background: isPremium ? '#10b981' : '#06b6d4',
          color: '#022c22',
          fontWeight: 800,
          fontSize: '16px',
          cursor: 'pointer',
        }}
      >
        {isPremium ? 'Kerjakan Soal Prediksi TKA (Sesi 1) →' : 'Mulai Tes Diagnostik →'}
      </button>
    </section>
  );
}

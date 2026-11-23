
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { db, signInWithGoogle } from '../lib/firebase';
import { ref, onValue } from 'firebase/database';
import {
  CheckCircle2,
  QrCode,
  Sparkles,
  MessageCircle,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';

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
  kunci_id: string[];
  pembahasan: string;
};

type QuizData = {
  kode: string;
  judul: string;
  jumlah_soal: number;
  durasi_menit: number;
  skor_maksimal: number;
  petunjuk: string;
  soal: Question[];
};

type TopicStat = {
  total: number;
  benar: number;
};

export default function TkaDiagnostikPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loginError, setLoginError] = useState('');

  const handleGoogleLogin = async () => {
    setLoginError('');
    try {
      await signInWithGoogle();
    } catch (error) {
      console.error('Login Google gagal:', error);
      setLoginError('Login belum berhasil. Silakan coba kembali.');
    }
  };
  const [isPremium, setIsPremium] = useState(false);
  const [premiumUntil, setPremiumUntil] = useState<number | null>(null);

  const [data, setData] = useState<QuizData | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [finished, setFinished] = useState(false);
  const [seconds, setSeconds] = useState(600);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Pantau status langganan TKA Premium user secara realtime
  useEffect(() => {
    if (!user) {
      setIsPremium(false);
      setPremiumUntil(null);
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
      const active = until > Date.now();
      setIsPremium(active);
      setPremiumUntil(until || null);
      } else {
        setIsPremium(false);
        setPremiumUntil(null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Memuat soal diagnostik dari folder public/data.
  useEffect(() => {
    let cancelled = false;

    fetch(
      `${import.meta.env.BASE_URL}data/soal-tka-diagnostik.json`
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error('Gagal memuat soal');
        }

        return response.json();
      })
      .then((result: QuizData) => {
        if (cancelled) return;

        if (!Array.isArray(result.soal) || result.soal.length === 0) {
          throw new Error('Data soal kosong');
        }

        setData(result);
        setSeconds(
          Math.max(1, Number(result.durasi_menit) || 10) * 60
        );
      })
      .catch((error) => {
        if (cancelled) return;

        console.error('Gagal memuat soal TKA:', error);
        setLoadError(
          'Soal TKA gagal dimuat. Periksa koneksi internet, kemudian coba lagi.'
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Timer berhenti setelah tes selesai.
  useEffect(() => {
    if (!data || finished) return;

    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(timer);
          setFinished(true);
          return 0;
        }

        return value - 1;
      });
    }, 1000);

    return () => window.clearInterval(timer);
  }, [data, finished]);

  // Jawaban harus sama persis dengan seluruh kunci.
  const score = useMemo(() => {
    if (!data || data.soal.length === 0) return 0;

    let correct = 0;

    for (const question of data.soal) {
      const answer = [...(answers[question.id] ?? [])].sort();
      const key = [...question.kunci_id].sort();

      if (
        answer.length === key.length &&
        answer.every((value, i) => value === key[i])
      ) {
        correct++;
      }
    }

    const maxScore = Number(data.skor_maksimal) || 100;

    return Math.round(
      (correct / data.soal.length) * maxScore
    );
  }, [data, answers]);

  // Evaluasi berdasarkan elemen atau materi soal.
  const topicStats = useMemo(() => {
    const stats: Record<string, TopicStat> = {};

    if (!data) return stats;

    for (const question of data.soal) {
      const topic = question.elemen || 'Materi lainnya';

      const answer = [...(answers[question.id] ?? [])].sort();
      const key = [...question.kunci_id].sort();

      const correct =
        answer.length === key.length &&
        answer.every((value, i) => value === key[i]);

      if (!stats[topic]) {
        stats[topic] = { total: 0, benar: 0 };
      }

      stats[topic].total++;

      if (correct) {
        stats[topic].benar++;
      }
    }

    return stats;
  }, [data, answers]);

  const handleSubscribeViaCheckout = () => {
    if (!user) {
      setLoginError('Silakan login dengan Google sebelum berlangganan.');
      return;
    }
    const baseUrl = '/checkout.html';
    const params = new URLSearchParams({
      productId: 'premium_1bulan',
      productName: 'Langganan TKA Premium (1 Bulan)',
      price: '10000',
      type: 'subscription',
      ...(user?.displayName ? { name: user.displayName } : {}),
      ...(user?.email ? { email: user.email } : {}),
    });
    window.location.href = `${baseUrl}?${params.toString()}`;
  };

  const handlePayViaWa = () => {
    if (!user) {
      setLoginError('Silakan login dengan Google sebelum menghubungi admin.');
      return;
    }
    const adminWa = '6282189392233';
    const invoiceNo = `INV-TKA-${Date.now().toString().slice(-6)}`;
    const text =
      `Halo Admin Math315, saya ingin berlangganan *TKA Matematika Premium (1 Bulan)*:\n\n` +
      `📦 *Paket:* Langganan TKA Premium (1 Bulan)\n` +
      `💰 *Harga:* Rp 10.000 / bulan\n` +
      `👤 *Nama:* ${user?.displayName || 'Siswa'}\n` +
      `📧 *Email:* ${user?.email || '-'}\n` +
      `🆔 *UID:* ${user?.uid || '-'}\n` +
      `📄 *Draft Ref:* ${invoiceNo}\n\n` +
      `Mohon kirim barcode QRIS DANA untuk aktivasi langganan TKA Premium saya. Terima kasih!`;
    window.open(`https://wa.me/${adminWa}?text=${encodeURIComponent(text)}`, '_blank');
  };

  // Tampilan ketika soal sedang dimuat atau gagal dimuat.
  if (!data) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl bg-slate-900 p-8">
          <p className="text-sm font-bold text-cyan-400">
            PORTAL MATEMATIKA
          </p>

          <h1 className="mt-2 text-2xl font-bold">
            Tes TKA Matematika
          </h1>

          <p className="mt-3 text-slate-300">
            {loadError || 'Memuat soal...'}
          </p>

          {loadError && (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950"
            >
              Coba Lagi
            </button>
          )}
        </div>
      </main>
    );
  }

  // Hasil tes.
  if (finished) {
    const maxScore = Number(data.skor_maksimal) || 100;

    const weakestTopics = Object.entries(topicStats)
      .filter(([, stat]) => stat.benar < stat.total)
      .sort(
        (a, b) =>
          a[1].benar / a[1].total -
          b[1].benar / b[1].total
      );

    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl bg-slate-900 p-6 shadow-xl sm:p-10">
          <p className="text-sm font-bold text-cyan-400">
            HASIL TES DIAGNOSTIK
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Skor Anda: {score}/{maxScore}
          </h1>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full rounded-full bg-cyan-400"
              style={{
                width: `${Math.min(
                  100,
                  (score / maxScore) * 100
                )}%`,
              }}
            />
          </div>

          <p className="mt-4 text-slate-300">
            Hasil ini membantu menentukan materi yang perlu
            dilatih sebelum mengikuti TKA Matematika.
          </p>

          {/* Evaluasi per materi */}
          <section className="mt-6 rounded-2xl bg-slate-800 p-5">
            <h2 className="text-lg font-bold">
              Evaluasi per Materi
            </h2>

            <div className="mt-4 space-y-4">
              {Object.entries(topicStats).map(([topic, stat]) => {
                const percentage = Math.round(
                  (stat.benar / stat.total) * 100
                );

                return (
                  <div key={topic}>
                    <div className="flex justify-between gap-3 text-sm">
                      <span>{topic}</span>

                      <span>
                        {stat.benar}/{stat.total} benar
                      </span>
                    </div>

                    <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-700">
                      <div
                        className="h-full rounded-full bg-cyan-400"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 border-t border-slate-700 pt-4">
              <p className="font-semibold">
                Rekomendasi belajar
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                {weakestTopics.length > 0
                  ? `Prioritaskan latihan ${
                      weakestTopics
                        .slice(0, 3)
                        .map(([topic]) => topic)
                        .join(', ')
                    }.`
                  : 'Semua soal dijawab dengan benar. Lanjutkan latihan untuk mempertahankan kemampuan.'}
              </p>
            </div>
          </section>

          {/* Sesi 1: belum diaktifkan */}
          <section className="mt-6 rounded-2xl border border-slate-700 bg-slate-800/70 p-5">
            <p className="text-sm font-bold text-cyan-300">
              LANJUTAN LATIHAN TKA
            </p>

            <h2 className="mt-2 text-xl font-bold text-white">
              Sesi 1 — Latihan TKA Matematika
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-300">
              Soal latihan Sesi 1 sedang dipersiapkan.
              Tombol ini akan diaktifkan setelah sesi tersedia.
            </p>

            <button
              type="button"
              disabled
              aria-disabled="true"
              title="Sesi 1 belum tersedia"
              className="mt-4 flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl bg-slate-700 px-5 py-3.5 font-bold text-slate-400 opacity-80"
            >
              <span>Sesi 1 — Segera Hadir</span>
              <ArrowRight className="h-5 w-5" />
            </button>

            <p className="mt-2 text-center text-xs text-slate-500">
              Belum aktif · Belum dapat dibuka
            </p>
          </section>

          {/* Status Langganan / Penawaran Premium */}
          {isPremium ? (
            <section className="mt-6 rounded-2xl border border-emerald-500/50 bg-emerald-950/40 p-5 shadow-lg">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-sm">
                <CheckCircle2 className="h-5 w-5" />
                <span>STATUS BERLANGGANAN AKTIF</span>
              </div>

              <h2 className="mt-2 text-xl font-bold text-white">
                TKA Matematika Premium Aktif
              </h2>

              <p className="mt-2 text-sm leading-6 text-emerald-200/90">
                {premiumUntil
                  ? `Masa aktif langganan Anda berlaku hingga ${new Date(
                      premiumUntil
                    ).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}. Anda memiliki akses penuh ke seluruh sesi latihan TKA.`
                  : 'Akun Anda telah memiliki akses penuh ke sesi latihan TKA Matematika Premium.'}
              </p>

              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-5 py-3.5 font-bold text-slate-950 transition hover:bg-emerald-400"
              >
                <span>Buka Sesi Latihan TKA di Dashboard</span>
                <ArrowRight className="h-5 w-5" />
              </button>
            </section>
          ) : (
            <section className="mt-6 rounded-2xl border border-cyan-500/40 bg-cyan-950/40 p-5 shadow-lg">
              <div className="flex items-center justify-between">
                <p className="text-sm font-bold text-cyan-300">
                  LANJUTKAN PERSIAPAN TKA
                </p>
                <span className="rounded-full bg-cyan-500/20 px-3 py-0.5 text-xs font-semibold text-cyan-300">
                  Akses 30 Hari
                </span>
              </div>

              <h2 className="mt-2 text-xl font-bold">
                TKA Matematika Premium
              </h2>

              <p className="mt-2 text-sm leading-6 text-slate-300">
                Lanjutkan belajar melalui lima sesi latihan TKA adaptif.
                Pelajari materi, kerjakan soal terstruktur, dan evaluasi
                hasil latihan secara bertahap.
              </p>

              <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
                <li className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>5 Sesi Latihan TKA adaptif berbasis kisi-kisi resmi</span>
                </li>
                <li className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>Pembahasan kunci jawaban & diagnosa kemampuan terperinci</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-cyan-400 shrink-0" />
                  <span>Akses penuh selama 1 bulan tanpa batas</span>
                </li>
              </ul>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-3xl font-extrabold text-white">
                  Rp10.000
                </span>
                <span className="text-sm font-normal text-slate-400">
                  / bulan
                </span>
              </div>

              <button
                type="button"
                onClick={handleSubscribeViaCheckout}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-400 px-5 py-3.5 font-bold text-slate-950 transition hover:bg-cyan-300"
              >
                <QrCode className="h-5 w-5" />
                <span>Berlangganan Sekarang via QRIS (Rp10.000)</span>
              </button>

              <button
                type="button"
                onClick={handlePayViaWa}
                className="mt-2.5 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-2.5 text-xs font-semibold text-slate-200 transition hover:bg-slate-800 hover:text-white"
              >
                <MessageCircle className="h-4 w-4 text-emerald-400" />
                <span>Bantuan / Bayar via WhatsApp Admin</span>
              </button>

              {loginError && (
                <p role="alert" className="mt-3 rounded-lg bg-red-950/50 p-3 text-sm text-red-300">
                  {loginError}
                </p>
              )}

              {!user && (
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="mt-3 flex w-full items-center justify-center rounded-xl bg-blue-600 px-5 py-3 font-bold text-white hover:bg-blue-500"
                >
                  Login dengan Google untuk berlangganan
                </button>
              )}

              <p className="mt-3 text-center text-xs leading-5 text-slate-400">
                Pembayaran instan via QRIS (BCA, Mandiri, BRI, DANA, GoPay, OVO).
                Aktivasi otomatis & terverifikasi.
              </p>
            </section>
          )}

          <div className="mt-6 rounded-2xl bg-slate-800 p-5">
            <p className="font-semibold">
              Portal Matematika
            </p>

            <p className="mt-2 text-sm text-slate-300">
              Simpan hasil tes ini dan diskusikan materi yang
              perlu dilatih bersama guru atau orang tua.
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl border border-slate-600 px-5 py-3 font-semibold hover:bg-slate-800"
          >
            Ulangi Tes
          </button>
        </div>
      </main>
    );
  }

  const question = data.soal[index];
  const multi = question.bentuk === 'PG_KOMPLEKS';
  const selected = answers[question.id] ?? [];

  const minutes = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');

  const secs = (seconds % 60)
    .toString()
    .padStart(2, '0');

  // Menyimpan pilihan jawaban.
  const choose = (id: string) => {
    setAnswers((previous) => {
      const current = previous[question.id] ?? [];

      const next = multi
        ? current.includes(id)
          ? current.filter((item) => item !== id)
          : [...current, id]
        : [id];

      return {
        ...previous,
        [question.id]: next,
      };
    });
  };

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-6 text-white">
      <div className="mx-auto max-w-3xl">
        <header className="mb-5 rounded-3xl bg-slate-900 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-cyan-400">
                PORTAL MATEMATIKA
              </p>

              <h1 className="mt-1 text-2xl font-bold">
                {data.judul}
              </h1>
            </div>

            <div
              className={`rounded-xl px-3 py-2 text-center ${
                seconds <= 60
                  ? 'bg-red-950 text-red-300'
                  : 'bg-slate-800'
              }`}
            >
              <div className="text-xs text-slate-400">
                Waktu
              </div>

              <strong className="text-lg">
                {minutes}:{secs}
              </strong>
            </div>
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full bg-cyan-500 transition-all"
              style={{
                width: `${
                  ((index + 1) / data.soal.length) * 100
                }%`,
              }}
            />
          </div>

          <div className="mt-4 border-t border-slate-700 pt-3">
            {user ? (
              <div className="flex items-center gap-3">
                {user.photoURL && (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Foto pengguna'}
                    className="h-9 w-9 rounded-full"
                  />
                )}
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">
                    {user.displayName || user.email || 'Pengguna Portal Matematika'}
                  </p>
                  <p className="truncate text-xs text-slate-400">
                    {user.email}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-amber-300">
                  Guest · Belum login
                </p>
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  className="mt-3 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-500"
                >
                  Login dengan Google
                </button>
              </div>
            )}
            {loginError && (
              <p className="mt-2 text-sm text-red-300">{loginError}</p>
            )}
          </div>

          <p className="mt-3 text-sm text-slate-400">
            Soal {index + 1} dari {data.soal.length}
            {' · '}
            {question.elemen}
            {' · '}
            {question.level}
          </p>
        </header>

        <section className="rounded-3xl bg-white p-6 text-slate-900 shadow-xl sm:p-8">
          <p className="text-lg font-semibold leading-8">
            {question.pertanyaan}
          </p>

          <p className="mt-2 text-sm text-slate-500">
            {multi
              ? 'Pilih semua jawaban yang benar.'
              : 'Pilih satu jawaban.'}
          </p>

          <div className="mt-6 space-y-3">
            {question.opsi.map((option) => {
              const active = selected.includes(option.id);

              return (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={active}
                  onClick={() => choose(option.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition ${
                    active
                      ? 'border-cyan-500 bg-cyan-50'
                      : 'border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full font-bold ${
                      active
                        ? 'bg-cyan-500 text-white'
                        : 'bg-slate-100'
                    }`}
                  >
                    {option.id}
                  </span>

                  <span>{option.teks}</span>
                </button>
              );
            })}
          </div>

          <div className="mt-8 flex justify-between gap-3">
            <button
              type="button"
              disabled={index === 0}
              onClick={() =>
                setIndex((value) => Math.max(0, value - 1))
              }
              className="rounded-xl border border-slate-300 px-4 py-3 disabled:opacity-30 sm:px-5"
            >
              Sebelumnya
            </button>

            {index < data.soal.length - 1 ? (
              <button
                type="button"
                onClick={() =>
                  setIndex((value) =>
                    Math.min(data.soal.length - 1, value + 1)
                  )
                }
                className="rounded-xl bg-slate-900 px-5 py-3 font-semibold text-white"
              >
                Berikutnya
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setFinished(true)}
                className="rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950"
              >
                Selesai & Lihat Hasil
              </button>
            )}
          </div>

          <p className="mt-5 text-xs leading-5 text-slate-500">
            Jawaban tersimpan selama halaman tes ini terbuka.
            Pastikan semua jawaban sudah diperiksa sebelum
            menyelesaikan tes.
          </p>
        </section>
      </div>
    </main>
  );
}

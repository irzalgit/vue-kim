import { useEffect, useMemo, useState } from 'react';

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

export default function TkaDiagnostikPage() {
  const [data, setData] = useState<QuizData | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [finished, setFinished] = useState(false);
  const [seconds, setSeconds] = useState(600);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}data/soal-tka-diagnostik.json`)
      .then((response) => {
        if (!response.ok) {
          throw new Error('Gagal memuat soal');
        }
        return response.json();
      })
      .then(setData)
      .catch((error) => {
        console.error(error);
        setData(null);
      });
  }, []);

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

  const score = useMemo(() => {
    if (!data) return 0;

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

    return correct * 10;
  }, [data, answers]);

  if (!data) {
    return (
      <main className="min-h-screen bg-slate-950 p-6 text-white">
        <div className="mx-auto max-w-3xl rounded-2xl bg-slate-900 p-8">
          <h1 className="text-2xl font-bold">
            Tes TKA Matematika
          </h1>

          <p className="mt-3 text-slate-300">
            Memuat soal...
          </p>
        </div>
      </main>
    );
  }

  if (finished) {
    return (
      <main className="min-h-screen bg-slate-950 px-4 py-8 text-white">
        <div className="mx-auto max-w-3xl rounded-3xl bg-slate-900 p-6 shadow-xl sm:p-10">

          <p className="text-sm font-semibold text-cyan-400">
            HASIL TES DIAGNOSTIK
          </p>

          <h1 className="mt-2 text-3xl font-bold">
            Skor Anda: {score}/100
          </h1>

          <p className="mt-3 text-slate-300">
            Gunakan hasil ini untuk menentukan materi yang perlu
            dilatih berikutnya.
          </p>

          <div className="mt-6 rounded-2xl bg-slate-800 p-5">
            <p className="font-semibold">
              Portal Matematika
            </p>

            <p className="mt-2 text-sm text-slate-300">
              Bagikan hasil ini kepada orang tua atau guru
              untuk mendiskusikan rencana belajar.
            </p>
          </div>

          <button
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-cyan-500 px-5 py-3 font-bold text-slate-950"
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
              <p className="text-sm font-semibold text-cyan-400">
                PORTAL MATEMATIKA
              </p>

              <h1 className="mt-1 text-2xl font-bold">
                {data.judul}
              </h1>
            </div>

            <div className="rounded-xl bg-slate-800 px-3 py-2 text-center">
              <div className="text-xs text-slate-400">
                Waktu
              </div>

              <strong>
                {minutes}:{secs}
              </strong>
            </div>

          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-700">
            <div
              className="h-full bg-cyan-500 transition-all"
              style={{
                width: `${((index + 1) / data.soal.length) * 100}%`,
              }}
            />
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

                  <span>
                    {option.teks}
                  </span>
                </button>
              );
            })}

          </div>

          <div className="mt-8 flex justify-between gap-3">

            <button
              type="button"
              disabled={index === 0}
              onClick={() => setIndex((value) => value - 1)}
              className="rounded-xl border border-slate-300 px-5 py-3 disabled:opacity-30"
            >
              Sebelumnya
            </button>

            {index < data.soal.length - 1 ? (

              <button
                type="button"
                onClick={() => setIndex((value) => value + 1)}
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

        </section>
      </div>
    </main>
  );
}

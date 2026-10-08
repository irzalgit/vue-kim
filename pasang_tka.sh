#!/usr/bin/env bash

set -e

PROJECT="$HOME/vue-kim"
DATA_DIR="$PROJECT/public/data"
PAGE_DIR="$PROJECT/src/pages"

echo "=========================================="
echo "  INSTALASI TKA DIAGNOSTIK"
echo "  Portal Matematika"
echo "=========================================="

if [ ! -d "$PROJECT" ]; then
    echo "ERROR: Direktori $PROJECT tidak ditemukan."
    exit 1
fi

cd "$PROJECT"

echo
echo "[1/6] Membuat direktori..."
mkdir -p "$DATA_DIR"
mkdir -p "$PAGE_DIR"

echo "[2/6] Membuat soal-tka-diagnostik.json..."

cat > "$DATA_DIR/soal-tka-diagnostik.json" <<'JSON'
{
  "kode": "TKA12-DIAGNOSTIK-01",
  "judul": "Tes Diagnostik TKA Matematika Kelas 12",
  "jumlah_soal": 10,
  "durasi_menit": 10,
  "skor_maksimal": 100,
  "petunjuk": "Pilih satu jawaban yang paling tepat. Soal nomor 10 memiliki lebih dari satu jawaban benar.",
  "soal": [
    {
      "id": "TKA12-D01",
      "elemen": "Aljabar",
      "submateri": "Fungsi dan komposisi",
      "level": "HOTS",
      "bentuk": "PG",
      "pertanyaan": "Diketahui f(x) = 2x - 3 dan g(x) = x² + 1. Jika (g ∘ f)(x) = 17, nilai x yang memenuhi adalah ...",
      "opsi": [
        {"id": "A", "teks": "-1/2"},
        {"id": "B", "teks": "1/2"},
        {"id": "C", "teks": "3/2"},
        {"id": "D", "teks": "7/2"},
        {"id": "E", "teks": "9/2"}
      ],
      "kunci_id": ["A", "D"],
      "pembahasan": "g(f(x)) = (2x - 3)² + 1 = 17. Maka (2x - 3)² = 16, sehingga 2x - 3 = ±4. Jadi x = -1/2 atau x = 7/2."
    },
    {
      "id": "TKA12-D02",
      "elemen": "Aljabar",
      "submateri": "Logaritma",
      "level": "Menengah",
      "bentuk": "PG",
      "pertanyaan": "Jika log₂(x - 1) = 3, nilai x adalah ...",
      "opsi": [
        {"id": "A", "teks": "7"},
        {"id": "B", "teks": "8"},
        {"id": "C", "teks": "9"},
        {"id": "D", "teks": "10"},
        {"id": "E", "teks": "11"}
      ],
      "kunci_id": ["C"],
      "pembahasan": "log₂(x - 1) = 3 berarti x - 1 = 2³ = 8. Jadi x = 9."
    },
    {
      "id": "TKA12-D03",
      "elemen": "Bilangan",
      "submateri": "Barisan aritmetika",
      "level": "Menengah",
      "bentuk": "PG",
      "pertanyaan": "Suatu barisan aritmetika mempunyai suku pertama 7 dan beda 4. Jika suku ke-n bernilai 51, maka n adalah ...",
      "opsi": [
        {"id": "A", "teks": "10"},
        {"id": "B", "teks": "11"},
        {"id": "C", "teks": "12"},
        {"id": "D", "teks": "13"},
        {"id": "E", "teks": "14"}
      ],
      "kunci_id": ["C"],
      "pembahasan": "Uₙ = a + (n - 1)b. Jadi 51 = 7 + 4(n - 1), sehingga n = 12."
    },
    {
      "id": "TKA12-D04",
      "elemen": "Geometri",
      "submateri": "Jarak titik ke garis",
      "level": "HOTS",
      "bentuk": "PG",
      "pertanyaan": "Jarak titik P(2,3) terhadap garis 3x + 4y - 12 = 0 adalah ...",
      "opsi": [
        {"id": "A", "teks": "2/5"},
        {"id": "B", "teks": "3/5"},
        {"id": "C", "teks": "4/5"},
        {"id": "D", "teks": "6/5"},
        {"id": "E", "teks": "7/5"}
      ],
      "kunci_id": ["D"],
      "pembahasan": "Jarak = |3(2) + 4(3) - 12| / √(3² + 4²) = 6/5."
    },
    {
      "id": "TKA12-D05",
      "elemen": "Trigonometri",
      "submateri": "Identitas trigonometri",
      "level": "Menengah",
      "bentuk": "PG",
      "pertanyaan": "Jika sin θ = 3/5 dan θ berada di kuadran I, maka nilai cos θ adalah ...",
      "opsi": [
        {"id": "A", "teks": "1/5"},
        {"id": "B", "teks": "2/5"},
        {"id": "C", "teks": "3/5"},
        {"id": "D", "teks": "4/5"},
        {"id": "E", "teks": "5/4"}
      ],
      "kunci_id": ["D"],
      "pembahasan": "sin²θ + cos²θ = 1, sehingga cos²θ = 16/25. Karena θ di kuadran I, cos θ = 4/5."
    },
    {
      "id": "TKA12-D06",
      "elemen": "Kalkulus",
      "submateri": "Turunan",
      "level": "HOTS",
      "bentuk": "PG",
      "pertanyaan": "Diberikan f(x) = x³ - 6x² + 9x + 2. Nilai x saat grafik f mempunyai titik stasioner adalah ...",
      "opsi": [
        {"id": "A", "teks": "x = 0 dan x = 2"},
        {"id": "B", "teks": "x = 1 dan x = 3"},
        {"id": "C", "teks": "x = 2 dan x = 3"},
        {"id": "D", "teks": "x = 1 dan x = 2"},
        {"id": "E", "teks": "x = 3 dan x = 4"}
      ],
      "kunci_id": ["B"],
      "pembahasan": "f'(x) = 3(x - 1)(x - 3). Jadi titik stasioner terjadi pada x = 1 dan x = 3."
    },
    {
      "id": "TKA12-D07",
      "elemen": "Kalkulus",
      "submateri": "Maksimum dan minimum",
      "level": "HOTS",
      "bentuk": "PG",
      "pertanyaan": "Sebuah persegi panjang mempunyai keliling 40 cm. Agar luasnya maksimum, panjang dan lebarnya harus ...",
      "opsi": [
        {"id": "A", "teks": "5 cm dan 15 cm"},
        {"id": "B", "teks": "8 cm dan 12 cm"},
        {"id": "C", "teks": "9 cm dan 11 cm"},
        {"id": "D", "teks": "10 cm dan 10 cm"},
        {"id": "E", "teks": "6 cm dan 14 cm"}
      ],
      "kunci_id": ["D"],
      "pembahasan": "Keliling 40 cm berarti p + l = 20. Luas maksimum terjadi ketika p = l, sehingga p = l = 10 cm."
    },
    {
      "id": "TKA12-D08",
      "elemen": "Data dan Peluang",
      "submateri": "Peluang",
      "level": "HOTS",
      "bentuk": "PG",
      "pertanyaan": "Sebuah kotak berisi 4 bola merah, 3 bola biru, dan 3 bola hijau. Jika satu bola diambil secara acak, peluang terambil bola yang bukan biru adalah ...",
      "opsi": [
        {"id": "A", "teks": "3/10"},
        {"id": "B", "teks": "4/10"},
        {"id": "C", "teks": "6/10"},
        {"id": "D", "teks": "7/10"},
        {"id": "E", "teks": "8/10"}
      ],
      "kunci_id": ["D"],
      "pembahasan": "Jumlah bola = 10 dan bola bukan biru = 7. Jadi peluangnya 7/10."
    },
    {
      "id": "TKA12-D09",
      "elemen": "Aljabar",
      "submateri": "Pemodelan matematika",
      "level": "HOTS",
      "bentuk": "PG",
      "pertanyaan": "Sebuah kendaraan menempuh 180 km. Jika kecepatannya dinaikkan 15 km/jam, waktu perjalanan menjadi 1 jam lebih singkat. Kecepatan awal kendaraan adalah ...",
      "opsi": [
        {"id": "A", "teks": "30 km/jam"},
        {"id": "B", "teks": "35 km/jam"},
        {"id": "C", "teks": "40 km/jam"},
        {"id": "D", "teks": "45 km/jam"},
        {"id": "E", "teks": "50 km/jam"}
      ],
      "kunci_id": ["D"],
      "pembahasan": "180/v - 180/(v + 15) = 1 menghasilkan v² + 15v - 2700 = 0. Jadi v = 45 km/jam karena kecepatan harus positif."
    },
    {
      "id": "TKA12-D10",
      "elemen": "Kalkulus",
      "submateri": "Turunan dan optimasi",
      "level": "HOTS",
      "bentuk": "PG_KOMPLEKS",
      "pertanyaan": "Diberikan f(x) = x³ - 3x² - 9x + 5. Pernyataan yang benar adalah ...",
      "opsi": [
        {"id": "A", "teks": "f'(x) = 3x² - 6x - 9"},
        {"id": "B", "teks": "Titik stasioner terjadi pada x = -1 dan x = 3"},
        {"id": "C", "teks": "x = -1 merupakan titik maksimum lokal"},
        {"id": "D", "teks": "x = 3 merupakan titik minimum lokal"},
        {"id": "E", "teks": "Grafik tidak mempunyai titik stasioner"}
      ],
      "kunci_id": ["A", "B", "C", "D"],
      "pembahasan": "f'(x) = 3(x - 3)(x + 1). Titik stasioner x = -1 dan x = 3. f''(x) = 6x - 6; pada -1 negatif sehingga maksimum lokal, sedangkan pada 3 positif sehingga minimum lokal."
    }
  ]
}
JSON

# Lalu buat halaman React:

cat > "$PAGE_DIR/TkaDiagnostikPage.tsx" <<'TSX'
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
    fetch('/data/soal-tka-diagnostik.json')
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
TSX

echo "[3/6] Backup App.tsx..."

cp src/App.tsx "src/App.tsx.bak-tka-$(date +%Y%m%d-%H%M%S)"

echo "[4/6] Menambahkan import dan route /tka..."

python3 - <<'PY'
from pathlib import Path

path = Path("src/App.tsx")
text = path.read_text(encoding="utf-8")

import_line = "import TkaDiagnostikPage from './pages/TkaDiagnostikPage';"

if import_line not in text:
    marker = "import LandingPage from './pages/LandingPage';"
    if marker not in text:
        raise SystemExit("Tidak menemukan lokasi import LandingPage.")
    text = text.replace(
        marker,
        marker + "\n" + import_line,
        1
    )

route_line = '<Route path="/tka" element={<TkaDiagnostikPage />} />'

if route_line not in text:
    marker = '<Route path="/" element={<LandingPage onMulai={() => navigate(\'/dashboard\')} />} />'

    if marker not in text:
        raise SystemExit(
            "Tidak menemukan route landing. "
            "Tambahkan route /tka secara manual."
        )

    text = text.replace(
        marker,
        marker + "\n          " + route_line,
        1
    )

path.write_text(text, encoding="utf-8")
PY

echo "[5/6] Memeriksa JSON..."

python3 - <<'PY'
import json
from pathlib import Path

path = Path("public/data/soal-tka-diagnostik.json")

data = json.loads(path.read_text(encoding="utf-8"))

assert data["jumlah_soal"] == 10
assert len(data["soal"]) == 10

for soal in data["soal"]:
    opsi = {o["id"] for o in soal["opsi"]}
    kunci = set(soal["kunci_id"])

    assert kunci.issubset(opsi), (
        f"Kunci tidak valid pada {soal['id']}"
    )

print("JSON OK")
print("Jumlah soal:", len(data["soal"]))
PY

echo "[6/6] Menjalankan build..."

npm run build

echo
echo "=========================================="
echo "  INSTALASI BERHASIL"
echo "=========================================="
echo
echo "Halaman:"
echo "  /tka"
echo
echo "File soal:"
echo "  public/data/soal-tka-diagnostik.json"
echo
echo "Komponen:"
echo "  src/pages/TkaDiagnostikPage.tsx"
echo
echo "Backup:"
echo "  src/App.tsx.bak-tka-*"
echo
echo "Build berhasil."
echo

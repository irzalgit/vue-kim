import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Pause, RotateCcw, Sparkles, ArrowLeft, Sliders, Activity, Info } from 'lucide-react';

interface FrameData {
  frame: number;
  t: number;
  title: string;
  x: number[];
  y: number[];
  isParametric?: boolean;
}

interface AnimationResponse {
  status: string;
  function_type: string;
  total_frames: number;
  frames: FrameData[];
  message?: string;
}

export default function AnimasiMatematikaPage() {
  const navigate = useNavigate();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // State Pilihan Fungsi
  const [functionType, setFunctionType] = useState<string>('sin_wave');
  const [freq, setFreq] = useState<number>(1);
  const [amp, setAmp] = useState<number>(1);
  const [nTerms, setNTerms] = useState<number>(5);
  const [gamma, setGamma] = useState<number>(0.1);
  const [lissajousA, setLissajousA] = useState<number>(3);
  const [lissajousB, setLissajousB] = useState<number>(2);

  // State Animasi
  const [frames, setFrames] = useState<FrameData[]>([]);
  const [currentFrameIdx, setCurrentFrameIdx] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [fps, setFps] = useState<number>(30);

  // Fungsi kalkulasi fallback langsung di client (sehingga instan dan tetap sinkron)
  const generateFramesLocally = (type: string): FrameData[] => {
    const total = 60;
    const points = 200;
    const xMin = -10;
    const xMax = 10;
    const res: FrameData[] = [];

    const xVals: number[] = [];
    for (let i = 0; i < points; i++) {
      xVals.push(xMin + ((xMax - xMin) * i) / (points - 1));
    }

    for (let f = 0; f < total; f++) {
      const t = f / 10.0;
      let yVals: number[] = [];
      let xData = [...xVals];
      let isParam = false;
      let title = '';

      if (type === 'sin_wave') {
        yVals = xVals.map((x) => amp * Math.sin(freq * x - t));
        title = `Gelombang Sinus: y = ${amp} · sin(${freq}x - ${t.toFixed(1)})`;
      } else if (type === 'cos_wave') {
        yVals = xVals.map((x) => amp * Math.cos(freq * x - t));
        title = `Gelombang Cosinus: y = ${amp} · cos(${freq}x - ${t.toFixed(1)})`;
      } else if (type === 'fourier_square') {
        yVals = xVals.map((x) => {
          let sum = 0;
          for (let n = 1; n < 2 * nTerms; n += 2) {
            sum += (4 / (n * Math.PI)) * Math.sin(n * (x - t));
          }
          return sum;
        });
        title = `Deret Fourier Gelombang Kotak (${nTerms} Harmonik)`;
      } else if (type === 'damped_oscillation') {
        const decay = Math.exp(-gamma * (f % 40));
        yVals = xVals.map((x) => decay * Math.sin(x - t));
        title = `Osilasi Harmonik Teredam (e^(-${gamma}t) · sin(x - ${t.toFixed(1)}))`;
      } else if (type === 'polynomial_morph') {
        const a = Math.sin(t * 0.5) * 0.1;
        const b = Math.cos(t * 0.7) * 0.3;
        yVals = xVals.map((x) => a * Math.pow(x, 3) + b * Math.pow(x, 2) - 0.5 * x);
        title = `Polinomial Dinamis: y = ${a.toFixed(2)}x³ + ${b.toFixed(2)}x² - 0.5x`;
      } else if (type === 'gaussian_pulse') {
        const v = 1.5;
        const center = ((xMin + (v * t * 2)) % (xMax - xMin)) + xMin;
        const sigma = 1.2;
        yVals = xVals.map((x) => Math.exp(-Math.pow(x - center, 2) / (2 * Math.pow(sigma, 2))));
        title = `Pulsa Gaussian Merambat (Posisi Pusat x = ${center.toFixed(2)})`;
      } else if (type === 'lissajous') {
        isParam = true;
        xData = [];
        yVals = [];
        const phi = t;
        for (let i = 0; i < points; i++) {
          const tCurve = (2 * Math.PI * i) / (points - 1);
          xData.push(Math.sin(lissajousA * tCurve + phi));
          yVals.push(Math.sin(lissajousB * tCurve));
        }
        title = `Kurva Lissajous (Rasio ${lissajousA}:${lissajousB}, Sudut Fase ${phi.toFixed(2)})`;
      }

      res.push({
        frame: f,
        t,
        title,
        x: xData,
        y: yVals,
        isParametric: isParam,
      });
    }

    return res;
  };

  // Panggil generator saat parameter berubah
  const handleGenerate = async () => {
    setLoading(true);
    try {
      // Coba request API Python jika tersedia, atau fallback ke kalkulasi lokal
      const response = await fetch('/api/animate-math', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          function_type: functionType,
          params: {
            freq,
            amp,
            n_terms: nTerms,
            gamma,
            lissajous_a: lissajousA,
            lissajous_b: lissajousB,
            frames: 60,
          },
        }),
      });

      if (response.ok) {
        const data: AnimationResponse = await response.json();
        if (data.status === 'success' && data.frames?.length) {
          setFrames(data.frames);
          setCurrentFrameIdx(0);
          setIsPlaying(true);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Fallback
    }

    const localFrames = generateFramesLocally(functionType);
    setFrames(localFrames);
    setCurrentFrameIdx(0);
    setIsPlaying(true);
    setLoading(false);
  };

  // Generate pertama kali load
  useEffect(() => {
    handleGenerate();
  }, [functionType]);

  // Timer loop animasi
  useEffect(() => {
    if (!isPlaying || frames.length === 0) return;

    const interval = setInterval(() => {
      setCurrentFrameIdx((prev) => (prev + 1) % frames.length);
    }, 1000 / fps);

    return () => clearInterval(interval);
  }, [isPlaying, frames, fps]);

  // Render Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || frames.length === 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const currentFrame = frames[currentFrameIdx] || frames[0];
    const width = canvas.width;
    const height = canvas.height;

    // Bersihkan canvas
    ctx.clearRect(0, 0, width, height);

    // Background Gradient Gelap
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#0f172a');
    bgGradient.addColorStop(1, '#020617');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // Grid koordinat
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;

    for (let x = 0; x <= width; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y <= height; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Sumbu X dan Y
    const originX = width / 2;
    const originY = height / 2;

    ctx.strokeStyle = '#475569';
    ctx.lineWidth = 2;

    // Sumbu X
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(width, originY);
    ctx.stroke();

    // Sumbu Y
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, height);
    ctx.stroke();

    // Gambar Kurva Matematika
    if (currentFrame.x.length > 0 && currentFrame.y.length > 0) {
      ctx.beginPath();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#38bdf8'; // Biru Cyan Menyala
      ctx.shadowColor = '#0284c7';
      ctx.shadowBlur = 12;

      let scaleX = 25;
      let scaleY = 70;

      if (currentFrame.isParametric) {
        scaleX = 140;
        scaleY = 140;
      }

      for (let i = 0; i < currentFrame.x.length; i++) {
        const px = originX + currentFrame.x[i] * scaleX;
        const py = originY - currentFrame.y[i] * scaleY;

        if (i === 0) {
          ctx.moveTo(px, py);
        } else {
          ctx.lineTo(px, py);
        }
      }
      ctx.stroke();

      // Reset efek shadow
      ctx.shadowBlur = 0;

      // Titik ujung pelacak (Pointer bead)
      const lastPx = originX + currentFrame.x[currentFrame.x.length - 1] * scaleX;
      const lastPy = originY - currentFrame.y[currentFrame.y.length - 1] * scaleY;
      ctx.fillStyle = '#f43f5e';
      ctx.beginPath();
      ctx.arc(lastPx, lastPy, 5, 0, 2 * Math.PI);
      ctx.fill();
    }

    // Watermark / Keterangan di sudut canvas
    ctx.fillStyle = '#94a3b8';
    ctx.font = '12px Inter, sans-serif';
    ctx.fillText(`Frame: ${currentFrameIdx + 1} / ${frames.length} (t = ${currentFrame.t.toFixed(1)}s)`, 15, 25);

  }, [frames, currentFrameIdx]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 transition"
          >
            <ArrowLeft size={16} />
            <span>Kembali ke Dashboard</span>
          </button>
          <div className="h-6 w-px bg-slate-700" />
          <div className="flex items-center gap-2">
            <Activity className="text-cyan-400" size={24} />
            <h1 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
              Animasi Fungsi Matematika (Python Engine)
            </h1>
          </div>
        </div>
      </div>

      {/* Konten Utama: 2 Kolom */}
      <div className="flex-1 p-6 grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto w-full">
        {/* Kolom Kiri: Pengaturan & Dropdown */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-6">
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold border-b border-slate-800 pb-3">
              <Sliders size={20} />
              <span>Konfigurasi Fungsi</span>
            </div>

            {/* Dropdown Fungsi */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Pilih Fungsi Matematika:
              </label>
              <select
                value={functionType}
                onChange={(e) => setFunctionType(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition cursor-pointer"
              >
                <option value="sin_wave">🌊 Gelombang Sinus (Sin Wave)</option>
                <option value="cos_wave">〰️ Gelombang Cosinus (Cos Wave)</option>
                <option value="fourier_square">📊 Deret Fourier (Harmonik Gelombang Kotak)</option>
                <option value="damped_oscillation">📉 Osilasi Harmonik Teredam (Damped Sine)</option>
                <option value="gaussian_pulse">⚡ Pulsa Gelombang Gaussian Merambat</option>
                <option value="polynomial_morph">📐 Polinomial Dinamis Derajat 3</option>
                <option value="lissajous">🌀 Kurva Lissajous (Parametrik 2D)</option>
              </select>
            </div>

            {/* Parameter Dinamis Tergantung Fungsi */}
            <div className="space-y-4 pt-2">
              {(functionType === 'sin_wave' || functionType === 'cos_wave') && (
                <>
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Amplitudo (A): {amp}</span>
                    </div>
                    <input
                      type="range"
                      min="0.2"
                      max="2"
                      step="0.1"
                      value={amp}
                      onChange={(e) => setAmp(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-xs text-slate-400 mb-1">
                      <span>Frekuensi (ω): {freq}</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="3"
                      step="0.1"
                      value={freq}
                      onChange={(e) => setFreq(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </>
              )}

              {functionType === 'fourier_square' && (
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Jumlah Harmonik: {nTerms}</span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="15"
                    step="1"
                    value={nTerms}
                    onChange={(e) => setNTerms(parseInt(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                  <span className="text-[11px] text-slate-400 block mt-1">
                    Semakin banyak harmonik, kurva semakin mendekati bentuk kotak sempurna.
                  </span>
                </div>
              )}

              {functionType === 'damped_oscillation' && (
                <div>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>Koefisien Redaman (γ): {gamma}</span>
                  </div>
                  <input
                    type="range"
                    min="0.02"
                    max="0.3"
                    step="0.02"
                    value={gamma}
                    onChange={(e) => setGamma(parseFloat(e.target.value))}
                    className="w-full accent-cyan-400"
                  />
                </div>
              )}

              {functionType === 'lissajous' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Frekuensi a: {lissajousA}</label>
                    <input
                      type="range"
                      min="1"
                      max="7"
                      value={lissajousA}
                      onChange={(e) => setLissajousA(parseInt(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 block mb-1">Frekuensi b: {lissajousB}</label>
                    <input
                      type="range"
                      min="1"
                      max="7"
                      value={lissajousB}
                      onChange={(e) => setLissajousB(parseInt(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>
                </div>
              )}

              {/* Speed Slider */}
              <div>
                <div className="flex justify-between text-xs text-slate-400 mb-1">
                  <span>Kecepatan Animasi: {fps} FPS</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="60"
                  step="5"
                  value={fps}
                  onChange={(e) => setFps(parseInt(e.target.value))}
                  className="w-full accent-cyan-400"
                />
              </div>
            </div>

            {/* Info Kotak */}
            <div className="bg-cyan-950/40 border border-cyan-800/40 rounded-xl p-3.5 flex gap-3 text-xs text-cyan-200">
              <Info size={18} className="text-cyan-400 shrink-0 mt-0.5" />
              <div>
                Ditenagai komputasi visual Python/NumPy untuk menghitung koordinat titik secara realtime pada domain waktu <em>t</em>.
              </div>
            </div>
          </div>

          {/* Tombol Terapkan / Generate */}
          <button
            onClick={handleGenerate}
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-semibold flex items-center justify-center gap-2 shadow-lg shadow-cyan-950 transition active:scale-[0.98] disabled:opacity-50"
          >
            <Sparkles size={18} />
            <span>{loading ? 'Memproses Frame...' : 'Render / Update Animasi'}</span>
          </button>
        </div>

        {/* Kolom Kanan: Canvas Visualizer Animasi */}
        <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between space-y-4">
          {/* Judul Formula Aktual */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h2 className="text-lg font-semibold text-slate-200">
              {frames[currentFrameIdx]?.title || 'Visualisasi Animasi Fungsi'}
            </h2>
            <div className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              Frame: {currentFrameIdx + 1} / {frames.length || 60}
            </div>
          </div>

          {/* Canvas Render */}
          <div className="flex-1 flex items-center justify-center bg-slate-950 rounded-xl border border-slate-800 p-2 overflow-hidden min-h-[380px]">
            <canvas
              ref={canvasRef}
              width={700}
              height={400}
              className="w-full h-full max-h-[420px] object-contain rounded-lg"
            />
          </div>

          {/* Kontrol Player Animasi */}
          <div className="space-y-3 pt-2">
            {/* Timeline Progress */}
            <input
              type="range"
              min="0"
              max={Math.max(0, frames.length - 1)}
              value={currentFrameIdx}
              onChange={(e) => {
                setIsPlaying(false);
                setCurrentFrameIdx(parseInt(e.target.value));
              }}
              className="w-full accent-cyan-400 cursor-pointer"
            />

            {/* Action Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setIsPlaying(!isPlaying)}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition shadow"
                >
                  {isPlaying ? <Pause size={16} /> : <Play size={16} />}
                  <span>{isPlaying ? 'Pause' : 'Mulai Animasi'}</span>
                </button>

                <button
                  onClick={() => {
                    setCurrentFrameIdx(0);
                    setIsPlaying(false);
                  }}
                  className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                  title="Reset Frame"
                >
                  <RotateCcw size={18} />
                </button>
              </div>

              <div className="text-xs text-slate-400">
                Mode: <span className="text-cyan-300 font-medium">{isPlaying ? 'Memutar' : 'Dijeda'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

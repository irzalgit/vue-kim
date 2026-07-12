import { useEffect } from 'react';
import { renderMathJax } from '../utils/helpers';

interface Soal {
  kode: string;
  kategori?: string;
  tanya: string;
  opsi: string[];
}

interface SoalCardProps {
  soal: Soal;
  index: number;
  jawaban: number[];
  onSimpan: (index: number, jawabanBaru: number[]) => void;
  onOpenAI: () => void;
}

export default function SoalCard({ soal, index, jawaban, onSimpan, onOpenAI }: SoalCardProps) {
  useEffect(() => {
    if (typeof renderMathJax === 'function') {
      renderMathJax();
    }
  }, [soal]);

  if (!soal) return null;

  const handleChange = (val: number, checked: boolean) => {
    const current = jawaban || [];
    let newJawaban: number[];
    if (checked) {
      newJawaban = [...current, val];
    } else {
      newJawaban = current.filter((v) => v !== val);
    }
    onSimpan(index, newJawaban);
  };

  return (
    <div
      className="soal-container active"
      style={{
        background: '#1e293b',
        border: '1px solid #334155',
        borderRadius: '16px',
        padding: '24px',
        color: '#fff',
      }}
    >
      <div className="flex justify-between mb-4">
        <span className="bg-indigo-500/20 text-indigo-300 px-3 py-1 rounded-full text-sm">
          📂 {soal.kategori || 'Umum'}
        </span>
        <span className="text-gray-400">Soal {index + 1}/25</span>
      </div>

      <p className="text-lg font-semibold mb-5">{soal.tanya}</p>

      <div className="space-y-3">
        {soal.opsi.map((op, i) => {
          const checked = jawaban?.includes(i) || false;
          return (
            <label
              key={i}
              className="flex items-center p-3 border rounded-xl cursor-pointer transition"
              style={{
                borderColor: checked ? '#6366f1' : '#334155',
                background: checked ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
              }}
            >
              <input
                type="checkbox"
                value={i}
                checked={checked}
                onChange={(e) => handleChange(i, e.target.checked)}
                className="w-5 h-5 mr-3 accent-indigo-500"
              />
              <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
              <span>{op}</span>
            </label>
          );
        })}
      </div>

      <div className="mt-6 text-center">
        <button
          type="button"
          onClick={onOpenAI}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-full hover:shadow-lg transition"
        >
          🦊 Tanya AI Gemini
        </button>
      </div>
    </div>
  );
}
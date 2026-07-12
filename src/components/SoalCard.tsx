import { useEffect } from 'react';
import { renderMathJax } from '../utils/helpers';

interface Soal {
  kategori?: string;
  tanya: string;
  opsi: string[];
}

interface SoalCardProps {
  soal: Soal;
  index: number;
  total: number;
  jawaban: number[] | undefined;
  onSimpan: (idx: number, newJawaban: number[]) => void;
  onOpenAI: () => void;
}

export default function SoalCard({ soal, index, total, jawaban, onSimpan, onOpenAI }: SoalCardProps) {
  useEffect(() => {
    renderMathJax();
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
    <div className="soal-container active">
      <div className="flex justify-between mb-4">
        <span className="bg-indigo-100 text-indigo-800 px-3 py-1 rounded-full text-sm">
          📂 {soal.kategori || 'Umum'}
        </span>
        <span className="text-gray-500">Soal {index + 1}/{total}</span>
      </div>
      
      <p className="text-lg font-semibold mb-5">{soal.tanya}</p>
      
      <div className="space-y-3">
        {soal.opsi.map((op, i) => {
          const checked = jawaban?.includes(i) || false;
          return (
            <label 
              key={i}
              className="flex items-center p-3 border rounded-xl hover:bg-blue-50 cursor-pointer transition"
            >
              <input 
                type="checkbox" 
                value={i} 
                checked={checked}
                onChange={(e) => handleChange(i, e.target.checked)}
                className="w-5 h-5 mr-3 accent-blue-600"
              />
              <span className="font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
              <span>{op}</span>
            </label>
          );
        })}
      </div>
      
      <div className="mt-6 text-center">
        <button 
          onClick={onOpenAI}
          className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white px-6 py-3 rounded-full hover:shadow-lg transition"
        >
          🦊 Tanya AI Gemini
        </button>
      </div>
    </div>
  );
}
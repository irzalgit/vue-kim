import { useState } from 'react';

interface Soal {
  kategori: string;
  tanya: string;
  opsi: string[];
}

interface Props {
  soal: Soal;
  index: number;
  jawaban: number[];
  onSimpan: (index: number, jawaban: number[]) => void;
  onOpenAI: () => void;
}

export default function SoalCard({ soal, index, jawaban, onSimpan, onOpenAI }: Props) {
  const [selected, setSelected] = useState<number[]>(jawaban || []);

  const handlePilih = (idx: number) => {
    const newSelected = selected.includes(idx)
      ? selected.filter(i => i !== idx)
      : [...selected, idx];
    setSelected(newSelected);
    onSimpan(index, newSelected);
  };

  return (
    <div style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', maxWidth: '500px' }}>
      <span style={{ background: '#3b82f6', padding: '4px 12px', borderRadius: '20px', fontSize: '12px' }}>
        {soal.kategori}
      </span>
      <h3 style={{ margin: '16px 0 12px' }}>{soal.tanya}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {soal.opsi.map((opsi, i) => (
          <label key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={selected.includes(i)}
              onChange={() => handlePilih(i)}
            />
            {opsi}
          </label>
        ))}
      </div>
      <button
        onClick={onOpenAI}
        style={{ marginTop: '16px', background: '#10b981', padding: '8px 16px', borderRadius: '8px', border: 'none', color: '#fff' }}
      >
        Tanya AI
      </button>
    </div>
  );
}
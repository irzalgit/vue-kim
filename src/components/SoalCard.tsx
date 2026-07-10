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

export default function SoalCard({
  soal,
  index,
  jawaban,
  onSimpan,
  onOpenAI,
}: Props) {
  const [selected, setSelected] = useState<number[]>(jawaban);

  const handlePilih = (idx: number) => {
    const baru = selected.includes(idx)
      ? selected.filter((i) => i !== idx)
      : [...selected, idx];

    setSelected(baru);
    onSimpan(index, baru);
  };

  return (
    <div
      style={{
        background: '#1e293b',
        padding: '20px',
        borderRadius: '12px',
        maxWidth: '500px',
      }}
    >
      <span
        style={{
          background: '#3b82f6',
          padding: '4px 12px',
          borderRadius: '20px',
          fontSize: '12px',
          color: '#fff',
        }}
      >
        {soal.kategori}
      </span>

      <h3 style={{ margin: '16px 0 12px', color: '#fff' }}>
        {soal.tanya}
      </h3>

      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          color: '#fff',
        }}
      >
        {soal.opsi.map((opsi, i) => (
          <label
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
            }}
          >
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
        style={{
          marginTop: '16px',
          background: '#10b981',
          color: '#fff',
          border: 'none',
          padding: '10px 16px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
      >
        Tanya AI
      </button>
    </div>
  );
}
import { useState } from 'react';
import { db } from '../lib/firebase';
import { ref, update } from 'firebase/database';

interface ProfileCompletionModalProps {
  isOpen: boolean;
  uid: string;
  onComplete: () => void;
}

export default function ProfileCompletionModal({ isOpen, uid, onComplete }: ProfileCompletionModalProps) {
  const [kelas, setKelas] = useState('');
  const [sekolah, setSekolah] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async () => {
    try {
      const userRef = ref(db, `siswa/${uid}`);
      await update(userRef, {
        kelas: parseInt(kelas),
        sekolah: sekolah,
        profileCompleted: true
      });
      onComplete();
    } catch (error) {
      console.error('Error completing profile:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 p-6 rounded-2xl w-full max-w-sm text-white">
        <h2 className="text-xl font-bold mb-4">Lengkapi Profil</h2>
        <input
          type="number"
          placeholder="Kelas (contoh: 12)"
          value={kelas}
          onChange={(e) => setKelas(e.target.value)}
          className="w-full bg-gray-700 p-2 rounded mb-3 text-white"
        />
        <input
          type="text"
          placeholder="Asal Sekolah"
          value={sekolah}
          onChange={(e) => setSekolah(e.target.value)}
          className="w-full bg-gray-700 p-2 rounded mb-4 text-white"
        />
        <button
          onClick={handleSubmit}
          className="w-full bg-blue-600 p-2 rounded font-bold"
        >
          Simpan
        </button>
      </div>
    </div>
  );
}

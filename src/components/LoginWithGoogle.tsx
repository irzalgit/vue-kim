import { useState } from "react";
import { signInWithPopup } from "firebase/auth";
import { auth, googleProvider, db } from "../lib/firebase";
import { ref, set, get } from "firebase/database";
import { useAuth } from "../context/AuthContext";

export default function LoginWithGoogle() {
  const { user, loading } = useAuth();
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const handleLogin = async () => {
    setFeedback(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;

      const userRef = ref(db, `data_siswa/${user.uid}`);
      const snapshot = await get(userRef);
      if (!snapshot.exists()) {
        await set(userRef, {
          username: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          assigned_at: new Date().toISOString(),
          kelas: 0 
        });
      }
      setFeedback({ message: "Sukses login!", type: 'success' });
      // Hapus pesan setelah 3 detik
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      console.error("Login gagal:", err);
      setFeedback({ message: "Gagal login, silakan coba lagi.", type: 'error' });
    }
  };

  if (loading) return <p>Memuat...</p>;

  if (user) {
    return (
      <div className="flex items-center gap-4">
        {user.photoURL && <img src={user.photoURL} alt={user.displayName || 'User'} width={40} style={{ borderRadius: "50%" }} />}
        <div>
          <p className="font-bold">Selamat datang, {user.displayName}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <button 
        onClick={handleLogin} 
        disabled={!!user}
        className={`px-4 py-2 rounded text-white font-bold ${user ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        Login dengan Google
      </button>
      {feedback && (
        <p className={`mt-2 ${feedback.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
          {feedback.message}
        </p>
      )}
    </div>
  );
}

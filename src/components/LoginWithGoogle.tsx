import { useState } from "react";
import { signInWithGoogle, db } from "../lib/firebase";
import { ref, set, get } from "firebase/database";
import { useAuth } from "../context/AuthContext";
import InAppBrowserNotice from "./InAppBrowserNotice";
import { isInAppBrowser } from "../lib/inAppBrowser";

const getErrorMessage = (code: string) => {
  const messages: Record<string, string> = {
    'auth/popup-blocked':
      'Jendela login diblokir browser. Izinkan pop-up (klik ikon gembok/pengaturan di samping URL) lalu klik Login lagi.',
    'auth/popup-closed-by-user':
      'Jendela login ditutup sebelum selesai. Silakan klik Login lagi.',
    'auth/cancelled-popup-request':
      'Login sedang diproses, silakan tunggu sebentar...',
    'auth/operation-not-allowed':
      'Provider Google belum diaktifkan di Firebase Console.',
    'auth/operation-not-supported-in-this-environment':
      'Login Google tidak didukung di browser ini. Silakan buka di Google Chrome atau Safari.',
    'auth/unauthorized-domain':
      'Domain web ini belum diizinkan di Firebase Console > Authentication > Settings > Authorized domains.',
    'auth/network-request-failed':
      'Koneksi internet bermasalah. Periksa jaringan Anda.',
    'auth/missing-initial-state':
      'Sesi login diblokir oleh browser. Harap gunakan Google Chrome normal dan izinkan pop-up.',
  };
  return messages[code] || `Login gagal (${code}). Silakan coba lagi.`;
};

export default function LoginWithGoogle() {
  const { user, loading } = useAuth();
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isLogging, setIsLogging] = useState(false);
  const inApp = isInAppBrowser();

  const handleLogin = async () => {
    if (isLogging) return;
    setFeedback(null);
    setIsLogging(true);

    try {
      const result = await signInWithGoogle();
      const loggedInUser = result.user;

      const userRef = ref(db, `data_siswa/${loggedInUser.uid}`);
      const snapshot = await get(userRef);

      if (!snapshot.exists()) {
        await set(userRef, {
          username: loggedInUser.displayName,
          email: loggedInUser.email,
          photoURL: loggedInUser.photoURL,
          assigned_at: new Date().toISOString(),
          kelas: 0
        });
      }

      setFeedback({ message: "Sukses login!", type: "success" });
    } catch (err: unknown) {
      const code =
        typeof err === "object" && err !== null && "code" in err
          ? String((err as { code: string }).code)
          : "unknown";

      console.error("Login gagal:", code, err);
      setFeedback({
        message: getErrorMessage(code),
        type: "error"
      });
    } finally {
      setIsLogging(false);
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

  if (inApp) {
    return (
      <div className="max-w-md w-full">
        <InAppBrowserNotice />
      </div>
    );
  }

  return (
    <div>
      <button 
        onClick={handleLogin} 
        disabled={!!user || isLogging}
        className={`px-4 py-2 rounded text-white font-bold ${user ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {isLogging ? 'Menghubungkan ke Google...' : 'Login dengan Google'}
      </button>
      {feedback && (
        <p className={`mt-2 ${feedback.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
          {feedback.message}
        </p>
      )}
    </div>
  );
}

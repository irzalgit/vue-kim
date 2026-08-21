import { useState } from 'react';
import Pass from './pass';
import { signInWithGoogle } from '../lib/firebase';
import ProfileCompletionModal from './ProfileCompletionModal';
import { get, ref } from 'firebase/database';
import { db } from '../lib/firebase';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: () => void;
}

export default function LoginModal({ isOpen, onClose, onLoginSuccess }: LoginModalProps) {
  const [showCompletion, setShowCompletion] = useState(false);
  const [uid, setUid] = useState('');

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithGoogle();
      const user = result.user;
      
      // Cek apakah profil sudah lengkap
      const snapshot = await get(ref(db, `siswa/${user.uid}`));
      if (snapshot.exists() && snapshot.val().profileCompleted) {
        onLoginSuccess();
      } else {
        setUid(user.uid);
        setShowCompletion(true);
      }
    } catch (error) {
      console.error('Firebase Login failed', error);
    }
  };

  const checkProfile = async (uid: string) => {
    try {
      const snapshot = await get(ref(db, `siswa/${uid}`));
      if (snapshot.exists() && snapshot.val().profileCompleted) {
        onLoginSuccess();
      } else {
        setUid(uid);
        setShowCompletion(true);
      }
    } catch (error) {
      console.error('Profile check failed', error);
    }
  };

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: '#1a1a1a',
            padding: '30px',
            borderRadius: '16px',
            width: '300px',
            color: 'white',
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h2 style={{ marginBottom: '20px' }}>Login</h2>
          <Pass onCheckProfile={checkProfile} />
          <button
            onClick={handleGoogleLogin}
            style={{
              marginTop: '10px',
              padding: '10px',
              width: '100%',
              backgroundColor: '#4285F4',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            Login with Google
          </button>
        </div>
      </div>
      <ProfileCompletionModal 
        isOpen={showCompletion} 
        uid={uid} 
        onComplete={onLoginSuccess} 
      />
    </>
  );
}

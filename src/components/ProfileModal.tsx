
import { X, User, BarChart, BookOpen, GraduationCap, Calendar, Coins, LogOut } from 'lucide-react';
import { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface UserData {
  username: string;
  kelas: number;
  assigned_at: string;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<any>(null);
  const { logout } = useAuth();

  useEffect(() => {
    if (isOpen) {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        setUserData(JSON.parse(savedUser));
      }
      setFirebaseUser(auth.currentUser);
    }
  }, [isOpen]);

  const handleBuyToken = () => {
    const CHECKOUT_URL = import.meta.env.DEV 
      ? '/checkout.html' 
      : 'https://math315.id/checkout.html';
    window.location.href = CHECKOUT_URL;
  };

  const handleLogout = async () => {
    await logout();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-800 rounded-2xl p-6 w-full max-w-md text-white relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X size={24} />
        </button>

        <div className="flex flex-col items-center mb-6">
          {firebaseUser?.photoURL ? (
            <img src={firebaseUser.photoURL} alt="Profile" className="w-24 h-24 rounded-full mb-4 object-cover" />
          ) : (
            <div className="bg-gray-700 p-4 rounded-full mb-4">
              <User size={48} className="text-gray-300" />
            </div>
          )}
          <h2 className="text-2xl font-bold">{firebaseUser?.displayName || userData?.username || 'User'}</h2>
          <div className="flex items-center text-gray-400 mt-1 gap-2">
            <GraduationCap size={16} />
            <p>Kelas {userData?.kelas || '-'}</p>
          </div>
          <div className="flex items-center text-gray-500 mt-1 gap-2 text-sm">
            <Calendar size={14} />
            <p>Sejak: {userData?.assigned_at || '-'}</p>
          </div>
        </div>

        <div className="mb-6 bg-gray-700/50 p-4 rounded-xl">
          <label className="block text-sm font-medium text-gray-400 mb-2">Model AI Pilihan</label>
          <select 
            className="w-full bg-gray-800 border border-gray-600 rounded-lg p-2 text-white"
            value={localStorage.getItem('preferredModel') || 'gemini-3.5-flash'}
            onChange={(e) => localStorage.setItem('preferredModel', e.target.value)}
          >
            <option value="gemini-1.5-flash">Gemini 1.5 Flash</option>
            <option value="gemini-1.5-pro">Gemini 1.5 Pro</option>
            <option value="gemini-2.0-flash">Gemini 2.0 Flash</option>
            <option value="gemini-3.5-flash">Gemini 3.5 Flash (Default)</option>
            <option value="gemini-3.6-flash">Gemini 3.6 Flash</option>
            <option value="gemini-3.7-flash">Gemini 3.7 Flash</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-700/50 p-4 rounded-xl text-center">
            <div className="flex justify-center text-blue-400 mb-2">
              <BookOpen size={24} />
            </div>
            <div className="text-2xl font-bold">12</div>
            <div className="text-xs text-gray-400">Simulasi</div>
          </div>
          <div className="bg-gray-700/50 p-4 rounded-xl text-center">
            <div className="flex justify-center text-yellow-400 mb-2">
              <BarChart size={24} />
            </div>
            <div className="text-2xl font-bold">150</div>
            <div className="text-xs text-gray-400">Soal Dikerjakan</div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={handleBuyToken}
            className="w-full p-3 rounded-xl bg-gradient-to-r from-yellow-500 to-orange-500 hover:opacity-90 transition font-semibold flex items-center justify-center gap-2"
          >
            <Coins size={18} />
            Beli Token
          </button>
          <button
            onClick={handleLogout}
            className="w-full p-3 rounded-xl bg-blue-600 hover:bg-blue-700 transition font-semibold flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Logout
          </button>
          <button
            onClick={onClose}
            className="w-full p-3 rounded-xl bg-gray-700 hover:bg-gray-600 transition font-semibold"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}

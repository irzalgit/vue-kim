import React, { useEffect, useState } from 'react';
import { db } from '../lib/firebase';
import { useAuth } from '../context/AuthContext';
import { 
  ref, 
  onValue, 
  set, 
  onDisconnect, 
  serverTimestamp, 
  type Unsubscribe 
} from 'firebase/database';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';

interface OnlineUser {
  id: string;
  name?: string;
  photoURL?: string;
  isLoggedIn: boolean;
  joinedAt: number;
}

// Buat session ID acak per tab/window browser jika belum ada di sessionStorage
function getTabSessionId(): string {
  try {
    let sid = sessionStorage.getItem('__vuekim_presence_sid');
    if (!sid) {
      sid = 'tab_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
      sessionStorage.setItem('__vuekim_presence_sid', sid);
    }
    return sid;
  } catch (e) {
    return 'tab_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
  }
}

export const FloatingOnlineUsers: React.FC = () => {
  const { user } = useAuth();
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  useEffect(() => {
    const sessionId = getTabSessionId();
    const myPresenceRef = ref(db, `presence/${sessionId}`);
    const connectedRef = ref(db, '.info/connected');
    const presenceListRef = ref(db, 'presence');

    // Simpan payload user
    const userData: Record<string, any> = {
      isLoggedIn: !!user,
      name: user?.displayName || user?.email?.split('@')[0] || 'Tamu',
      photoURL: user?.photoURL || '',
      joinedAt: serverTimestamp(),
      lastSeen: serverTimestamp(),
    };
    if (user?.uid) {
      userData.uid = user.uid;
    }

    // 1. Tangani status koneksi Firebase
    const unsubConnected: Unsubscribe = onValue(connectedRef, (snap) => {
      if (snap.val() === true) {
        // Otomatis hapus saat diskonek / tab ditutup
        onDisconnect(myPresenceRef).remove().catch((err) => {
          console.warn('[Presence] onDisconnect error:', err);
        });

        // Set status online sekarang
        set(myPresenceRef, userData).catch((err) => {
          console.error('[Presence] Error setting status:', err);
        });
      }
    });

    // 2. Dengarkan seluruh user online secara realtime
    const unsubPresence: Unsubscribe = onValue(
      presenceListRef, 
      (snapshot) => {
        const val = snapshot.val();
        if (val && typeof val === 'object') {
          const users: OnlineUser[] = Object.entries(val).map(([key, item]: [string, any]) => ({
            id: key,
            name: item.name || 'Tamu',
            photoURL: item.photoURL || '',
            isLoggedIn: !!item.isLoggedIn,
            joinedAt: item.joinedAt || Date.now(),
          }));
          setOnlineCount(Math.max(1, users.length));
          setOnlineUsers(users);
        } else {
          setOnlineCount(1);
          setOnlineUsers([]);
        }
      },
      (error) => {
        console.error('[Presence] Listen error (cek Firebase Rules):', error);
      }
    );

    // 3. Heartbeat berkala (update lastSeen tiap 45 detik)
    const heartbeatInterval = setInterval(() => {
      set(ref(db, `presence/${sessionId}/lastSeen`), serverTimestamp()).catch(() => {});
    }, 45000);

    // 4. Bersihkan saat unmount
    return () => {
      clearInterval(heartbeatInterval);
      unsubConnected();
      unsubPresence();
      set(myPresenceRef, null).catch(() => {});
    };
  }, [user]);

  return (
    <div className="fixed bottom-5 right-5 z-[9990] flex flex-col items-end font-sans select-none">
      {/* Detail Popover saat diklik (Accordion / Popup) */}
      {isExpanded && (
        <div className="mb-2 w-60 rounded-xl border border-white/15 bg-black/90 p-3 shadow-2xl backdrop-blur-md text-white animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">Pengguna Aktif</span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              {onlineCount} Online
            </span>
          </div>
          <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
            {onlineUsers.length === 0 ? (
              <p className="text-xs text-zinc-400 py-1">Hanya Anda (1 Online)</p>
            ) : (
              onlineUsers.map((u) => (
                <div key={u.id} className="flex items-center gap-2 text-xs py-1 px-1.5 rounded bg-white/5 border border-white/5">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt={u.name} className="w-5 h-5 rounded-full object-cover" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] text-zinc-300 font-bold">
                      {u.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  )}
                  <span className="truncate flex-1 text-zinc-200 text-[11px] font-medium">{u.name}</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0 shadow-[0_0_6px_#10b981]" />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Floating Capsule Badge */}
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className="group flex items-center gap-2 rounded-full border border-white/20 bg-black/80 hover:bg-black/95 px-3.5 py-2 text-xs font-medium text-white shadow-xl backdrop-blur-md transition-all hover:scale-105 active:scale-95 hover:border-emerald-500/50"
      >
        {/* Pulsing Green Indicator */}
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-[0_0_8px_#10b981]"></span>
        </span>

        <Users className="w-3.5 h-3.5 text-zinc-300 group-hover:text-emerald-400 transition-colors" />
        <span className="font-bold text-zinc-100">{onlineCount}</span>
        <span className="text-zinc-400 text-[11px] hidden sm:inline">Online</span>

        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-zinc-400 ml-0.5 group-hover:text-white" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5 text-zinc-400 ml-0.5 group-hover:text-white" />
        )}
      </button>
    </div>
  );
};

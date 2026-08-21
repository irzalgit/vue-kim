import { useState } from 'react';

export const USERNAME = 'irzal';

const VALID_USERS = [
  { 
    username: 'irzal', 
    password: '123456', 
    kelas: 9, 
    assigned_at: '2026-08-01' 
  },
  { 
    username: 'demo', 
    password: '123', 
    kelas: 8, 
    assigned_at: '2026-01-01' 
  },
];

interface PassProps {
  onCheckProfile: (uid: string) => void;
}

export default function Pass({ onCheckProfile }: PassProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');

  const handleLogin = () => {
    const isValidUser = VALID_USERS.find(
      (user) => user.username === username && user.password === password
    );

    if (isValidUser) {
      // Untuk demo, gunakan username sebagai UID
      // Di masa depan ini harus diganti dengan sistem auth yang sesungguhnya
      onCheckProfile(isValidUser.username); 
    } else {
      setMessage('Username atau Password salah');
    }
  };

  return (
    <div style={{ color: 'white', padding: '10px' }}>
      <input
        type="text"
        placeholder="Username"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #333', background: '#2a2a2a', color: 'white' }}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        style={{ width: '100%', padding: '10px', marginBottom: '10px', borderRadius: '8px', border: '1px solid #333', background: '#2a2a2a', color: 'white' }}
      />
      <button
        onClick={handleLogin}
        style={{
          width: '100%',
          padding: '10px',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
        }}
      >
        Masuk
      </button>
      {message && <p style={{ marginTop: '10px', textAlign: 'center', color: message === 'OK' ? 'green' : 'red' }}>{message}</p>}
    </div>
  );
}

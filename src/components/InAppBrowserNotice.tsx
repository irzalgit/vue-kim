// src/components/InAppBrowserNotice.tsx
import { useState } from 'react';
import { copyCurrentLink, isAndroid, openInChrome } from '../lib/inAppBrowser';

export default function InAppBrowserNotice() {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const ok = await copyCurrentLink();
    setCopied(ok);
    if (!ok) window.prompt('Salin link ini lalu buka di Chrome/Safari:', window.location.href);
  };

  const btn: React.CSSProperties = {
    padding: '10px 14px',
    width: '100%',
    border: 'none',
    borderRadius: 8,
    cursor: 'pointer',
    fontWeight: 700,
    fontSize: 14,
  };

  return (
    <div
      role="alert"
      style={{
        background: '#422006',
        border: '1px solid #f59e0b',
        color: '#fde68a',
        borderRadius: 12,
        padding: 14,
        fontSize: 13,
        lineHeight: 1.5,
        textAlign: 'left',
      }}
    >
      <strong>Login Google tidak bisa di browser aplikasi ini.</strong>
      <p style={{ margin: '6px 0 10px' }}>
        Browser bawaan TikTok/Instagram diblokir oleh Google. Buka halaman ini di
        Chrome atau Safari, lalu login.
      </p>

      {isAndroid() && (
        <button
          type="button"
          onClick={openInChrome}
          style={{ ...btn, background: '#f59e0b', color: '#1c1917', marginBottom: 8 }}
        >
          Buka di Chrome
        </button>
      )}

      <button
        type="button"
        onClick={handleCopy}
        style={{ ...btn, background: '#27272a', color: '#fff' }}
      >
        {copied ? 'Link disalin ✓' : 'Salin link'}
      </button>

      <p style={{ margin: '10px 0 0', fontSize: 12, opacity: 0.85 }}>
        Atau ketuk ⋯ (menu) di pojok layar, lalu pilih "Buka di browser".
      </p>
    </div>
  );
}

// src/lib/inAppBrowser.ts
// Google memblokir login OAuth di WebView (TikTok, Instagram, Facebook, dll).

export function isInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || '';

  const known =
    /TikTok|musical_ly|BytedanceWebview|Bytedance|trill|FBAN|FBAV|FB_IAB|Instagram|Snapchat|MicroMessenger|Line\/|Twitter|LinkedInApp/i;
  if (known.test(ua)) return true;

  // WebView Android umum: "; wv)"
  if (/; wv\)/i.test(ua)) return true;

  // WebView iOS: ada AppleWebKit tapi tanpa token "Safari"
  if (/iPhone|iPad|iPod/i.test(ua) && /AppleWebKit/i.test(ua) && !/Safari/i.test(ua)) {
    return true;
  }
  return false;
}

export function isAndroid(): boolean {
  return typeof navigator !== 'undefined' && /Android/i.test(navigator.userAgent);
}

// Android: paksa buka di Chrome lewat intent URL.
export function openInChrome(): void {
  const { host, pathname, search, hash } = window.location;
  window.location.href =
    `intent://${host}${pathname}${search}${hash}` +
    `#Intent;scheme=https;package=com.android.chrome;end`;
}

export async function copyCurrentLink(): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(window.location.href);
    return true;
  } catch {
    return false;
  }
}

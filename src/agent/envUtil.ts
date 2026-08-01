// src/agent/envUtil.ts
// Helper agar bisa membaca env var baik saat dijalankan lewat Vite (browser/build)
// maupun langsung lewat Node.js (tsx, mcp server, dll)

interface ViteEnvMeta {
  env: Record<string, string | undefined>;
}

export function getEnv(key: string): string {
  // Vite (browser/build time)
  if (typeof import.meta !== 'undefined' && 'env' in import.meta) {
    const val = (import.meta as unknown as ViteEnvMeta).env[key];
    if (val) return val;
  }
  // Node.js (tsx, mcp server, dll)
  if (typeof process !== 'undefined' && process.env) {
    const val = process.env[key] || process.env[key.replace(/^VITE_/, '')];
    if (val) return val;
  }
  return "";
}

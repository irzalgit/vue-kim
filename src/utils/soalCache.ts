// src/utils/soalCache.ts
import type { SoalItemGenerated } from '../agent/generateSoal';

const DB_NAME = 'vue_kim_bank_soal_db';
const DB_VERSION = 1;
const STORE_NAME = 'soal_topik';
const LOCALSTORAGE_PREFIX = 'vuekim_soal_cache_';

interface BankRecord {
  topikId: string;
  soal: SoalItemGenerated[];
  updatedAt: number;
}

/**
 * Buka atau inisialisasi IndexedDB
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB tidak didukung di lingkungan ini'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'topikId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Fallback LocalStorage: Ambil soal per topik
 */
function getFromLocalStorage(topikId: string): SoalItemGenerated[] {
  try {
    const raw = localStorage.getItem(LOCALSTORAGE_PREFIX + topikId);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : (data.soal || []);
  } catch (e) {
    console.warn('[soalCache] Gagal baca dari localStorage:', e);
    return [];
  }
}

/**
 * Fallback LocalStorage: Simpan soal per topik
 */
function saveToLocalStorage(topikId: string, soal: SoalItemGenerated[]): void {
  try {
    localStorage.setItem(LOCALSTORAGE_PREFIX + topikId, JSON.stringify(soal));
  } catch (e) {
    console.warn('[soalCache] Gagal simpan ke localStorage (mungkin kuota penuh):', e);
  }
}

/**
 * Simpan daftar soal ke Bank Soal (IndexedDB dengan Fallback LocalStorage).
 * Otomatis melakukan deduplikasi berdasarkan teks pertanyaan.
 */
export async function saveSoalToBank(
  topikId: string,
  newSoal: SoalItemGenerated[]
): Promise<void> {
  if (!topikId || !newSoal || newSoal.length === 0) return;

  try {
    const existing = await getAllSoalFromBank(topikId);
    const existingQuestions = new Set(existing.map((s) => s.pertanyaan.trim()));

    const filteredNew = newSoal.filter((s) => !existingQuestions.has(s.pertanyaan.trim()));
    const merged = [...existing, ...filteredNew];

    try {
      const db = await openDB();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const record: BankRecord = {
          topikId,
          soal: merged,
          updatedAt: Date.now(),
        };
        const req = store.put(record);
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch {
      // Fallback ke localStorage jika IndexedDB gagal
      saveToLocalStorage(topikId, merged);
    }
  } catch (err) {
    console.error(`[soalCache] Error saat saveSoalToBank(${topikId}):`, err);
  }
}

/**
 * Mengambil semua soal yang tersimpan untuk sebuah topikId
 */
export async function getAllSoalFromBank(topikId: string): Promise<SoalItemGenerated[]> {
  if (!topikId) return [];

  try {
    const db = await openDB();
    return await new Promise<SoalItemGenerated[]>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(topikId);

      req.onsuccess = () => {
        const res = req.result as BankRecord | undefined;
        resolve(res ? res.soal : getFromLocalStorage(topikId));
      };
      req.onerror = () => {
        resolve(getFromLocalStorage(topikId));
      };
    });
  } catch {
    return getFromLocalStorage(topikId);
  }
}

/**
 * Mengambil sejumlah `count` soal dari Bank Soal untuk topik tertentu.
 * Jika tersedia cukup soal di bank, mengembalikan array soal (diacak).
 * Jika soal belum ada atau kurang dari `count`, mengembalikan array kosong / sebagian.
 */
export async function getSoalFromBank(
  topikId: string,
  count: number = 1
): Promise<SoalItemGenerated[]> {
  const all = await getAllSoalFromBank(topikId);
  if (all.length === 0) return [];

  // Acak urutan soal dari bank agar variatif
  const shuffled = [...all].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

/**
 * Cek apakah stok soal di bank mencukupi
 */
export async function hasEnoughSoalInBank(
  topikId: string,
  count: number = 1
): Promise<boolean> {
  const all = await getAllSoalFromBank(topikId);
  return all.length >= count;
}

/**
 * Hapus seluruh cache bank soal
 */
export async function clearAllBankSoal(): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.clear();
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Abaikan jika indexedDB gagal
  }

  // Bersihkan juga localStorage yang ber-prefix
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCALSTORAGE_PREFIX)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => localStorage.removeItem(k));
  } catch (e) {
    console.warn('[soalCache] Gagal membersihkan localStorage:', e);
  }
}

/**
 * Statistik bank soal lokal
 */
export async function getBankSoalStats(): Promise<{
  totalSoal: number;
  totalTopik: number;
  detail: Record<string, number>;
}> {
  const detail: Record<string, number> = {};
  let totalSoal = 0;

  try {
    const db = await openDB();
    const records = await new Promise<BankRecord[]>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    for (const rec of records) {
      const count = rec.soal?.length || 0;
      detail[rec.topikId] = count;
      totalSoal += count;
    }
  } catch {
    // Fallback baca localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCALSTORAGE_PREFIX)) {
        const topikId = key.replace(LOCALSTORAGE_PREFIX, '');
        const soal = getFromLocalStorage(topikId);
        detail[topikId] = soal.length;
        totalSoal += soal.length;
      }
    }
  }

  return {
    totalSoal,
    totalTopik: Object.keys(detail).length,
    detail,
  };
}

/**
 * Ekspor semua data bank soal dari semua topik
 */
export async function exportAllBankSoal(): Promise<Record<string, SoalItemGenerated[]>> {
  const result: Record<string, SoalItemGenerated[]> = {};

  try {
    const db = await openDB();
    const records = await new Promise<BankRecord[]>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });

    for (const rec of records) {
      if (rec.topikId && rec.soal && rec.soal.length > 0) {
        result[rec.topikId] = rec.soal;
      }
    }
  } catch {
    // Fallback ambil dari localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(LOCALSTORAGE_PREFIX)) {
        const topikId = key.replace(LOCALSTORAGE_PREFIX, '');
        const soal = getFromLocalStorage(topikId);
        if (soal.length > 0) {
          result[topikId] = soal;
        }
      }
    }
  }

  return result;
}

export interface RiwayatEntry {
  tanggal: string; // ISO string
  mataPelajaran: string;
  nilai: number; // 0-100
  capaian?: string; // ringkasan singkat, misal "Baik", "Perlu Peningkatan"
}

const STORAGE_KEY = 'riwayat-belajar';

function bacaSemua(): RiwayatEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Gagal membaca riwayat belajar:', e);
    return [];
  }
}

export function getRiwayat(mataPelajaran?: string): RiwayatEntry[] {
  const semua = bacaSemua();
  const hasil = mataPelajaran
    ? semua.filter((r) => r.mataPelajaran === mataPelajaran)
    : semua;

  // urutkan dari yang terbaru
  return hasil.sort(
    (a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()
  );
}

export function tambahRiwayat(entry: RiwayatEntry) {
  try {
    const semua = bacaSemua();
    semua.push(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(semua));
  } catch (e) {
    console.error('Gagal menyimpan riwayat belajar:', e);
  }
}

export function hapusRiwayat(mataPelajaran?: string) {
  try {
    if (!mataPelajaran) {
      localStorage.removeItem(STORAGE_KEY);
      return;
    }
    const semua = bacaSemua().filter((r) => r.mataPelajaran !== mataPelajaran);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(semua));
  } catch (e) {
    console.error('Gagal menghapus riwayat belajar:', e);
  }
}

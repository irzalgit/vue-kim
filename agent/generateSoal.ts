// generatesoal.ts
import { askLLM } from "./llm";
import { pilihPrompt } from "./promptSelector";
import {
  buatRingkasanKisiKisi,
  buatRingkasanSubElemen,
  validasiElemenFase,
  validasiSubElemen,
  getFaseDariKelas,
  KISI_MATEMATIKA,
  type Fase,
} from "../config/kisiTKA";
import { v4 as uuidv4 } from 'uuid';

// ==================== TIPE DATA ====================
export type Jenjang = 'SD' | 'SMP' | 'SMA';
export type TingkatKesulitan = 'mudah' | 'sedang' | 'sulit';
export type Level = 1 | 2 | 3 | 4 | 5;

export interface SelectedItem {
  id: string;
  type: 'elemen' | 'subElemen' | 'subSubElemen';
  nama: string;
  elemenNama?: string;
  subElemenNama?: string;
  fase: Fase;
  kelas: number[];
  bloomTarget: string[];
  path: string;
  subSubElemen?: {
    nama: string;
    kelas?: number[];
    bloomTarget?: string[];
  }[] | undefined;
}

export interface SoalItemGenerated {
  id?: string;
  pertanyaan: string;
  pilihan: string[];
  jawaban_benar: string;
  elemen: string;
  subElemen: string;
  subSubElemen?: string;
  fase: string;
  kelas: number;
  taxonomiBloom: string;
  tingkatKesulitan?: TingkatKesulitan;
  level?: Level;
  seed?: boolean;
  sessionId?: string;
  pembahasan?: string;
}

export interface RiwayatJawaban {
  soalId: string;
  pertanyaan: string;
  jawabanUser: string | number;
  jawabanBenar: string | number;
  benar: boolean;
  tingkatKesulitan: TingkatKesulitan;
  elemen: string;
  subElemen: string;
  kelas: number;
  timestamp: string;
}

export interface SesiBelajar {
  sessionId: string;
  jenjang: Jenjang;
  kelasTarget: number;
  modeFilter: 'hanya' | 'sampai';
  elemen: string;
  subElemen: string;
  levelSaatIni: Level;
  totalBenar: number;
  totalSalah: number;
  riwayat: RiwayatJawaban[];
  soalTerakhir?: SoalItemGenerated;
  createdAt: string;
  updatedAt: string;
}

export const LEVEL_TO_DIFFICULTY: Record<Level, TingkatKesulitan> = {
  1: 'mudah',
  2: 'mudah',
  3: 'sedang',
  4: 'sedang',
  5: 'sulit',
};

export const LEVEL_TO_BLOOM: Record<Level, string> = {
  1: 'C1 (Mengingat)',
  2: 'C2 (Memahami)',
  3: 'C3 (Menerapkan)',
  4: 'C4 (Menganalisis)',
  5: 'C5 (Mengevaluasi)',
};

// ==================== DATA SEED (HARDCODE) ====================
export const SEED_SOAL: Record<string, SoalItemGenerated[]> = {
  'sd-bilangan-operasi': [
    {
      id: 'seed-sd-1',
      pertanyaan: 'Berapakah hasil dari 12 + 15 = ?',
      pilihan: ['25', '27', '28', '30'],
      jawaban_benar: '27',
      elemen: 'Bilangan',
      subElemen: 'Operasi Hitung',
      fase: 'A',
      kelas: 1,
      taxonomiBloom: 'C1 (Mengingat)',
      tingkatKesulitan: 'mudah',
      level: 1,
      seed: true,
    },
    {
      id: 'seed-sd-2',
      pertanyaan: '7 × 8 = ?',
      pilihan: ['48', '54', '56', '64'],
      jawaban_benar: '56',
      elemen: 'Bilangan',
      subElemen: 'Operasi Hitung',
      fase: 'A',
      kelas: 2,
      taxonomiBloom: 'C1 (Mengingat)',
      tingkatKesulitan: 'mudah',
      level: 1,
      seed: true,
    },
  ],
  'smp-aljabar-persamaan-linear': [
    {
      id: 'seed-smp-1',
      pertanyaan: 'Selesaikan: 2x + 3 = 11. Berapakah nilai x?',
      pilihan: ['3', '4', '5', '6'],
      jawaban_benar: '4',
      elemen: 'Aljabar',
      subElemen: 'Persamaan Linear',
      fase: 'D',
      kelas: 7,
      taxonomiBloom: 'C2 (Memahami)',
      tingkatKesulitan: 'mudah',
      level: 1,
      seed: true,
    },
    {
      id: 'seed-smp-2',
      pertanyaan: 'Selesaikan: x + y = 8 dan x - y = 2. Berapakah nilai x?',
      pilihan: ['3', '4', '5', '6'],
      jawaban_benar: '5',
      elemen: 'Aljabar',
      subElemen: 'SPLDV',
      fase: 'D',
      kelas: 8,
      taxonomiBloom: 'C3 (Menerapkan)',
      tingkatKesulitan: 'mudah',
      level: 1,
      seed: true,
    },
  ],
  'sma-fungsi-kuadrat': [
    {
      id: 'seed-sma-1',
      pertanyaan: 'Selesaikan: x² - 5x + 6 = 0',
      pilihan: ['{1, 6}', '{2, 3}', '{-2, -3}', '{-1, -6}'],
      jawaban_benar: '{2, 3}',
      elemen: 'Fungsi',
      subElemen: 'Fungsi Kuadrat',
      fase: 'F',
      kelas: 10,
      taxonomiBloom: 'C3 (Menerapkan)',
      tingkatKesulitan: 'mudah',
      level: 1,
      seed: true,
    },
  ],
};

// ==================== HELPER FUNCTIONS ====================

function getSubElemenRelevan(kelasTarget?: number, modeFilter?: 'hanya' | 'sampai'): string {
  if (!kelasTarget) return buatRingkasanSubElemen();
  const kelasRange = modeFilter === 'hanya' ? [kelasTarget] : Array.from({ length: kelasTarget }, (_, i) => i + 1);
  const subElemenRelevan: string[] = [];
  KISI_MATEMATIKA.forEach(elemen => {
    elemen.subElemen.forEach(sub => {
      const isRelevan = sub.kelas.some(k => kelasRange.includes(k));
      if (isRelevan) {
        subElemenRelevan.push(
          `- ${elemen.nama} > ${sub.nama} (Kelas ${sub.kelas.filter(k => kelasRange.includes(k)).join(', ')}, Bloom: ${sub.bloomTarget.join('/')})`
        );
      }
    });
  });
  return subElemenRelevan.join('\n') || 'Tidak ada sub-elemen untuk filter ini.';
}

function getElemenRelevan(kelasTarget?: number, modeFilter?: 'hanya' | 'sampai'): string {
  if (!kelasTarget) return buatRingkasanKisiKisi();
  const faseTarget = getFaseDariKelas(kelasTarget);
  const faseList = modeFilter === 'hanya'
    ? [faseTarget]
    : ['A', 'B', 'C', 'D', 'E', 'F'].filter(f => {
        const faseOrder = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6 };
        return faseOrder[f as Fase] <= faseOrder[faseTarget];
      });
  const lines: string[] = [];
  faseList.forEach(fase => {
    const elemen = KISI_MATEMATIKA.filter(e => e.fase.includes(fase as Fase));
    if (elemen.length > 0) {
      lines.push(`\nFASE ${fase}:`);
      elemen.forEach(e => {
        const subRelevan = e.subElemen.filter(s =>
          s.kelas.some(k => {
            if (modeFilter === 'hanya') return k === kelasTarget;
            return k <= kelasTarget;
          })
        );
        lines.push(`  - ${e.nama}: ${subRelevan.length} sub-elemen`);
      });
    }
  });
  return lines.join('\n');
}

function perbaikiJawabanBenar(s: any, i: number) {
  if (!s.pilihan.includes(s.jawaban_benar)) {
    console.warn(`[DEBUG-GENERATE] Soal ${i + 1}: jawaban_benar tidak cocok, memperbaiki...`);
    const prefix = s.jawaban_benar.match(/^[A-D]\./)?.[0];
    if (prefix) {
      const cocok = s.pilihan.find((p: string) => p.startsWith(prefix));
      if (cocok) {
        s.jawaban_benar = cocok;
      } else {
        s.jawaban_benar = s.pilihan[0];
      }
    } else {
      s.jawaban_benar = s.pilihan[0];
    }
  }
}

function parseJSONSoal(hasilMentah: string): any[] {
  console.log("[DEBUG-PARSE] Raw input length:", hasilMentah.length);

  let text = hasilMentah
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  const match = text.match(/\[\s*[\s\S]*\]/);

  if (!match) {
    console.error("[DEBUG-PARSE] JSON tidak ditemukan");
    console.error(text.substring(0, 500));
    throw new Error("AI tidak mengembalikan array JSON.");
  }

  let jsonString = match[0];

  jsonString = jsonString
    .replace(/([{,]\s*)'([^']+)'\s*:/g, '$1"$2":')
    .replace(/:\s*'([^']*)'/g, ':"$1"')
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/\r/g, "")
    .trim();

  console.log("[DEBUG-PARSE] JSON:");
  console.log(jsonString.substring(0, 500));

  try {
    const hasil = JSON.parse(jsonString);
    if (!Array.isArray(hasil)) throw new Error("Respons AI bukan array.");
    return hasil;
  } catch (err: any) {
    console.error("[DEBUG-PARSE] JSON Parse Error:", err.message);
    console.error(jsonString.substring(0, 1000));
    throw new Error(`AI mengembalikan format soal yang tidak valid. ${err.message}`);
  }
}

// ==================== FUNGSI CHECKLIST ====================
export async function generateSoalDenganChecklist(
  sessionId: string,
  selectedItems: SelectedItem[],
  sesiKe: number,
  mataPelajaran: string = 'Matematika',
  selectedModel?: string
): Promise<SoalItemGenerated> {
  const itemIndex = (sesiKe - 1) % selectedItems.length;
  const selectedItem = selectedItems[itemIndex];

  const prompt = `
Buat 1 soal pilihan ganda untuk topik:
- Nama: ${selectedItem.path}
- Fase: ${selectedItem.fase}
- Kelas: ${selectedItem.kelas.join(', ')}
- Bloom Target: ${selectedItem.bloomTarget.join(', ')}
- Sesi ke-${sesiKe} dari 10

Format JSON (dalam bentuk array atau objek tunggal yang valid):
{
  "pertanyaan": "...",
  "pilihan": ["A. ...", "B. ...", "C. ...", "D. ..."],
  "jawaban_benar": "A. ...",
  "pembahasan": "..."
}
`;

  const result = await askLLM(prompt, selectedModel);
  
  // Tangani parsing apakah hasilnya array atau objek tunggal
  try {
    const parsed = JSON.parse(
      result.replace(/```json/gi, "").replace(/```/g, "").trim()
    );
    const soal = Array.isArray(parsed) ? parsed[0] : parsed;
    
    return {
      ...soal,
      id: soal.id || `soal-checklist-${Date.now()}`,
      elemen: selectedItem.elemenNama || selectedItem.nama,
      subElemen: selectedItem.subElemenNama || selectedItem.nama,
      fase: selectedItem.fase,
      kelas: selectedItem.kelas[0] || 1,
      taxonomiBloom: selectedItem.bloomTarget[0] || 'C3 (Menerapkan)',
      sessionId,
    };
  } catch (err) {
    throw new Error(`Gagal memparsing hasil generateSoalDenganChecklist: ${err}`);
  }
}

// ==================== AGENT MEMORI ====================
class AgentMemori {
  private sessions: Map<string, SesiBelajar> = new Map();

  public buatSesi(
    jenjang: Jenjang,
    kelasTarget: number,
    modeFilter: 'hanya' | 'sampai',
    elemen: string,
    subElemen: string
  ): SesiBelajar {
    const sessionId = uuidv4();
    const sesi: SesiBelajar = {
      sessionId,
      jenjang,
      kelasTarget,
      modeFilter,
      elemen,
      subElemen,
      levelSaatIni: 1,
      totalBenar: 0,
      totalSalah: 0,
      riwayat: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.sessions.set(sessionId, sesi);
    return sesi;
  }

  public ambilSesi(sessionId: string): SesiBelajar | null {
    return this.sessions.get(sessionId) || null;
  }

  public updateSesi(
    sessionId: string,
    soal: SoalItemGenerated,
    jawabanUser: string | number,
    benar: boolean
  ): SesiBelajar | null {
    const sesi = this.sessions.get(sessionId);
    if (!sesi) return null;

    const riwayat: RiwayatJawaban = {
      soalId: soal.id || `soal-${Date.now()}`,
      pertanyaan: soal.pertanyaan,
      jawabanUser,
      jawabanBenar: soal.jawaban_benar,
      benar,
      tingkatKesulitan: soal.tingkatKesulitan || 'sedang',
      elemen: soal.elemen,
      subElemen: soal.subElemen,
      kelas: soal.kelas,
      timestamp: new Date().toISOString(),
    };
    sesi.riwayat.push(riwayat);

    if (benar) {
      sesi.totalBenar++;
      if (sesi.levelSaatIni < 5) {
        sesi.levelSaatIni = (sesi.levelSaatIni + 1) as Level;
      }
    } else {
      sesi.totalSalah++;
    }

    sesi.soalTerakhir = soal;
    sesi.updatedAt = new Date().toISOString();

    this.sessions.set(sessionId, sesi);
    return sesi;
  }

  public getLevel(sessionId: string): Level | null {
    const sesi = this.sessions.get(sessionId);
    return sesi ? sesi.levelSaatIni : null;
  }

  public getStatistik(sessionId: string): { benar: number; salah: number; level: Level } | null {
    const sesi = this.sessions.get(sessionId);
    if (!sesi) return null;
    return {
      benar: sesi.totalBenar,
      salah: sesi.totalSalah,
      level: sesi.levelSaatIni,
    };
  }
}

// ==================== AGENT PEMBANGKIT SOAL ====================
class AgentPembangkitSoal {
  private memori: AgentMemori;

  constructor(memori: AgentMemori) {
    this.memori = memori;
  }

  public async generateSoal(
    sessionId: string,
    mataPelajaran: string,
    jumlahSoal: number = 1,
    selectedModel?: string
  ): Promise<SoalItemGenerated[]> {
    const sesi = this.memori.ambilSesi(sessionId);

    if (!sesi || sesi.riwayat.length === 0) {
      const seed = this.ambilSeedSoal(sesi?.elemen, sesi?.subElemen);
      if (seed) {
        return [seed];
      }
    }

    const level = sesi?.levelSaatIni || 1;
    const bloomTarget = LEVEL_TO_BLOOM[level as Level] || 'C3 (Menerapkan)';

    const statistikElemen: Record<string, { benar: number; total: number }> = {};
    if (sesi) {
      sesi.riwayat.forEach(r => {
        if (!statistikElemen[r.elemen]) {
          statistikElemen[r.elemen] = { benar: 0, total: 0 };
        }
        statistikElemen[r.elemen].total++;
        if (r.benar) statistikElemen[r.elemen].benar++;
      });
    }

    const soal = await this.generateSoalAdaptif(
      mataPelajaran,
      jumlahSoal,
      statistikElemen,
      sesi?.kelasTarget,
      sesi?.modeFilter,
      selectedModel,
      bloomTarget,
      level
    );

    return soal.map(s => ({
      ...s,
      sessionId,
      seed: false,
      level: level,
      tingkatKesulitan: LEVEL_TO_DIFFICULTY[level as Level] || 'sedang',
    }));
  }

  private ambilSeedSoal(elemen?: string, subElemen?: string): SoalItemGenerated | null {
    for (const [key, soals] of Object.entries(SEED_SOAL)) {
      if (elemen && subElemen) {
        const found = soals.find(s => 
          s.elemen === elemen && s.subElemen === subElemen
        );
        if (found) return { ...found };
      }
      if (!elemen && !subElemen) {
        return { ...soals[0] };
      }
    }
    return null;
  }

  private async generateSoalAdaptif(
    mataPelajaran: string,
    jumlahSoal: number,
    statistikElemen: Record<string, { benar: number; total: number }>,
    kelasTarget?: number,
    modeFilter?: 'hanya' | 'sampai',
    selectedModel?: string,
    bloomTarget?: string,
    level?: Level
  ): Promise<SoalItemGenerated[]> {
    return generateSoalAdaptif(
      mataPelajaran,
      jumlahSoal,
      statistikElemen,
      kelasTarget,
      modeFilter,
      selectedModel,
      bloomTarget,
      level
    );
  }
}

// ==================== AGENT VALIDATOR ====================
class AgentValidator {
  public validasiJawaban(soal: SoalItemGenerated, jawabanUser: string | number): boolean {
    const jawabanBenar = String(soal.jawaban_benar).toLowerCase().trim();
    const jawabanInput = String(jawabanUser).toLowerCase().trim();

    if (!isNaN(Number(jawabanBenar)) && !isNaN(Number(jawabanInput))) {
      return Math.abs(Number(jawabanBenar) - Number(jawabanInput)) < 0.001;
    }

    return jawabanBenar === jawabanInput;
  }

  public beriUmpanBalik(soal: SoalItemGenerated, benar: boolean, level: Level): string {
    if (benar) {
      const nextLevel = level < 5 ? ` Level naik ke ${level + 1}! 🎉` : ' Level maksimum! 🏆';
      return `✅ Jawaban benar!${nextLevel}\n\nPembahasan: ${soal.jawaban_benar}`;
    } else {
      return `❌ Jawaban kurang tepat. Tetap semangat! 💪\n\nJawaban yang benar: ${soal.jawaban_benar}`;
    }
  }
}

// ==================== MAIN SYSTEM ====================
export class GenerateSoalAdaptifSystem {
  private memori: AgentMemori;
  private pembangkit: AgentPembangkitSoal;
  private validator: AgentValidator;

  constructor() {
    this.memori = new AgentMemori();
    this.pembangkit = new AgentPembangkitSoal(this.memori);
    this.validator = new AgentValidator();
  }

  public async mulaiSesi(
    jenjang: Jenjang,
    kelasTarget: number,
    modeFilter: 'hanya' | 'sampai',
    elemen: string,
    subElemen: string,
    mataPelajaran: string = 'Matematika',
    selectedModel?: string
  ): Promise<{ sessionId: string; soal: SoalItemGenerated }> {
    const sesi = this.memori.buatSesi(jenjang, kelasTarget, modeFilter, elemen, subElemen);
    const [soal] = await this.pembangkit.generateSoal(
      sesi.sessionId,
      mataPelajaran,
      1,
      selectedModel
    );
    return { sessionId: sesi.sessionId, soal };
  }

  public async lanjutkanSesi(
    sessionId: string,
    mataPelajaran: string = 'Matematika',
    selectedModel?: string
  ): Promise<SoalItemGenerated | null> {
    const sesi = this.memori.ambilSesi(sessionId);
    if (!sesi) return null;

    const [soal] = await this.pembangkit.generateSoal(
      sessionId,
      mataPelajaran,
      1,
      selectedModel
    );
    return soal || null;
  }

  public submitJawaban(
    sessionId: string,
    soalId: string,
    jawabanUser: string | number
  ): {
    benar: boolean;
    pesan: string;
    levelBaru: number;
    totalBenar: number;
    totalSalah: number;
    soalBerikutnya?: SoalItemGenerated;
  } | null {
    const sesi = this.memori.ambilSesi(sessionId);
    if (!sesi) return null;

    let soal = sesi.soalTerakhir;
    if (!soal || soal.id !== soalId) {
      const riwayat = sesi.riwayat.find(r => r.soalId === soalId);
      if (!riwayat) return null;
      soal = {
        id: riwayat.soalId,
        pertanyaan: riwayat.pertanyaan,
        pilihan: [],
        jawaban_benar: String(riwayat.jawabanBenar),
        elemen: riwayat.elemen,
        subElemen: riwayat.subElemen,
        fase: getFaseDariKelas(riwayat.kelas),
        kelas: riwayat.kelas,
        taxonomiBloom: LEVEL_TO_BLOOM[sesi.levelSaatIni] || 'C2 (Memahami)',
        tingkatKesulitan: riwayat.tingkatKesulitan,
        level: sesi.levelSaatIni,
      };
    }

    const benar = this.validator.validasiJawaban(soal, jawabanUser);
    const sesiUpdated = this.memori.updateSesi(sessionId, soal, jawabanUser, benar);
    if (!sesiUpdated) return null;

    const levelBaru = sesiUpdated.levelSaatIni;
    const pesan = this.validator.beriUmpanBalik(soal, benar, levelBaru);

    return {
      benar,
      pesan,
      levelBaru,
      totalBenar: sesiUpdated.totalBenar,
      totalSalah: sesiUpdated.totalSalah,
    };
  }

  public statusSesi(sessionId: string): SesiBelajar | null {
    return this.memori.ambilSesi(sessionId);
  }

  public resetSesi(sessionId: string): boolean {
    const sesi = this.memori.ambilSesi(sessionId);
    if (!sesi) return false;

    sesi.levelSaatIni = 1;
    sesi.totalBenar = 0;
    sesi.totalSalah = 0;
    sesi.riwayat = [];
    sesi.soalTerakhir = undefined;
    sesi.updatedAt = new Date().toISOString();

    this.memori['sessions'].set(sessionId, sesi);
    return true;
  }

  public async generateSoalLangsung(
    mataPelajaran: string,
    jumlahSoal: number,
    statistikElemen: Record<string, { benar: number; total: number }> = {},
    kelasTarget?: number,
    modeFilter?: 'hanya' | 'sampai',
    selectedModel?: string,
    bloomTarget?: string
  ): Promise<SoalItemGenerated[]> {
    return generateSoalAdaptif(
      mataPelajaran,
      jumlahSoal,
      statistikElemen,
      kelasTarget,
      modeFilter,
      selectedModel,
      bloomTarget
    );
  }
}

// ==================== FUNGSI UTAMA (KOMPATIBILITAS) ====================

export async function generateSoalAdaptif(
  mataPelajaran: string,
  jumlahSoal: number,
  statistikElemenTerakhir: Record<string, { benar: number; total: number }>,
  kelasTarget?: number,
  modeFilter?: 'hanya' | 'sampai',
  selectedModel?: string,
  bloomTarget?: string,
  level?: Level
): Promise<SoalItemGenerated[]> {
  const entri = Object.entries(statistikElemenTerakhir);

  const nilai =
    entri.length > 0
      ? entri.reduce((total, [, s]) => {
          return total + (s.total > 0 ? (s.benar / s.total) * 100 : 0);
        }, 0) / entri.length
      : 60;

  const promptTemplate = pilihPrompt(nilai);

  const ringkasanPerforma =
    entri.length > 0
      ? entri
          .map(([elemen, s]) => {
            const akurasi = s.total > 0 ? Math.round((s.benar / s.total) * 100) : 0;
            let arahan: string;
            if (akurasi >= 80) arahan = "NAIKKAN tingkat kesulitan (Bloom lebih tinggi)";
            else if (akurasi < 50) arahan = "TURUNKAN atau PERTAHANKAN tingkat mudah (Bloom lebih rendah)";
            else arahan = "PERTAHANKAN tingkat menengah";
            return `- ${elemen}: ${akurasi}% (${s.benar}/${s.total}) -> ${arahan}`;
          })
          .join("\n")
      : "Tidak ada data performa. Buat soal menengah merata untuk SEMUA elemen.";

  const arahanKelas =
    kelasTarget != null
      ? modeFilter === 'hanya'
        ? `HANYA kelas ${kelasTarget}.`
        : `Kelas 1-${kelasTarget} saja.`
      : 'Kelas 1-12.';

  const elemenRelevan = getElemenRelevan(kelasTarget, modeFilter);
  const subElemenRelevan = getSubElemenRelevan(kelasTarget, modeFilter);

  let prompt = promptTemplate
    .replace("{{mataPelajaran}}", mataPelajaran)
    .replace("{{elemenRelevan}}", elemenRelevan)
    .replace("{{subElemenRelevan}}", subElemenRelevan)
    .replace("{{arahanKelas}}", arahanKelas)
    .replace("{{ringkasanPerforma}}", ringkasanPerforma)
    .replace("{{jumlahSoal}}", String(jumlahSoal));

  if (bloomTarget) {
    prompt += `\n\nINSTRUKSI TAMBAHAN: Pastikan semua soal memiliki tingkat taksonomi Bloom minimal ${bloomTarget}.`;
  }

  if (level) {
    const diff = LEVEL_TO_DIFFICULTY[level as Level] || 'sedang';
    prompt += `\n\nTINGKAT KESULITAN: ${diff} (Level ${level}/5).`;
  }

  const maxRetries = 3;
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const hasilMentah = await askLLM(prompt, selectedModel);
      const parsed = parseJSONSoal(hasilMentah);

      if (!Array.isArray(parsed)) throw new Error('Hasil bukan array');
      if (parsed.length === 0) throw new Error('Array kosong');

      for (let i = 0; i < parsed.length; i++) {
        const s = parsed[i];
        if (!s.pertanyaan || !Array.isArray(s.pilihan) || !s.jawaban_benar) {
          throw new Error(`Soal ke-${i + 1} tidak memiliki field wajib`);
        }
        perbaikiJawabanBenar(s, i);
      }

      const soalValid = parsed
        .filter((s: any) => {
          const kelasNum = Number(s.kelas);
          return Number.isFinite(kelasNum) && kelasNum >= 1 && kelasNum <= 12;
        })
        .map((s: any) => ({
          ...s,
          id: s.id || `soal-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
          kelas: Number(s.kelas),
          fase: getFaseDariKelas(Number(s.kelas)),
          tingkatKesulitan: s.tingkatKesulitan || LEVEL_TO_DIFFICULTY[(level as Level) || 1] || 'sedang',
          level: level || 1,
        }))
        .filter((s: any) => validasiElemenFase(s.elemen, s.fase))
        .filter((s: any) => {
          if (kelasTarget == null) return true;
          return modeFilter === 'hanya' ? s.kelas === kelasTarget : s.kelas <= kelasTarget;
        })
        .map((s: any) => {
          if (!validasiSubElemen(s.subElemen, s.elemen, s.fase)) {
            return { ...s, subElemen: '' };
          }
          return s;
        });

      if (soalValid.length === 0) throw new Error("Semua soal melanggar aturan kisi-kisi.");

      return soalValid;
    } catch (err: any) {
      lastError = err;
      if (attempt < maxRetries) {
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        await new Promise(r => setTimeout(r, delayMs));
      }
    }
  }

  throw new Error(`AI mengembalikan format soal yang tidak valid. Error terakhir: ${lastError?.message}`);
}

// ==================== FUNGSI BERBASIS POSISI ====================
export async function generateSoalBerbasisPosisi(
  mataPelajaran: string,
  detailSoal: any,
  posisi: number = 0,
  kelasTarget?: number,
  modeFilter?: 'hanya' | 'sampai',
  selectedModel?: string
): Promise<SoalItemGenerated[]> {
  const jumlahSoal = detailSoal?.jumlahSoal ?? 10;
  
  return generateSoalAdaptif(
    mataPelajaran,
    jumlahSoal,
    {},
    kelasTarget,
    modeFilter,
    selectedModel
  );
}

// ==================== EXPORT SINGLETON ====================
export const generateSoalAdaptifSystem = new GenerateSoalAdaptifSystem();

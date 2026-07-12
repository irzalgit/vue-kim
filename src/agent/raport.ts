import { askLLM } from "./llm";
import type { RiwayatEntry } from "../utils/riwayat";

export interface SoalJawabanItem {
  nomor: number;
  pertanyaan: string;
  pilihan: string[];
  jawabanSiswa: string;
  jawabanBenar: string;
  elemen: string;
  fase: string;
  taxonomiBloom: string;
}

export async function generateRaport(
  mataPelajaran: string,
  items: SoalJawabanItem[],
  riwayatSebelumnya: RiwayatEntry[] = [],
  selectedModel?: string
): Promise<string> {
  const total = items.length;
  const benar = items.filter((i) => i.jawabanSiswa === i.jawabanBenar).length;
  const nilai = total > 0 ? Math.round((benar / total) * 100) : 0;

  const detailSoal = items
    .map((item) => {
      const status = item.jawabanSiswa === item.jawabanBenar ? "Benar" : "Salah";
      const dijawab = item.jawabanSiswa || "(tidak dijawab)";
      return `${item.nomor}. [Elemen: ${item.elemen} | Fase: ${item.fase} | Taksonomi: ${item.taxonomiBloom}] ${item.pertanyaan}
Jawaban siswa: ${dijawab}
Jawaban benar: ${item.jawabanBenar}
Status: ${status}`;
    })
    .join("\n\n");

  const riwayatText =
    riwayatSebelumnya.length > 0
      ? riwayatSebelumnya
          .map((r) => {
            const tgl = new Date(r.tanggal).toLocaleDateString("id-ID", {
              day: "numeric",
              month: "long",
              year: "numeric",
            });
            return `- ${tgl}: nilai ${r.nilai}/100${r.capaian ? ` (${r.capaian})` : ""}`;
          })
          .join("\n")
      : "Belum ada riwayat ujian sebelumnya untuk mata pelajaran ini.";

  const prompt = `
Kamu adalah guru ${mataPelajaran} yang membuat rapor hasil ujian siswa.

Catatan: setiap soal punya label Fase (A/B = SD, C/D = SMP, E/F = SMA) dan Taksonomi Bloom (C1=Mengingat, C2=Memahami, C3=Menerapkan, C4=Menganalisis, C5=Mengevaluasi, C6=Mencipta). Sesuaikan gaya bahasa dan kedalaman saran dengan jenjang siswa berdasarkan fase soal-soal berikut.

Riwayat nilai ujian sebelumnya untuk mata pelajaran ini:
${riwayatText}

Hasil ujian kali ini:
Skor: ${benar} dari ${total} soal benar (Nilai: ${nilai}/100)

Rincian jawaban siswa:

${detailSoal}

Berdasarkan data di atas, buatkan rapor hasil belajar dalam Bahasa Indonesia dengan format berikut:

**Nilai:** ${nilai}/100
**Capaian:** (Sangat Baik / Baik / Cukup / Perlu Peningkatan, sesuaikan dengan nilai)

**Perkembangan:**
(bandingkan nilai kali ini dengan riwayat sebelumnya jika ada — naik, turun, atau stabil, dan beri komentar. Jika belum ada riwayat, cukup sebutkan ini adalah ujian pertama yang tercatat)

**Kekuatan:**
(sebutkan elemen materi (bilangan/aljabar/trigonometri/geometri/data & peluang, dst) dan level taksonomi Bloom yang sudah dikuasai siswa, berdasarkan soal yang dijawab benar)

**Perlu Diperbaiki:**
(sebutkan elemen materi dan level taksonomi Bloom yang masih lemah, berdasarkan soal yang dijawab salah — sebutkan elemen spesifiknya, bukan cuma "matematika secara umum")

**Saran Belajar:**
(2-4 saran konkret dan bisa langsung dipraktikkan untuk meningkatkan pemahaman)

Gunakan bahasa yang suportif dan memotivasi, seperti guru yang peduli pada perkembangan siswanya. Jangan mengulang rincian soal per soal satu-satu, langsung ke analisis dan saran.
`;

  return await askLLM(prompt, selectedModel);
}
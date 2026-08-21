// src/services/soal-generator/parser.ts
export function parseJSONSoal(hasilMentah: string): any[] {
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

  try {
    const hasil = JSON.parse(jsonString);
    if (!Array.isArray(hasil)) throw new Error("Respons AI bukan array.");
    return hasil;
  } catch (err: any) {
    console.error("[DEBUG-PARSE] JSON Parse Error:", err.message);
    throw new Error(`AI mengembalikan format soal yang tidak valid. ${err.message}`);
  }
}

export function perbaikiJawabanBenar(s: any, i: number) {
  // Pastikan tipeSoal ada (default ke single)
  if (!s.tipeSoal) s.tipeSoal = 'single';

  if (s.tipeSoal === 'single') {
    if (!s.pilihan.includes(s.jawaban_benar)) {
      console.warn(`[DEBUG-GENERATE] Soal ${i + 1} (single): jawaban_benar tidak cocok, memperbaiki...`);
      const prefix = typeof s.jawaban_benar === 'string' ? s.jawaban_benar.match(/^[A-E]\./)?.[0] : null;
      if (prefix) {
        const cocok = s.pilihan.find((p: string) => p.startsWith(prefix));
        s.jawaban_benar = cocok || s.pilihan[0];
      } else {
        s.jawaban_benar = s.pilihan[0];
      }
    }
  } else if (s.tipeSoal === 'multi') {
    // Pastikan jawaban_benar adalah array
    if (!Array.isArray(s.jawaban_benar)) {
      s.jawaban_benar = [s.jawaban_benar];
    }
    
    // Filter hanya jawaban yang ada di pilihan
    s.jawaban_benar = s.jawaban_benar.filter((j: string) => s.pilihan.includes(j));
    
    // Jika tidak ada yang valid, ambil pilihan pertama
    if (s.jawaban_benar.length === 0) {
      s.jawaban_benar = [s.pilihan[0]];
    }
  }
}

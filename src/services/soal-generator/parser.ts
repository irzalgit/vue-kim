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

/**
 * Membersihkan awalan abjad/nomor pilihan jawaban seperti "A. ", "B) ", "(C) ", "[D] ", "A - ", dll.
 * Hanya membersihkan prefix penomoran abjad/angka dan menyisakan isi murni pilihan jawaban.
 */
export function bersihkanPrefixPilihan(pilihan: string): string {
  if (!pilihan || typeof pilihan !== 'string') return '';
  return pilihan
    .replace(/^(\([A-Ea-e\d]\)|\[[A-Ea-e\d]\]|(?:Pilihan\s+)?[A-Ea-e\d][\.\)\:\-]\s*|[A-Ea-e]\s*[-–—]\s*)/i, '')
    .trim();
}

export function perbaikiJawabanBenar(s: any, _i?: number) {
  // Pastikan tipeSoal ada (default ke single)
  if (!s.tipeSoal) s.tipeSoal = 'single';

  if (!Array.isArray(s.pilihan)) {
    s.pilihan = [];
  }

  const pilihanMentah: string[] = s.pilihan.map((p: any) => (p != null ? String(p) : ''));
  const pilihanBersih: string[] = pilihanMentah.map((p: string) => bersihkanPrefixPilihan(p));
  s.pilihan = pilihanBersih;

  if (s.tipeSoal === 'single') {
    let indexBenar = -1;
    const jb = s.jawaban_benar != null ? String(s.jawaban_benar).trim() : '';
    const jbClean = bersihkanPrefixPilihan(jb);

    // 1. Cocok persis dengan pilihan mentah
    indexBenar = pilihanMentah.findIndex((p) => p === jb);

    // 2. Cocok dengan pilihan bersih
    if (indexBenar === -1) {
      indexBenar = pilihanBersih.findIndex((p) => p === jb || p === jbClean);
    }

    // 3. Jika jawaban_benar hanya berupa huruf abjad seperti "A", "B", "C", "D", "E" atau "A."
    if (indexBenar === -1) {
      const matchAbjad = jb.match(/^([A-Ea-e])[\.\)\:\-]?$/);
      if (matchAbjad) {
        const idxAbjad = matchAbjad[1].toUpperCase().charCodeAt(0) - 65;
        if (idxAbjad >= 0 && idxAbjad < pilihanBersih.length) {
          indexBenar = idxAbjad;
        }
      }
    }

    // 4. Cek apakah prefix huruf cocok dengan pilihan mentah (misal "A. ..." atau "B. ...")
    if (indexBenar === -1) {
      const prefix = jb.match(/^[A-Ea-e][\.\)\:\-]/)?.[0]?.toUpperCase();
      if (prefix) {
        indexBenar = pilihanMentah.findIndex((p) => p.toUpperCase().startsWith(prefix));
      }
    }

    // Fallback jika tidak ditemukan
    if (indexBenar === -1 || indexBenar >= pilihanBersih.length) {
      indexBenar = 0;
    }

    s.jawaban_benar = pilihanBersih[indexBenar] || pilihanBersih[0] || '';
  } else if (s.tipeSoal === 'multi') {
    // Pastikan jawaban_benar adalah array
    const rawArray: any[] = Array.isArray(s.jawaban_benar) ? s.jawaban_benar : [s.jawaban_benar];
    const hasilJawaban: string[] = [];

    rawArray.forEach((item) => {
      const jb = item != null ? String(item).trim() : '';
      const jbClean = bersihkanPrefixPilihan(jb);

      let idx = pilihanMentah.findIndex((p) => p === jb);
      if (idx === -1) {
        idx = pilihanBersih.findIndex((p) => p === jb || p === jbClean);
      }
      if (idx === -1) {
        const matchAbjad = jb.match(/^([A-Ea-e])[\.\)\:\-]?$/);
        if (matchAbjad) {
          const idxAbjad = matchAbjad[1].toUpperCase().charCodeAt(0) - 65;
          if (idxAbjad >= 0 && idxAbjad < pilihanBersih.length) {
            idx = idxAbjad;
          }
        }
      }
      if (idx === -1) {
        const prefix = jb.match(/^[A-Ea-e][\.\)\:\-]/)?.[0]?.toUpperCase();
        if (prefix) {
          idx = pilihanMentah.findIndex((p) => p.toUpperCase().startsWith(prefix));
        }
      }

      if (idx !== -1 && pilihanBersih[idx] && !hasilJawaban.includes(pilihanBersih[idx])) {
        hasilJawaban.push(pilihanBersih[idx]);
      }
    });

    // Jika tidak ada yang valid, ambil pilihan pertama
    if (hasilJawaban.length === 0 && pilihanBersih.length > 0) {
      hasilJawaban.push(pilihanBersih[0]);
    }

    s.jawaban_benar = hasilJawaban;
  }
}

/**
 * Shuffle array in place using Fisher-Yates algorithm
 */
export function acakArray<T>(arr: T[]): T[] {
  const result = [...arr];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Render MathJax on the page
 */
export function renderMathJax(): void {
  // @ts-ignore - MathJax mungkin tidak dikenali oleh TypeScript window object
  if (window.MathJax && window.MathJax.typesetPromise) {
    // @ts-ignore
    window.MathJax.typesetPromise();
  }
}

/**
 * Simple markdown to HTML converter
 */
export function simpleMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/### (.*)/g, '<h3>$1</h3>')
    .replace(/## (.*)/g, '<h2>$1</h2>')
    .replace(/# (.*)/g, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/^- (.*)/gm, '<li>$1</li>')
    .replace(/(\d+)\.\s(.*)/g, '<li>$2</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ol>$&</ol>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\n\n/g, '<br><br>')
    .replace(/\n/g, '<br>')
    .replace(/---/g, '<hr>');
}

/**
 * Format soal untuk ditampilkan di chat AI
 */
export function formatSoalUntukChat(soalItem: any, index: number): string {
  if (!soalItem) return '';
  let text = `📌 **Soal Nomor ${index + 1}**\n`;
  text += `📂 Kategori: ${soalItem.kategori || 'Umum'}\n\n`;
  text += `**Pertanyaan:**\n${soalItem.tanya}\n\n`;
  if (soalItem.opsi && soalItem.opsi.length > 0) {
    text += `**Pilihan Jawaban:**\n`;
    soalItem.opsi.forEach((op: string, i: number) => {
      text += `${String.fromCharCode(65 + i)}. ${op}\n`;
    });
  }
  return text;
}

/**
 * Generate local fallback response
 */
export function generateLocalFallback(question: string, questionData: any): string {
  const topic = questionData.topic || 'Matematika';
  const options = questionData.options || [];
  const correctAnswer = questionData.correctAnswer || '';

  let response = `# 🧠 Smart Tutor Lokal\n\n`;
  response += `## 📘 Soal\n${question}\n\n`;

  if (options.length > 0) {
    response += `## 📝 Pilihan Jawaban\n`;
    options.forEach((op: string, i: number) => {
      response += `${String.fromCharCode(65 + i)}. ${op}\n`;
    });
    response += `\n`;
  }

  response += `## 📚 Topik: ${topic}\n\n`;
  response += `## 💡 Penjelasan\n\n`;
  response += `Soal ini termasuk materi **${topic}**.\n\n`;
  response += `### Langkah umum penyelesaian:\n\n1. Pahami soal\n2. Pilih strategi\n3. Kerjakan bertahap\n4. Verifikasi\n\n`;

  if (correctAnswer) {
    response += `## 🔑 Jawaban Benar\n${correctAnswer}\n\n`;
  }
  return response + `---\n*Smart Tutor lokal aktif.*`;
}

/**
 * Generate default questions
 */
export function generateDefaultSoal(jenis: string) {
  const base = jenis === 'tka' ? [
    { tanya: "Hasil dari (2x + 3 = 11), nilai x adalah...", opsi: ["4","5","6","7"], kunci:[0], kategori:"Aljabar"},
    { tanya: "Nilai sin 30° + cos 60° adalah...", opsi: ["0","1","1.5","2"], kunci:[1], kategori:"Trigonometri"},
  ] : [
    { tanya: "Siapa penulis novel 'Laskar Pelangi'?", opsi: ["Pramoedya Ananta Toer","Andrea Hirata"], kunci:[1], kategori:"Bahasa Indonesia"},
  ];

  let all: any[] = [];
  while(all.length < 25) {
    for(let s of base) {
      if(all.length < 25) all.push({...s, tanya: s.tanya + ` (Variasi ${all.length+1})`});
    }
  }
  return acakArray(all);
}

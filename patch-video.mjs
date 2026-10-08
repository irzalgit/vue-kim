import { readFileSync, writeFileSync } from 'node:fs';
const f = 'public/video.html';
let s = readFileSync(f, 'utf8');
const a = s.indexOf('const BASE_URL');
const b = s.indexOf('function render(videos)');
if (a < 0 || b < 0) { console.error('Penanda tidak ditemukan di ' + f); process.exit(1); }
const baru = `const BASE_URL = "videos/";

  const countEl = document.getElementById("count");
  const grid = document.getElementById("videoGrid");

  const esc = s => s.replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

  async function loadList() {
    try {
      const res = await fetch(BASE_URL + "list.json", { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!Array.isArray(data)) throw new Error("Format JSON tidak valid");
      return data;
    } catch (err) {
      console.error("list.json gagal dimuat:", err);
      return null;
    }
  }

  `;
s = s.slice(0, a) + baru + s.slice(b);
s = s.replace(/'list\.php<\/code> ada dan PHP aktif di server\.<\/p>'/, "'list.json</code> ada.</p>'");
s = s.replace('const name = file.replace(/_/g, " ").replace(/\\.mp4$/i, "");',
  'const base = file.split("/").pop();\n      const folder = file.includes("/") ? file.split("/").slice(0, -1).join(" / ") + " \u2014 " : "";\n      const name = folder + base.replace(/_/g, " ").replace(/\\.mp4$/i, "");');
s = s.replace('const src = BASE_URL + encodeURIComponent(file);', 'const src = BASE_URL + file.split("/").map(encodeURIComponent).join("/");');
writeFileSync(f, s);
console.log('public/video.html sudah diperbarui');

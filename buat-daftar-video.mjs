import { readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const root = 'public/videos';
const hasil = [];

function scan(dir) {
  for (const nama of readdirSync(dir)) {
    const p = join(dir, nama);
    if (statSync(p).isDirectory()) scan(p);
    else if (/\.mp4$/i.test(nama)) hasil.push(relative(root, p).split(sep).join('/'));
  }
}

scan(root);
hasil.sort();
writeFileSync(join(root, 'list.json'), JSON.stringify(hasil, null, 2));
console.log(`list.json dibuat: ${hasil.length} video`);

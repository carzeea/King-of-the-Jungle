// Runs on Netlify during every deploy (see netlify.toml).
// Downloads each clip listed in game/audio/audio-manifest.json to its labeled file path.
// Files that already exist are kept. A failed download never fails the deploy:
// the game streams that clip from its source link instead.
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { dirname, join } from 'node:path';
const root = 'game/audio';
const { clips } = JSON.parse(await readFile(join(root, 'audio-manifest.json'), 'utf8'));
let ok = 0, kept = 0, failed = 0;
await Promise.all(Object.entries(clips).map(async ([key, c]) => {
  const out = join(root, c.file);
  try { await access(out); kept++; return; } catch {}
  try {
    const r = await fetch(c.source);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, Buffer.from(await r.arrayBuffer()));
    ok++; console.log('saved   ', c.file, '-', c.label);
  } catch (e) { failed++; console.warn('MISSING ', c.file, '-', c.label, '(' + e.message + ', game will stream it)'); }
}));
console.log(`audio: ${ok} downloaded, ${kept} already present, ${failed} will stream`);

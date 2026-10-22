// `npm run sound:find` (docs/art-pipeline.md § Sound): lays out candidates for the cue table's
// effects from Kenney's CC0 audio packs, downloaded once into sound/takes/kenney/ (ignored, in the
// main checkout: `soundHome`), and writes sound/takes/candidates.json for the picker (`npm run
// sound:pick`). Kenney's packs are the only source fetched by script: everything else is found by
// hand from the picker's search links. Only the recorded packs (S1.1, Jan's call: no synth blips).

import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, relative } from 'node:path';
import { unzipSync } from 'fflate';
import { CUES, type CueInfo } from '../src/ui/sound/table.ts';
import { soundHome } from './sound-lib.ts';

export const KENNEY_PACKS = ['rpg-audio', 'impact-sounds'];

export interface Candidate {
  /** The file, from sound/takes/. */
  file: string;
  source: string;
  licence: string;
  credit: string;
}

const takes = join(soundHome(process.cwd()), 'sound', 'takes');
const kenneyDir = join(takes, 'kenney');

async function fetchPack(pack: string): Promise<void> {
  const dir = join(kenneyDir, pack);
  if (existsSync(dir)) return;
  const page = `https://kenney.nl/assets/${pack}`;
  const html = await (await fetch(page)).text();
  const zip = html.match(/https:\/\/kenney\.nl\/media\/pages\/assets\/[^"]+\.zip/)?.[0];
  if (!zip) throw new Error(`no download on ${page}`);
  const bytes = new Uint8Array(await (await fetch(zip)).arrayBuffer());
  const files = unzipSync(bytes, { filter: (f) => /\.(ogg|wav|mp3)$/i.test(f.name) });
  for (const [name, data] of Object.entries(files)) {
    const out = join(dir, basename(name));
    mkdirSync(dir, { recursive: true });
    writeFileSync(out, data);
  }
  console.log(
    `fetched ${pack}: ${Object.keys(files).length} sounds (${(bytes.length / 1024).toFixed(0)} KB)`,
  );
}

for (const pack of KENNEY_PACKS) await fetchPack(pack);

const all = KENNEY_PACKS.flatMap((pack) =>
  readdirSync(join(kenneyDir, pack)).map((f) => ({ pack, file: join(kenneyDir, pack, f) })),
);
const candidates: Record<string, Candidate[]> = {};
for (const c of CUES) {
  const prefixes = (c as CueInfo).kenney ?? [];
  const found = all
    .filter(({ file }) => prefixes.some((p) => basename(file).startsWith(p)))
    .slice(0, 10)
    .map(({ pack, file }) => ({
      file: relative(takes, file).split('\\').join('/'),
      source: `https://kenney.nl/assets/${pack}`,
      licence: 'CC0',
      credit: 'Kenney (kenney.nl), CC0',
    }));
  if (found.length) candidates[c.id] = found;
}
writeFileSync(join(takes, 'candidates.json'), JSON.stringify(candidates, null, 2) + '\n', 'utf8');
const n = Object.values(candidates).reduce((t, x) => t + x.length, 0);
console.log(`${n} candidates for ${Object.keys(candidates).length} cues; next, npm run sound:pick`);

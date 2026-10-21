// `npm run sound:pick` (docs/art-pipeline.md § Sound): a page at http://localhost:4322 listing
// every cue with what it plays on, the Kenney candidates `npm run sound:find` laid out, search links
// for Pixabay and Freesound's site, and a drop for a file found by hand with its page, licence and
// credit. A pick lands in sound/inbox/ and the manifest; Make the MP3s runs `npm run sound`.

import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createServer, type ServerResponse } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { CUES, type CueInfo } from '../src/ui/sound/table.ts';
import type { Candidate } from './sound-find.ts';
import {
  AUDIO_EXTS,
  LICENCES,
  readManifest,
  runSound,
  soundSchema,
  sourceOf,
  writeManifest,
  type SoundEntry,
} from './sound-lib.ts';

const PORT = 4322;
const root = process.cwd();
const takes = join(root, 'sound', 'takes');
const inbox = join(root, 'sound', 'inbox');

const candidates = (): Record<string, Candidate[]> => {
  const f = join(takes, 'candidates.json');
  return existsSync(f) ? (JSON.parse(readFileSync(f, 'utf8')) as Record<string, Candidate[]>) : {};
};

function record(entry: SoundEntry): void {
  soundSchema.parse(entry);
  const m = readManifest(root);
  writeManifest(root, { sounds: [...m.sounds.filter((s) => s.id !== entry.id), entry] });
}

function intoInbox(id: string, ext: string, write: (path: string) => void): void {
  mkdirSync(inbox, { recursive: true });
  const old = sourceOf(inbox, id);
  if (old) rmSync(old);
  write(join(inbox, `${id}${ext}`));
}

const TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
};

function serveFile(res: ServerResponse, base: string, rel: string): void {
  const path = normalize(join(base, rel));
  if (!path.startsWith(base) || !existsSync(path)) {
    res.writeHead(404).end();
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' });
  res.end(readFileSync(path));
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function page(): string {
  const picked = new Map(readManifest(root).sounds.map((s) => [s.id, s]));
  const cands = candidates();
  const sections = (['music', 'ambience', 'effect'] as const).map((kind) => {
    const rows = CUES.filter((c) => c.kind === kind).map((c) => {
      const p = picked.get(c.id);
      const shipped = existsSync(join(root, 'public', 'sound', `${c.id}.mp3`));
      const info: CueInfo = c;
      const terms = info.pixabay ? [info.pixabay] : [...info.search];
      const links = terms
        .map((t) => {
          const q = encodeURIComponent(t);
          const pix =
            c.kind === 'music'
              ? `https://pixabay.com/music/search/${q}/`
              : `https://pixabay.com/sound-effects/search/${q}/`;
          return `<a href="${pix}" target="_blank">Pixabay: ${esc(t)}</a> · <a href="https://freesound.org/search/?q=${q}&f=license:%22Creative+Commons+0%22" target="_blank">Freesound CC0</a>`;
        })
        .join('<br>');
      const takesHtml = (cands[c.id] ?? [])
        .map(
          (t) =>
            `<span class="take"><audio controls preload="none" src="/takes/${esc(t.file)}"></audio><button data-pick="${esc(c.id)}" data-file="${esc(t.file)}">Pick</button><small>${esc(t.file.split('/').pop()!)}</small></span>`,
        )
        .join('');
      return `<section class="cue${p ? ' has' : ''}" id="${c.id}">
  <h3>${c.id} <small>${esc(c.plays)}</small></h3>
  ${info.brief ? `<p class="brief">${esc(info.brief)}</p>` : ''}
  <p class="now">${p ? `Picked: ${esc(p.credit)} · ${esc(p.licence)}${shipped ? ` <audio controls preload="none" src="/shipped/${c.id}.mp3"></audio>` : ' · run Make the MP3s'}` : 'Nothing yet'}</p>
  <div class="takes">${takesHtml}</div>
  <p class="links">${links}</p>
  <form class="drop" data-id="${c.id}">
    <input type="file" name="file" accept="audio/*" required>
    <input name="source" placeholder="The page it came from (URL)" required>
    <select name="licence">${LICENCES.map((l) => `<option${l === (c.kind === 'effect' ? 'CC0' : 'Pixabay') ? ' selected' : ''}>${l}</option>`).join('')}</select>
    <input name="credit" placeholder="Credit: who made it, and where" required>
    <button>Use this file</button>
  </form>
</section>`;
    });
    const done = CUES.filter((c) => c.kind === kind && picked.has(c.id)).length;
    const total = CUES.filter((c) => c.kind === kind).length;
    return `<h2>${kind === 'effect' ? 'Effects' : kind === 'music' ? 'Music' : 'Ambience'} <small>${done} of ${total}</small></h2>${rows.join('')}`;
  });
  return `<!doctype html><meta charset="utf-8"><title>Sound picker</title>
<style>
body{background:#111214;color:#e9e5da;font:14px/1.45 system-ui;margin:0 auto;max-width:1100px;padding:24px}
h2{margin-top:32px;border-bottom:1px solid #333}h3{margin:0 0 4px}small{color:#8b877d;font-weight:400}
.cue{border:1px solid #2b2b2e;border-radius:6px;padding:12px;margin:10px 0}.cue.has{border-color:#5d5a2c}
.takes{display:flex;flex-wrap:wrap;gap:8px;margin:6px 0}.take{display:inline-flex;align-items:center;gap:4px;background:#1b1c1f;padding:4px;border-radius:4px}
audio{height:30px}a{color:#d9b25a}.brief{color:#c9c3b3;font-style:italic;margin:2px 0}
.drop{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.drop input,.drop select{background:#1b1c1f;color:inherit;border:1px solid #333;padding:4px}
.drop input[name=source],.drop input[name=credit]{flex:1 1 220px}button{background:#3a3320;color:#f3e3b5;border:1px solid #6b5a2a;border-radius:4px;padding:4px 10px;cursor:pointer}
#bar{position:sticky;top:0;background:#111214;padding:8px 0;display:flex;gap:12px;align-items:center;z-index:1}
#out{white-space:pre-wrap;color:#c9c3b3}
</style>
<div id="bar"><button id="make">Make the MP3s</button><span id="out">Pick a take, or drop a file you found. Then Make the MP3s.</span></div>
${sections.join('')}
<script>
const out = document.getElementById('out');
const post = (url, body, headers) => fetch(url, { method: 'POST', body, headers }).then((r) => r.text());
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-pick]');
  if (!b) return;
  out.textContent = await post('/pick', JSON.stringify({ id: b.dataset.pick, file: b.dataset.file }));
  location.hash = b.dataset.pick; location.reload();
});
document.querySelectorAll('form.drop').forEach((f) => f.addEventListener('submit', async (e) => {
  e.preventDefault();
  const d = new FormData(f);
  const file = d.get('file');
  const q = new URLSearchParams({ id: f.dataset.id, source: d.get('source'), licence: d.get('licence'), credit: d.get('credit'), name: file.name });
  out.textContent = await post('/drop?' + q, file);
  location.hash = f.dataset.id; location.reload();
}));
document.getElementById('make').addEventListener('click', async () => {
  out.textContent = 'Making…';
  out.textContent = await post('/build', '');
});
</script>`;
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const send = (code: number, text: string) =>
    res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8' }).end(text);
  if (req.method === 'GET' && url.pathname === '/')
    return void res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(page());
  if (req.method === 'GET' && url.pathname.startsWith('/takes/'))
    return serveFile(res, takes, decodeURIComponent(url.pathname.slice(7)));
  if (req.method === 'GET' && url.pathname.startsWith('/shipped/'))
    return serveFile(res, join(root, 'public', 'sound'), decodeURIComponent(url.pathname.slice(9)));
  const chunks: Buffer[] = [];
  req.on('data', (c: Buffer) => chunks.push(c));
  req.on('end', () => {
    try {
      const body = Buffer.concat(chunks);
      if (url.pathname === '/pick') {
        const { id, file } = JSON.parse(body.toString('utf8')) as { id: string; file: string };
        const take = candidates()[id]?.find((t) => t.file === file);
        if (!take) return send(400, `No take ${file} for ${id}.`);
        intoInbox(id, extname(file), (to) => copyFileSync(join(takes, file), to));
        record({ id, source: take.source, licence: take.licence, credit: take.credit });
        return send(200, `${id}: picked ${file}.`);
      }
      if (url.pathname === '/drop') {
        const q = url.searchParams;
        const id = q.get('id') ?? '';
        const ext = extname(q.get('name') ?? '').toLowerCase();
        if (!CUES.some((c) => c.id === id)) return send(400, `No cue ${id}.`);
        if (!AUDIO_EXTS.includes(ext)) return send(400, `${ext} isn't an audio file this reads.`);
        intoInbox(id, ext, (to) => writeFileSync(to, body));
        record({
          id,
          source: q.get('source') ?? '',
          licence: q.get('licence') ?? '',
          credit: q.get('credit') ?? '',
        });
        return send(200, `${id}: dropped in.`);
      }
      if (url.pathname === '/build') {
        const r = runSound(root);
        const lines = [
          ...r.written.map((w) => `wrote ${w.file} ${w.kb.toFixed(1)} KB`),
          ...r.errors.map((e) => `error ${e}`),
        ];
        return send(r.errors.length ? 500 : 200, lines.join('\n') || 'Nothing changed.');
      }
      send(404, 'No such page.');
    } catch (err) {
      send(500, err instanceof Error ? err.message : String(err));
    }
  });
}).listen(PORT, () => console.log(`The sound picker: http://localhost:${PORT}`));

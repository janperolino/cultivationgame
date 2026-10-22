// `npm run sound:pick` (docs/art-pipeline.md § Sound): the sound picker at http://localhost:4322.
// Every cue in a row by what it is (menu and navigation, feel, qi and the breakthrough, quests,
// things, combat, ambience, music), what it plays on and what to listen for, then its takes side
// by side: the one shipped now and what Jan dropped in sound/inbox/<cue>/ (Kenney's packs left
// out: Jan heard all of them as retro in S1.1's talk). A tile plays at a click or its number key (↑ and ↓ move between
// rows); Pick writes the manifest with the take's source, licence and credit and makes the MP3s at
// once, so the game hears it on its next reload (S1.1).

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { createServer, type ServerResponse } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { CUES, type CueInfo } from '../src/ui/sound/table.ts';
import {
  AUDIO_EXTS,
  guessOf,
  LICENCES,
  readManifest,
  runSound,
  soundHome,
  soundSchema,
  sourceOf,
  writeManifest,
  type SoundEntry,
} from './sound-lib.ts';

const PORT = 4322;
const root = process.cwd();
const home = soundHome(root);
const takes = join(home, 'sound', 'takes');
const inbox = join(home, 'sound', 'inbox');

/** Kenney's packs, all heard as retro in S1.1's talk: a cue shipped from one wants a swap. */
const RETRO = ['kenney.nl/'];

/** Cues S1.1's talk moved to a new sound (Jan's picks: a gong swell, a cinematic thud). */
const MOVED = [
  'feel-layer',
  'feel-stage',
  'feel-alert',
  'hit-palm',
  'hit-charge',
  'hit-slash',
  'hit-thrust',
];

/** The picker's rows, in order: each cue in the first whose test it passes. */
const SECTIONS: { title: string; has: (c: CueInfo) => boolean }[] = [
  { title: 'Menu and navigation', has: (c) => c.id.startsWith('ui-') },
  {
    title: 'Qi and the breakthrough',
    has: (c) =>
      [
        'feel-orb',
        'feel-qi-hum',
        'feel-settle',
        'feel-warn',
        'feel-charge',
        'feel-gate',
        'feel-layer',
        'feel-stage',
        'feel-fanfare',
        'feel-fail',
      ].includes(c.id),
  },
  { title: 'Feel', has: (c) => c.id.startsWith('feel-') },
  { title: 'Quests', has: (c) => c.id.startsWith('quest-') },
  { title: 'Combat', has: (c) => c.kind === 'effect' && c.group === 'combat' },
  { title: 'Things and crafts', has: (c) => c.kind === 'effect' },
  { title: 'Loops', has: (c) => c.kind === 'loop' },
  { title: 'Ambience', has: (c) => c.kind === 'ambience' },
  { title: 'Music', has: (c) => c.kind === 'music' },
];

/** A take to hear and pick: where it is, and what the manifest gets if it's picked. */
interface Take {
  /** The page's path to it, under /finds/. */
  url: string;
  name: string;
  source: string;
  licence: string;
  credit: string;
  /** The source and credit were guessed from the file's name; check them before picking. */
  guessed: boolean;
}

/**
 * A cue's takes in sound/inbox/<cue>/; a `credits.json` beside them (a script that fetched them
 * writes one) gives a take's source, licence and credit, else they're guessed from its name.
 */
function finds(id: string): Take[] {
  const dir = join(inbox, id);
  if (!existsSync(dir)) return [];
  const known = join(dir, 'credits.json');
  const credits = existsSync(known)
    ? (JSON.parse(readFileSync(known, 'utf8')) as Record<
        string,
        Pick<Take, 'source' | 'licence' | 'credit'>
      >)
    : {};
  return readdirSync(dir)
    .filter((f) => AUDIO_EXTS.includes(extname(f).toLowerCase()))
    .sort()
    .map((f) => ({
      url: `/finds/${id}/${encodeURIComponent(f)}`,
      name: f,
      ...(credits[f] ? { ...credits[f], guessed: false } : guessOf(f)),
    }));
}

function record(entry: SoundEntry): void {
  soundSchema.parse(entry);
  const m = readManifest(root);
  writeManifest(root, { sounds: [...m.sounds.filter((s) => s.id !== entry.id), entry] });
}

/** A pick goes into the inbox as `<id>.<ext>`, where `npm run sound` takes it from. */
function intoInbox(id: string, from: string): void {
  mkdirSync(inbox, { recursive: true });
  const old = sourceOf(inbox, id);
  if (old) rmSync(old);
  copyFileSync(from, join(inbox, `${id}${extname(from).toLowerCase()}`));
}

/** A take's file on disk, from its page path; null for one outside the takes and the inbox. */
function fileOf(url: string): string | null {
  const [base, rel] = url.startsWith('/takes/')
    ? [takes, url.slice(7)]
    : url.startsWith('/finds/')
      ? [inbox, url.slice(7)]
      : [null, ''];
  if (!base) return null;
  const path = normalize(join(base, decodeURIComponent(rel)));
  return path.startsWith(base) && existsSync(path) ? path : null;
}

const TYPES: Record<string, string> = {
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.opus': 'audio/ogg',
  '.webm': 'audio/webm',
};

function serve(res: ServerResponse, path: string | null): void {
  if (!path) return void res.writeHead(404).end();
  res.writeHead(200, {
    'content-type': TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream',
  });
  res.end(readFileSync(path));
}

const esc = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function row(c: CueInfo, picked: SoundEntry | undefined): string {
  const shipped = existsSync(join(root, 'public', 'sound', `${c.id}.mp3`));
  const retro = !!picked && (RETRO.some((r) => picked.source.includes(r)) || MOVED.includes(c.id));
  const badge = !picked
    ? '<b class="tag new">nothing yet</b>'
    : retro
      ? '<b class="tag swap">swap</b>'
      : '';
  const terms = c.pixabay ? [c.pixabay] : [...c.search];
  const links = terms
    .map((t) => {
      const q = encodeURIComponent(t);
      const pix =
        c.kind === 'music'
          ? `https://pixabay.com/music/search/${q}/`
          : `https://pixabay.com/sound-effects/search/${q}/`;
      return `${esc(t)}: <a href="${pix}" target="_blank">Pixabay</a> · <a href="https://freesound.org/search/?q=${q}&f=license:%22Creative+Commons+0%22" target="_blank">Freesound CC0</a>`;
    })
    .join('<br>');
  const now =
    picked && shipped
      ? `<div class="tile now" data-url="/shipped/${c.id}.mp3"><span class="n"></span><span class="nm">Now</span><small>${esc(picked.credit)}</small></div>`
      : `<div class="tile now off"><span class="nm">Now</span><small>${picked ? 'run Make' : 'silent'}</small></div>`;
  const tiles = finds(c.id)
    .map(
      (
        t,
      ) => `<div class="tile find" data-url="${esc(t.url)}" data-source="${esc(t.source)}" data-licence="${esc(t.licence)}" data-credit="${esc(t.credit)}" data-guessed="${t.guessed}">
  <span class="n"></span><span class="nm" title="${esc(t.name)}">${esc(t.name)}</span><small>${esc(t.credit || 'no credit yet')}</small>
  <button class="pick">Pick</button></div>`,
    )
    .join('');
  return `<section class="cue${picked ? ' has' : ''}${retro ? ' retro' : ''}" id="${c.id}" data-id="${c.id}" data-kind="${c.kind}" tabindex="-1">
  <div class="about"><h3>${c.id} ${badge}</h3><p class="plays">${esc(c.plays)}</p>
  ${c.listen || c.brief ? `<p class="listen">${esc(c.listen ?? c.brief ?? '')}</p>` : ''}
  <p class="links">${links}</p>
  <p class="drop">Or drop files here; they land in <code>sound/inbox/${c.id}/</code>.</p></div>
  <div class="tiles">${now}${tiles}</div>
</section>`;
}

function page(): string {
  const picked = new Map(readManifest(root).sounds.map((s) => [s.id, s]));
  const placed = new Set<string>();
  const sections = SECTIONS.map(({ title, has }) => {
    const cues = CUES.filter((c) => !placed.has(c.id) && has(c));
    for (const c of cues) placed.add(c.id);
    const done = cues.filter((c) => picked.has(c.id)).length;
    return `<h2>${title} <small>${done} of ${cues.length}</small></h2>${cues.map((c) => row(c, picked.get(c.id))).join('')}`;
  });
  return `<!doctype html><meta charset="utf-8"><title>Sound picker</title>
<style>
body{background:#111214;color:#e9e5da;font:14px/1.45 system-ui;margin:0 auto;max-width:1500px;padding:0 24px 80px}
h2{margin:28px 0 6px;border-bottom:1px solid #333;font-size:17px}h3{margin:0;font-size:14px}small{color:#8b877d;font-weight:400}
.cue{display:grid;grid-template-columns:340px 1fr;gap:14px;border:1px solid #2b2b2e;border-radius:6px;padding:10px 12px;margin:8px 0;outline:none}
.cue.has{border-color:#3e3c26}.cue.retro{border-color:#6b3a2a}.cue.focus{border-color:#d9b25a;background:#17171a}
.cue.over{background:#1f2a1f}
.about p{margin:2px 0}.plays{color:#c9c3b3}.listen{color:#d8cfae;font-style:italic}.links,.drop{font-size:12px;color:#8b877d}
.tag{font-size:11px;font-weight:600;padding:1px 6px;border-radius:8px;margin-left:6px}.tag.new{background:#2a3340;color:#9fc2e8}.tag.swap{background:#4a2a20;color:#f0b49a}
.tiles{display:flex;flex-wrap:wrap;gap:6px;align-content:flex-start}
.tile{position:relative;width:150px;background:#1b1c1f;border:1px solid #2e2e33;border-radius:5px;padding:6px 6px 26px;cursor:pointer;user-select:none}
.tile:hover{border-color:#6b5a2a}.tile.playing{border-color:#e8c46a;background:#2a2617}.tile.now{background:#1c2320}.tile.off{cursor:default;opacity:.5}
.tile.find{background:#1f1d26}
.tile .n{position:absolute;top:4px;right:6px;color:#8b877d;font-size:11px}.tile .nm{display:block;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding-right:14px}
.tile small{display:block;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.tile .pick{position:absolute;left:6px;bottom:4px;font-size:11px;padding:1px 8px}
button{background:#3a3320;color:#f3e3b5;border:1px solid #6b5a2a;border-radius:4px;padding:4px 10px;cursor:pointer}
a{color:#d9b25a}code{color:#c9c3b3}
#bar{position:sticky;top:0;background:#111214;padding:10px 0;display:flex;gap:12px;align-items:center;z-index:2;border-bottom:1px solid #2b2b2e}
#out{white-space:pre-wrap;color:#c9c3b3;font-size:12px;max-height:60px;overflow:auto;flex:1}
#form{position:fixed;inset:auto 24px 24px auto;background:#1b1c1f;border:1px solid #6b5a2a;border-radius:6px;padding:12px;width:420px;display:none;z-index:3}
#form input,#form select{width:100%;box-sizing:border-box;background:#111214;color:inherit;border:1px solid #333;padding:4px;margin:3px 0 8px}
#form label{font-size:12px;color:#8b877d}
</style>
<div id="bar"><label><input type="checkbox" id="only"> Only what wants a sound</label><button id="make">Make the MP3s</button><span id="out">Click a take to hear it, or ↑ ↓ to move and 0–9 to play (0 is the one now). Pick ships it.</span></div>
${sections.join('')}
<form id="form"><b id="f-id"></b> <small id="f-name"></small><br>
<label>The page it came from</label><input name="source" required>
<label>Licence</label><select name="licence">${LICENCES.map((l) => `<option>${l}</option>`).join('')}</select>
<label>Credit: who made it, and where</label><input name="credit" required>
<small>Guessed from the file's name: check it on its page.</small><br><br>
<button>Pick it</button> <button type="button" id="f-cancel">Cancel</button></form>
<script>
const out = document.getElementById('out');
const rows = [...document.querySelectorAll('.cue')];
let focus = rows.find((r) => r.id === location.hash.slice(1)) ?? rows[0];
let audio = null, playing = null;
const number = () => rows.forEach((r) => [...r.querySelectorAll('.tile')].forEach((t, i) => (t.querySelector('.n') ?? {}).textContent = i));
number();
function setFocus(r, scroll) {
  focus?.classList.remove('focus'); focus = r; r.classList.add('focus');
  if (scroll) r.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
function play(tile) {
  if (!tile?.dataset.url) return;
  audio?.pause(); playing?.classList.remove('playing');
  audio = new Audio(tile.dataset.url); playing = tile; tile.classList.add('playing');
  audio.onended = () => tile.classList.remove('playing');
  audio.play();
}
const post = (url, body) => fetch(url, { method: 'POST', body }).then(async (r) => ({ ok: r.ok, text: await r.text() }));
async function pick(row, tile, entry) {
  out.textContent = 'Picking and making…';
  const r = await post('/pick', JSON.stringify({ id: row.dataset.id, url: tile.dataset.url, ...entry }));
  out.textContent = r.text;
  if (r.ok) { location.hash = row.dataset.id; location.reload(); }
}
const form = document.getElementById('form');
let pending = null;
form.addEventListener('submit', (e) => {
  e.preventDefault();
  const d = new FormData(form);
  form.style.display = 'none';
  pick(pending.row, pending.tile, { source: d.get('source'), licence: d.get('licence'), credit: d.get('credit') });
});
document.getElementById('f-cancel').onclick = () => (form.style.display = 'none');
document.addEventListener('click', (e) => {
  const tile = e.target.closest('.tile'); const row = e.target.closest('.cue');
  if (row) setFocus(row, false);
  if (!tile) return;
  if (e.target.closest('.pick')) {
    const t = tile.dataset;
    if (t.guessed === 'true') {
      pending = { row, tile };
      document.getElementById('f-id').textContent = row.dataset.id;
      document.getElementById('f-name').textContent = tile.querySelector('.nm').title;
      form.source.value = t.source; form.licence.value = t.licence; form.credit.value = t.credit;
      form.style.display = 'block'; form.credit.focus();
    } else pick(row, tile, { source: t.source, licence: t.licence, credit: t.credit });
    return;
  }
  play(tile);
});
document.addEventListener('keydown', (e) => {
  if (e.target.closest('input, select, textarea')) return;
  const visible = rows.filter((r) => r.style.display !== 'none');
  const i = visible.indexOf(focus);
  if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
    e.preventDefault();
    const next = visible[Math.max(0, Math.min(visible.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
    if (next) setFocus(next, true);
  } else if (/^[0-9]$/.test(e.key) && focus) {
    play(focus.querySelectorAll('.tile')[Number(e.key)]);
  }
});
document.getElementById('only').addEventListener('change', (e) => {
  for (const r of rows) r.style.display = e.target.checked && r.classList.contains('has') && !r.classList.contains('retro') ? 'none' : '';
});
document.getElementById('make').onclick = async () => { out.textContent = 'Making…'; out.textContent = (await post('/build', '')).text; };
// A file dropped on a row joins its takes.
for (const r of rows) {
  r.addEventListener('dragover', (e) => { e.preventDefault(); r.classList.add('over'); });
  r.addEventListener('dragleave', () => r.classList.remove('over'));
  r.addEventListener('drop', async (e) => {
    e.preventDefault(); r.classList.remove('over');
    for (const f of e.dataTransfer.files) out.textContent = (await post('/drop?' + new URLSearchParams({ id: r.dataset.id, name: f.name }), f)).text;
    location.hash = r.dataset.id; location.reload();
  });
}
if (focus) setFocus(focus, !!location.hash);
</script>`;
}

/** Makes the MP3s, as lines for the page. */
function build(): { ok: boolean; text: string } {
  const r = runSound(root);
  const lines = [
    ...r.written.map((w) => `wrote ${w.file} ${w.kb.toFixed(1)} KB`),
    ...r.errors.map((e) => `error ${e}`),
  ];
  return { ok: r.errors.length === 0, text: lines.join('\n') || 'Nothing changed.' };
}

createServer((req, res) => {
  const url = new URL(req.url ?? '/', `http://localhost:${PORT}`);
  const send = (code: number, text: string) =>
    res.writeHead(code, { 'content-type': 'text/plain; charset=utf-8' }).end(text);
  if (req.method === 'GET' && url.pathname === '/')
    return void res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }).end(page());
  if (
    req.method === 'GET' &&
    (url.pathname.startsWith('/takes/') || url.pathname.startsWith('/finds/'))
  )
    return serve(res, fileOf(url.pathname));
  if (req.method === 'GET' && url.pathname.startsWith('/shipped/')) {
    const base = join(root, 'public', 'sound');
    const path = normalize(join(base, decodeURIComponent(url.pathname.slice(9))));
    return serve(res, path.startsWith(base) && existsSync(path) ? path : null);
  }
  const chunks: Buffer[] = [];
  req.on('data', (c: Buffer) => chunks.push(c));
  req.on('end', () => {
    try {
      const body = Buffer.concat(chunks);
      if (url.pathname === '/pick') {
        const p = JSON.parse(body.toString('utf8')) as {
          id: string;
          url: string;
          source: string;
          licence: string;
          credit: string;
        };
        const file = fileOf(p.url);
        if (!CUES.some((c) => c.id === p.id)) return send(400, `No cue ${p.id}.`);
        if (!file) return send(400, `No take at ${p.url}.`);
        const entry = { id: p.id, source: p.source, licence: p.licence, credit: p.credit };
        const ok = soundSchema.safeParse(entry);
        if (!ok.success) return send(400, ok.error.issues.map((i) => i.message).join('\n'));
        intoInbox(p.id, file);
        record(entry);
        const b = build();
        return send(b.ok ? 200 : 500, `${p.id}: picked.\n${b.text}`);
      }
      if (url.pathname === '/drop') {
        const id = url.searchParams.get('id') ?? '';
        const name = (url.searchParams.get('name') ?? '').replace(/[\\/]/g, '_');
        if (!CUES.some((c) => c.id === id)) return send(400, `No cue ${id}.`);
        if (!AUDIO_EXTS.includes(extname(name).toLowerCase()))
          return send(400, `${name} isn't an audio file this reads.`);
        mkdirSync(join(inbox, id), { recursive: true });
        writeFileSync(join(inbox, id, name), body);
        return send(200, `${id}: ${name} added to its takes.`);
      }
      if (url.pathname === '/build') {
        const b = build();
        return send(b.ok ? 200 : 500, b.text);
      }
      send(404, 'No such page.');
    } catch (err) {
      send(500, err instanceof Error ? err.message : String(err));
    }
  });
}).listen(PORT, () =>
  console.log(`The sound picker: http://localhost:${PORT} (sounds in ${home})`),
);

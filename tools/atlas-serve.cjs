// Serves the Severed Heaven Atlas locally: the map viewer and editor in tools/atlas/index.html,
// reading and writing content/atlas/entries.json. No dependencies; run with `node tools/atlas-serve.cjs`
// and open http://localhost:4321. Edits made in the page are saved straight to entries.json.
const http = require('http'), fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
const DATA = path.join(ROOT, 'content', 'atlas', 'entries.json');
const PAGE = path.join(__dirname, 'atlas', 'index.html');
const PORT = Number(process.env.PORT) || 4321;

const load = () => JSON.parse(fs.readFileSync(DATA, 'utf8'));
// Same layout as the export: one-space indent, id first, other keys in alphabetical order.
// Written to a temp file and swapped in. On Windows an editor or a virus scanner holding entries.json
// open makes the swap fail for a moment: try again briefly, then write it in place.
const pause = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const save = list => {
  const text = JSON.stringify(list, null, 1), tmp = DATA + '.tmp';
  fs.writeFileSync(tmp, text);
  for (let i = 0; i < 5; i++) { try { return fs.renameSync(tmp, DATA); } catch (e) { if (!['EPERM', 'EBUSY', 'EACCES'].includes(e.code)) throw e; pause(100); } }
  fs.writeFileSync(DATA, text); fs.rmSync(tmp, { force: true });
};
// Only this machine's own pages may edit: a request naming another host (DNS rebinding) is refused.
const HOSTS = ['localhost', '127.0.0.1', '[::1]'].map(h => h + ':' + PORT);
const shape = (id, fields) => { const out = { id }; for (const k of Object.keys(fields).sort()) if (k !== 'id') out[k] = fields[k]; return out; };
const body = req => new Promise((ok, fail) => { let s = ''; req.on('data', c => { s += c; }); req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { fail(e); } }); });
const reply = (res, code, type, text) => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(text); };

http.createServer(async (req, res) => {
  try {
    if (!HOSTS.includes(req.headers.host)) return reply(res, 403, 'text/plain', 'forbidden host');
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) return reply(res, 200, 'text/html; charset=utf-8', fs.readFileSync(PAGE));
    if (req.method === 'GET' && url.pathname === '/api/entries') return reply(res, 200, 'application/json', fs.readFileSync(DATA));
    const m = url.pathname.match(/^\/api\/entries\/([A-Za-z0-9_.~-]+)$/);
    if (!m) return reply(res, 404, 'text/plain', 'not found');
    // The body is read before the file, so a save that lands meanwhile is never overwritten.
    const sent = req.method === 'PUT' || req.method === 'PATCH' ? await body(req) : null;
    const id = m[1], list = load(), i = list.findIndex(e => e.id === id);
    if (req.method === 'PUT') { const e = shape(id, sent); if (i < 0) list.push(e); else list[i] = e; save(list); return reply(res, 200, 'text/plain', 'saved'); }
    if (req.method === 'PATCH') { if (i < 0) return reply(res, 404, 'text/plain', 'no entry ' + id); list[i] = shape(id, Object.assign({}, list[i], sent)); save(list); return reply(res, 200, 'text/plain', 'updated'); }
    if (req.method === 'DELETE') { if (i < 0) return reply(res, 404, 'text/plain', 'no entry ' + id); list.splice(i, 1); save(list); return reply(res, 200, 'text/plain', 'deleted'); }
    return reply(res, 405, 'text/plain', 'method not allowed');
  } catch (err) { reply(res, 500, 'text/plain', String(err && err.message || err)); }
}).listen(PORT, '127.0.0.1', () => console.log('Severed Heaven Atlas on http://localhost:' + PORT + ' (editing ' + path.relative(ROOT, DATA) + ')'));

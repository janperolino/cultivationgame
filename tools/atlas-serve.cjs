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
const save = list => { const tmp = DATA + '.tmp'; fs.writeFileSync(tmp, JSON.stringify(list, null, 1)); fs.renameSync(tmp, DATA); };
const shape = (id, fields) => { const out = { id }; for (const k of Object.keys(fields).sort()) if (k !== 'id') out[k] = fields[k]; return out; };
const body = req => new Promise((ok, fail) => { let s = ''; req.on('data', c => { s += c; }); req.on('end', () => { try { ok(s ? JSON.parse(s) : {}); } catch (e) { fail(e); } }); });
const reply = (res, code, type, text) => { res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' }); res.end(text); };

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    if (req.method === 'GET' && (url.pathname === '/' || url.pathname === '/index.html')) return reply(res, 200, 'text/html; charset=utf-8', fs.readFileSync(PAGE));
    if (req.method === 'GET' && url.pathname === '/api/entries') return reply(res, 200, 'application/json', fs.readFileSync(DATA));
    const m = url.pathname.match(/^\/api\/entries\/([A-Za-z0-9_.~-]+)$/);
    if (!m) return reply(res, 404, 'text/plain', 'not found');
    const id = m[1], list = load(), i = list.findIndex(e => e.id === id);
    if (req.method === 'PUT') { const e = shape(id, await body(req)); if (i < 0) list.push(e); else list[i] = e; save(list); return reply(res, 200, 'text/plain', 'saved'); }
    if (req.method === 'PATCH') { if (i < 0) return reply(res, 404, 'text/plain', 'no entry ' + id); list[i] = shape(id, Object.assign({}, list[i], await body(req))); save(list); return reply(res, 200, 'text/plain', 'updated'); }
    if (req.method === 'DELETE') { if (i < 0) return reply(res, 404, 'text/plain', 'no entry ' + id); list.splice(i, 1); save(list); return reply(res, 200, 'text/plain', 'deleted'); }
    return reply(res, 405, 'text/plain', 'method not allowed');
  } catch (err) { reply(res, 500, 'text/plain', String(err && err.message || err)); }
}).listen(PORT, '127.0.0.1', () => console.log('Severed Heaven Atlas on http://localhost:' + PORT + ' (editing ' + path.relative(ROOT, DATA) + ')'));

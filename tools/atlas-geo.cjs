// Geometry ported verbatim from the Severed Heaven Atlas page (now tools/atlas/index.html), so outlines match the map.
// CommonJS on purpose: run with node. Needs the d3 package (npm i -D d3).
const d3 = require('d3');
const fs = require('fs'), path = require('path');
function rng(seed){ let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function hash(s){ let h = 2166136261; for (let i = 0; i < s.length; i++){ h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function blob(cx, cy, rx, ry, rotDeg, seed, rough, n){
  const R = rng(seed), terms = []; let amp = 0;
  for (let k = 2; k <= 44; k++){ const a = Math.pow(k, -1.05) * (0.45 + 1.1 * R()); terms.push([k, a, R() * Math.PI * 2]); amp += a; }
  const rot = (rotDeg || 0) * Math.PI / 180, c = Math.cos(rot), s = Math.sin(rot), pts = [];
  for (let i = 0; i < n; i++){
    const th = i / n * Math.PI * 2; let v = 0;
    for (const [k, a, ph] of terms) v += a * Math.sin(k * th + ph);
    const f = Math.max(1 - rough, Math.min(1 + rough * 2.2, 1 + rough * 3.4 * v / amp));
    const x = rx * f * Math.cos(th), y = ry * f * Math.sin(th);
    pts.push([cx + x * c - y * s, cy + x * s + y * c]);
  }
  return pts;
}
// Accepts content/atlas/entries.json (an array) or a folder of one-file-per-entry JSON.
function loadEntries(dir){
  const E = new Map();
  if (dir.endsWith('.json')){ for (const e of JSON.parse(fs.readFileSync(dir, 'utf8'))) E.set(e.id, e); return E; }
  for (const f of fs.readdirSync(dir)) if (f.endsWith('.json')){ const d = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')); E.set(f.slice(0, -5), Object.assign({ id: f.slice(0, -5) }, d)); }
  return E;
}
function build(E){
  const kids = new Map();
  for (const e of E.values()){ if (!e.parent) continue; if (!kids.has(e.parent)) kids.set(e.parent, []); kids.get(e.parent).push(e); }
  const get = id => E.get(id);
  const inSea = e => { const p = e && get(e.parent); return !!(p && (p.kind === 'sea' || (p.kind === 'region' && inSea(p)))); };
  const G = { conts: new Map(), cells: new Map(), seaZones: new Map(), kingdoms: new Map(), forbidden: new Map(), kids, get, inSea };
  for (const c of E.values()){
    if (c.kind !== 'continent' || !c.map) continue;
    const m = c.map, rx = m.rx || m.r || 80000, ry = m.ry || m.r || 80000, seed = m.seed || hash(c.id), rough = m.rough ?? 0.14;
    const pts = blob(m.x, m.y, rx, ry, m.rot || 0, seed, rough, 260);
    G.conts.set(c.id, pts);
    const regs = (kids.get(c.id) || []).filter(r => r.kind === 'region' && r.map && isFinite(r.map.x));
    if (regs.length){
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const bb = [Math.min(...xs) - 5000, Math.min(...ys) - 5000, Math.max(...xs) + 5000, Math.max(...ys) + 5000];
      const vor = d3.Delaunay.from(regs, r => r.map.x, r => r.map.y).voronoi(bb);
      regs.forEach((r, i) => { const poly = vor.cellPolygon(i); if (poly) G.cells.set(r.id, { poly, cont: c.id }); });
    }
  }
  for (const z of E.values()) if (z.kind === 'region' && z.map && inSea(z)) G.seaZones.set(z.id, { x: z.map.x, y: z.map.y, r: z.map.r || 30000 });
  for (const k of E.values()) if (k.kind === 'kingdom' && k.map && isFinite(k.map.x)){
    const r = k.map.r || 4000, sd = hash(k.id);
    G.kingdoms.set(k.id, blob(k.map.x, k.map.y, r, r * (0.75 + (sd % 30) / 100), sd % 180, sd, 0.26, 56));
  }
  for (const f of E.values()) if (f.kind === 'forbidden' && f.map && isFinite(f.map.x) && f.map.r && !f.map.inner){
    if (f.id === 'the-scar') continue;
    const sd = hash(f.id);
    G.forbidden.set(f.id, blob(f.map.x, f.map.y, f.map.r, f.map.r * 0.8, sd % 180, sd, 0.3, 48));
  }
  return G;
}
module.exports = { d3, rng, hash, blob, loadEntries, build };

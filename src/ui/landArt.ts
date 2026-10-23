// The wilds' paintings for going in (after P3.9b, Jan's idea): where no place has a painting of its
// own, a region's terrain has several (tools/land-request.ts writes their jobs; `npm run art` cuts
// them into src/ui/art/land/<region>/<terrain>/<n>.webp). The spot picks one, so the same stretch of
// karst always shows the same painting and the next valley may show another.
import { hashSeed } from '../core/rng.ts';

const files = import.meta.glob<string>('./art/land/**/*.webp', {
  eager: true,
  query: '?url',
  import: 'default',
});

const byTerrain = new Map<string, string[]>();
for (const [path, url] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b))) {
  const m = /\.\/art\/land\/([^/]+)\/([^/]+)\/[^/]+\.webp$/.exec(path);
  if (!m) continue;
  const key = `${m[1]}/${m[2]}`;
  byTerrain.set(key, [...(byTerrain.get(key) ?? []), url]);
}

/** A stretch of land this many li across shows one painting. */
const STRETCH_LI = 200;

/** A painting of a region's terrain for a spot, if any is painted yet. */
export function landArt(
  region: string,
  terrain: string,
  at: readonly [number, number],
): string | undefined {
  const all = byTerrain.get(`${region}/${terrain}`);
  if (!all?.length) return undefined;
  const cell = `${Math.floor(at[0] / STRETCH_LI)}/${Math.floor(at[1] / STRETCH_LI)}`;
  return all[hashSeed(`land/${region}/${terrain}/${cell}`) % all.length];
}

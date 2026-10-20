// Writes the ChatGPT prompt that paints a place into its crop (A5.3; docs/art-pipeline.md, Places
// painted into the map), from the place's own data, so the prompt carries everything the game knows
// of it: what shows from above, its lore and features, its size and its people, the land round it.
// tools/map-crop.ts writes one beside each crop; run this to write them again after the data changes.
//   npx tsx tools/map-prompt.ts <region-id> <place-id> [<place-id> ...]
// Writes prompt.txt in the place's folder (tools/map-paths.ts).
import { readFileSync, writeFileSync } from 'node:fs';
import type { Population } from '../src/content/atlas/schema.ts';
import { REGIONS } from '../src/content/map/index.ts';
import { placeFolder } from './map-paths.ts';

/** A crop's frame (tools/map-crop.ts): w × h li at pw × ph pixels. */
interface Crop {
  w: number;
  h: number;
  pw: number;
  ph: number;
}

interface Entry {
  id: string;
  name: string;
  pinyin?: string;
  hanzi?: string;
  kind: string;
  parent?: string;
  terrain?: string;
  summary?: string;
  lore?: string;
  features?: readonly { name: string }[];
  population?: Population;
  size?: number;
  fromAbove?: string;
  /** A power's way: orthodox, demonic, buddhist, ghost and so on. */
  way?: string;
}

const atlas = JSON.parse(readFileSync('content/atlas/entries.json', 'utf8')) as Entry[];
const byId = new Map(atlas.map((e) => [e.id, e]));

const n = (v: number) => v.toLocaleString('en-US');
/** A kingdom's or region's name inside a sentence: the March of Pacified Borders, the Border Wilds. */
const inline = (name: string) => (/^the /i.test(name) ? name.replace(/^The /, 'the ') : `the ${name}`);
/** The atlas's [[links]] as plain names. */
const plain = (text: string) => text.replace(/\[\[([^\]]+)\]\]/g, '$1');
const km = (li: number) => n(Math.round(li / 2));
const people = (p: Population) =>
  [
    p.mortals && `about ${n(p.mortals)} mortals`,
    p.qi && `${n(p.qi)} at Qi Condensation`,
    p.foundation && `${n(p.foundation)} at Foundation`,
    p.core && `${n(p.core)} at Core Formation`,
    p.nascent && `${n(p.nascent)} at Nascent Soul`,
  ]
    .filter(Boolean)
    .join(', ');

/** The prompt for one place in its crop. */
export function placePrompt(region: string, id: string, crop: Crop): string {
  const data = REGIONS[region];
  if (!data) throw new Error(`no region ${region}`);
  const town = data.content.towns.find((t) => t.id === id);
  const entry = byId.get(id);
  const p: Entry | undefined = town
    ? { ...town, kind: town.sub, parent: town.parent ?? undefined }
    : entry;
  if (!p) throw new Error(`${region} has no town or atlas place ${id}`);
  if (!p.fromAbove) throw new Error(`${id} has no fromAbove to paint from`);
  const home = byId.get(region);
  const parent = p.parent && p.parent !== region ? byId.get(p.parent) : undefined;
  const square = crop.w === crop.h;
  const shape = square
    ? `a ${crop.pw}×${crop.ph} square of a painted world map, about ${km(crop.w)} km across`
    : `a ${crop.pw}×${crop.ph} strip of a painted world map, about ${km(crop.w)} × ${km(crop.h)} km`;
  const long = (p.size ?? 0) >= Math.max(crop.w, crop.h) * 0.6;
  // Grander than life (Jan's call in A5.3: the truly big things look grander, art over strict scale),
  // but ChatGPT paints well past what it is asked (the first ones came back half the square), so the
  // numbers are low and the cap is said outright.
  const across = p.kind === 'city' ? 170 : p.kind === 'village' ? 80 : 130;
  // A long landmark (a wall) runs the image's length; a land bigger than the image (a forbidden
  // land, a kingdom) fills it.
  const howBig = long
    ? p.kind === 'landmark'
      ? `It is ${n(p.size!)} li (${km(p.size!)} km) long, so it runs the length of the image, and here it may run into the outer 15%; its greatest works stand at the centre.`
      : `It is about ${n(p.size!)} li (${km(p.size!)} km) across, larger than the image: paint it over the whole image, its heart at the centre, keeping the land's own lay (its ridges, valleys and coast where they are) and only fading toward the outer 15%.`
    :`Paint it about ${across} px across, grand and larger than life, far larger than its true ${n(p.size ?? 0)} li (${km(p.size ?? 0)} km), the way the map draws its peaks larger than they are, so it reads at once from this height; but never wider than a fifth of the image, and the land round it stays as it is.`;
  // Where people live, say so, or a sinkhole city comes back an empty hole (Heaven's Eye, A5.3).
  const lived =
    p.kind === 'city' || town
      ? `It is a city where cultivators and mortals live: fill it with halls, pagodas, terraced streets and warm lamp light, packed and grand.`
      : p.kind === 'power'
        ? `It is a sect's seat: its halls, pagodas and pavilions crown its ground, linked by stairs and bridges.`
        : '';
  const named = [p.name, [p.pinyin, p.hanzi].filter(Boolean).join(' ')].filter(Boolean).join(', ');
  // A written town is a county's seat, never a small town (design § World bible), so its kind isn't named.
  const what = [
    town ? named : p.kind === 'power' && p.way ? `${named}: ${/^[aeiou]/.test(p.way) ? 'an' : 'a'} ${p.way} sect` : `${named}: a ${p.kind}`,
    parent ? `in ${inline(parent.name)}` : null,
    home ? `in ${inline(home.name)}` : null,
    p.terrain ? `on ${p.terrain}` : null,
  ]
    .filter(Boolean)
    .join(' ');
  return `Attached is ${shape}, each pixel about 3 km, seen from very high and tilted about 50 degrees like a carved relief model. Paint ${p.name} into its very centre, into the land itself. Keep everything else exactly as it is: the same land, peaks, light, palette and brushwork, and leave the outer 15% untouched, pixel for pixel, so it joins the map around it without a seam. Return the image at exactly the attached size.

What shows of it from this height, and what to paint: ${p.fromAbove}

${howBig}${lived ? ` ${lived}` : ''}

STYLE: Chinese xianxia cultivation fantasy, as in Chinese cultivation games and donghua, never medieval European and never sci-fi. What cultivators build is grand and drawn larger than life: tiered pagodas, palace halls with sweeping upturned golden eaves, pavilions on cliff edges and peak tops, long carved stone stairs, jade bridges between peaks, walls as tall as cliffs, formation arrays as domes or rings of glowing runes, spirit-fire as pillars of light, beast-king skulls the size of hills. Rock stays natural rock: crags, sheared cliffs and peaks, never cylinders, silos, machines, reactors, metal, pipes or neon. No roads, people, text, labels or frame.

About the place, for its look and mood (none of this is written on the image):
- ${what}.${p.summary ? `\n- ${plain(p.summary)}` : ''}
- ${plain(p.lore ?? '')}${p.features?.length ? `\n- Within it: ${p.features.map((f) => f.name).join('; ')}.` : ''}${p.population ? `\n- Who lives there: ${people(p.population)}.` : ''}${home?.fromAbove ? `\n- The land round it, as the map shows it: ${home.fromAbove}` : ''}
`;
}

if (process.argv[1]?.replace(/\\/g, '/').endsWith('tools/map-prompt.ts')) {
  const [region, ...ids] = process.argv.slice(2);
  if (!region || !ids.length) throw new Error('usage: tsx tools/map-prompt.ts <region-id> <place-id> ...');
  for (const id of ids) {
    const dir = placeFolder(region, id)?.dir;
    if (!dir) throw new Error(`${id} has no folder yet: cut it first (tools/map-crop.ts)`);
    const crop = JSON.parse(readFileSync(`${dir}/place.json`, 'utf8')) as Crop;
    writeFileSync(`${dir}/prompt.txt`, placePrompt(region, id, crop));
    console.log(`${dir}/prompt.txt`);
  }
}

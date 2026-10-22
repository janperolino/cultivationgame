// Writes the art brief for each place you walk into (A6; docs/art-pipeline.md § Places and their
// doors): its banner and its door sheets, as ChatGPT prompts written from the place's own data, so a
// brief carries everything the game knows of it (Jan's call: every city and faction drawn by hand
// from its own description). One folder a place, named in English, in art/places/To paint/ until
// its art is in and in Done/ after (move it by hand), with brief.md; and its assets in
// art/manifest.json as trickle assets, waiting for Jan's PNGs in art/inbox/.
//   npx tsx tools/place-brief.ts [region-id]      (the Border Wilds by default)
// Run it again after a place's data or doors change: briefs in To paint/ and the manifest's
// entries are rewritten; a place in Done/ is left alone.
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import type { Population } from '../src/content/atlas/schema.ts';
import { REGIONS } from '../src/content/map/index.ts';
import { doorLine } from '../src/content/doorLines.ts';
import { newLife } from '../src/core/state.ts';
import { ensureMap, mapOf } from '../src/core/map/travel.ts';
import { placeKindOf } from '../src/core/map/gate.ts';
import { isMissionHall } from '../src/core/map/board.ts';
import { seatPowerAt } from '../src/core/joining.ts';
import { isOrganization, organization, theName } from '../src/core/organizations.ts';
import type { MapPlace } from '../src/core/map/region.ts';
import {
  doorsOf,
  gridTabs,
  layoutOf,
  SEAT_TILE,
  INSIDE_TILE,
  type Door,
} from '../src/ui/placeDoors.ts';
import { manifestSchema, type ArtAsset } from './art-lib.ts';
import { folderName } from './map-paths.ts';

const region = process.argv[2] ?? 'qm-bianhuang';
const ROOT = 'art/places';
const TO_PAINT = `${ROOT}/To paint`;
const DONE = `${ROOT}/Done`;

interface Entry {
  id: string;
  name: string;
  pinyin?: string;
  hanzi?: string;
  type?: string;
  way?: string;
  summary?: string;
  lore?: string;
  features?: readonly { name: string }[];
  population?: Population;
  size?: number;
  fromAbove?: string;
}

const atlas = JSON.parse(readFileSync('content/atlas/entries.json', 'utf8')) as Entry[];
const byId = new Map(atlas.map((e) => [e.id, e]));
const data = REGIONS[region];
if (!data) throw new Error(`No region ${region}`);
for (const t of data.content.towns) byId.set(t.id, t);

const n = (v: number) => v.toLocaleString('en-US');
const plain = (text: string) => text.replace(/\[\[([^\]]+)\]\]/g, '$1');
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

/** The style every place's prompt carries word for word, so a place's sheets agree. */
const STYLE =
  'STYLE: Chinese xianxia cultivation fantasy, as in Chinese cultivation games and donghua, painted with rich detail and calm, restrained light, in a deep, dark-toned palette (dusk, lamplight, mist, the night sky) so that gold and ivory text reads over it, with a little muted cyan qi light where cultivation shows; never medieval European, never sci-fi. The world is vast, at continental scale: a city is a sea of roofs to the horizon, a village is the seat of a county the size of a country. What cultivators build is grand and drawn larger than life: tiered pagodas, palace halls with sweeping upturned golden eaves, pavilions on cliff edges, long carved stone stairs, jade bridges, walls as tall as cliffs, formation arrays as domes or rings of glowing runes, spirit-fire as pillars of light. Rock stays natural rock. NO TEXT, NO LETTERS, NO NUMBERS, NO UI, no signs with writing, no frame, no watermark.';

/** What the place is, in a line, for the prompt. */
function kindWords(p: MapPlace): string {
  const k = placeKindOf(p);
  if (k === 'city') return 'a city';
  if (k === 'town') return 'a town, the seat of a county';
  if (k === 'village') return 'a village, the seat of a farming county';
  if (k === 'gate') return 'a sect behind its gate and array';
  const e = byId.get(p.id);
  return e?.type ? `the seat of a ${e.type}` : 'a landmark';
}

/** Where the banner's text and cards sit, by the layout that shows it. */
function bannerRoom(layout: string): string {
  return layout === 'village'
    ? 'The game shows the whole painting behind a few cards: keep the top-left third calmer and darker (the name and lore sit there) and the bottom quarter calm near ground (a row of door cards sits there); put the place itself in the centre and right.'
    : 'The game shows a wide strip of it, from about 20% to 60% of the height, under its name and lore: put the place itself in that band and in the right two thirds; keep the left third calmer and darker (the text sits over it); above the band quiet sky, below it the near ground fading to dark.';
}

interface Brief {
  /** The art's folder in src/ui/art/places/ and the key the game looks it up by. */
  id: string;
  name: string;
  hanzi: string;
  pinyin: string;
  what: string;
  layout: string;
  doors: Door[];
  about: string[];
  fromAbove: string;
}

const slug = (id: string) => id.replace(/^qm-/, '').replace(/[^a-z0-9-]/g, '-');

function bannerPrompt(b: Brief): string {
  return [
    `Create ONE landscape 1536x1024 painting AS AN ASSET, placed behind real HTML text and buttons on a game screen: the banner of ${b.name} (${b.pinyin} ${b.hanzi}), ${b.what}, as a traveller arriving sees it from a height nearby.`,
    `What it looks like: ${b.fromAbove}`,
    bannerRoom(b.layout),
    'Paint the place only: no people close up, no cultivator, no creatures unless named here.',
    STYLE,
    'About the place, for its look and mood (none of this is written on the image):',
    ...b.about.map((a) => `- ${a}`),
  ].join('\n\n');
}

function sheetPrompt(b: Brief, doors: Door[], i: number, of: number): string {
  const cells = doors.map((d, k) => {
    const line = doorLine(b.id, d.art);
    return `${k + 1}. ${d.name}${d.hanzi && !d.name.includes(d.hanzi) ? ` ${d.hanzi}` : ''}: ${line ?? d.sub}`;
  });
  for (let k = doors.length; k < 9; k++) cells.push(`${k + 1}. Empty: plain dark mist.`);
  return [
    `Create ONE landscape 1536x1024 image AS A SHEET of nine separate painted scenes on an even 3x3 grid, each cell exactly 512x341, edge to edge, with no borders, gaps, frames, text or labels between them. The game cuts it into nine pictures, each shown as a door card with its name written under it by the game. All nine are views inside ${b.name} (${b.hanzi}), ${b.what}: the same place, the same light and palette in every cell, each scene's subject in its upper two thirds (the card's name covers the bottom third).${of > 1 ? ` This is sheet ${i} of ${of}.` : ''}`,
    'Cells, left to right, top to bottom:',
    cells.join('\n'),
    'People only small, in the middle distance, faceless; the place is the subject.',
    STYLE,
    `The place, for mood: ${b.about[1] ?? b.about[0]}`,
  ].join('\n\n');
}

function markdown(b: Brief, sheets: Door[][]): string {
  const files = [
    `place-${slug(b.id)}-banner.png`,
    ...sheets.map((_, i) => `place-${slug(b.id)}-doors-${i + 1}.png`),
  ];
  return [
    `# ${b.name} ${b.hanzi}, the art brief`,
    '',
    `${b.what[0]!.toUpperCase()}${b.what.slice(1)}, shown in the ${b.layout} layout (A6). ${1 + sheets.length} ChatGPT runs: the banner, then ${sheets.length === 1 ? 'one door sheet' : `${sheets.length} door sheets`} of nine. Save each result into \`art/inbox/\` under its name below, run \`npm run art\`, and move this folder to \`Done/\` once all are in.`,
    '',
    ...files.map((f) => `- \`${f}\``),
    '',
    `## 1. The banner: \`${files[0]}\``,
    '',
    '```text',
    bannerPrompt(b),
    '```',
    '',
    ...sheets.flatMap((doors, i) => [
      `## ${i + 2}. The doors${sheets.length > 1 ? `, sheet ${i + 1} of ${sheets.length}` : ''}: \`${files[i + 1]}\``,
      '',
      'If ChatGPT drifts off the grid, ask in the same chat: "Same image, but on an exact even 3x3 grid, edge to edge, no text."',
      '',
      '```text',
      sheetPrompt(b, doors, i + 1, sheets.length),
      '```',
      '',
    ]),
    `Pieces, in order: ${sheets.map((d) => d.map((x) => x.art).join(', ')).join(' | ')}.`,
    '',
  ].join('\n');
}

/** A place's or a power's doors to paint: everything a member or an outsider could open. */
function hallDoors(outsider: Door[], power: string): Door[] {
  const extra: Door[] = [SEAT_TILE, INSIDE_TILE];
  const has = (id: string) => outsider.some((d) => d.id === id);
  if (!has('ground'))
    extra.push({
      id: 'ground',
      seal: '武',
      name: 'Training ground',
      hanzi: '演武场',
      sub: '',
      group: 'power',
      art: 'ground',
      room: 'hall',
    });
  if (!has('elders'))
    extra.push({
      id: 'elders',
      seal: '长',
      name: 'Elders’ hall',
      hanzi: '长老院',
      sub: '',
      group: 'power',
      art: 'elders',
      room: 'hall',
    });
  if (isMissionHall(power) && !has('board'))
    extra.push({
      id: 'board',
      seal: '任',
      name: 'Mission hall',
      hanzi: '任务堂',
      sub: '',
      group: 'hall',
      art: 'mission',
      room: 'board',
    });
  return [...outsider, ...extra];
}

function about(e: Entry | undefined, regionName: string): string[] {
  if (!e) return [];
  return [
    `${e.name}${e.pinyin ? `, ${e.pinyin}` : ''}${e.hanzi ? ` ${e.hanzi}` : ''}, in ${regionName.replace(/^The /, 'the ')}${e.way ? `, a ${e.way}-way ${e.type ?? 'power'}` : ''}.`,
    e.summary ? plain(e.summary) : e.lore ? plain(e.lore) : '',
    e.summary && e.lore ? plain(e.lore) : '',
    e.size ? `It is about ${n(e.size)} li (${n(Math.round(e.size / 2))} km) across.` : '',
    e.population ? `Its people: ${people(e.population)}.` : '',
    e.features?.length ? `Within it: ${e.features.map((f) => f.name).join('; ')}.` : '',
  ].filter(Boolean);
}

const life = ensureMap(
  newLife({ name: 'Brief', seed: 'brief', origin: { id: 'cave-orphan', choice: 'along' } }),
);
const map = mapOf(life)!;
const briefs: { b: Brief; sheets: Door[][]; near: number }[] = [];
const homes = Object.values(data.content.homes)
  .map((h) => map.places.find((p) => p.id === h)!)
  .filter(Boolean);
const nearStart = (p: { x: number; y: number }) =>
  Math.min(...homes.map((h) => Math.hypot(h.x - p.x, h.y - p.y)));
const powersSeen = new Set<string>();

for (const p of map.places) {
  const kind = placeKindOf(p);
  if (!kind || kind === 'site') continue;
  const doors = doorsOf(life, map, p);
  const power = seatPowerAt(map, p);
  const own = power === p.id;
  const layout = layoutOf(kind);
  const e = byId.get(p.id);
  let list: Door[];
  if (layout === 'hall' && own && power && isOrganization(power)) list = hallDoors(doors, power);
  else if (layout === 'grid') list = gridTabs(doors).flatMap((t) => t.doors);
  else list = doors.filter((d) => d.group !== 'power');
  if (layout === 'village' && power)
    list.push({
      ...SEAT_TILE,
      id: 'hall',
      name: `${theName(power)}’s hall`,
      hanzi: undefined,
      art: 'hall',
    });
  if (list.length === 0 && !e?.fromAbove) continue;
  const sheets: Door[][] = [];
  for (let i = 0; i < list.length; i += 9) sheets.push(list.slice(i, i + 9));
  briefs.push({
    b: {
      id: p.id,
      name: p.name,
      hanzi: p.hanzi,
      pinyin: p.pinyin,
      what: kindWords(p),
      layout,
      doors: list,
      about: about(e, map.name),
      fromAbove: e?.fromAbove ?? p.lore,
    },
    sheets,
    near: p.id === data.content.defaultHome ? -1 : nearStart(p),
  });
  // A power seated at a place but no place of its own (the March at Pacified Fort): its own brief.
  if (
    power &&
    !own &&
    isOrganization(power) &&
    !map.places.some((x) => x.id === power) &&
    !powersSeen.has(power)
  ) {
    powersSeen.add(power);
    const org = organization(power);
    const pe = byId.get(power);
    const pd = hallDoors(
      doors.filter((d) => d.group === 'power'),
      power,
    );
    briefs.push({
      b: {
        id: power,
        name: org.name,
        hanzi: org.hanzi,
        pinyin: org.row.pinyin,
        what: `the hall of ${theName(power)} at ${p.name}`,
        layout: 'hall',
        doors: pd,
        about: about(pe, map.name),
        fromAbove: `${theName(power)}'s own hall inside ${p.name}: ${pe?.fromAbove ?? ''}`,
      },
      sheets: [pd.slice(0, 9), ...(pd.length > 9 ? [pd.slice(9)] : [])],
      near: nearStart(p) + 1,
    });
  }
}

briefs.sort((a, z) => a.near - z.near);

// The briefs, and the manifest's trickle entries for every place not done.
const done = new Set(existsSync(DONE) ? readdirSync(DONE) : []);
const manifestPath = 'art/manifest.json';
const manifest = manifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8')));
const keep = manifest.assets.filter((a) => !a.id.startsWith('place-') || !a.trickle);
const added: ArtAsset[] = [];
for (const { b, sheets } of briefs) {
  const folder = folderName(b.name);
  if (done.has(folder)) continue;
  mkdirSync(`${TO_PAINT}/${folder}`, { recursive: true });
  writeFileSync(`${TO_PAINT}/${folder}/brief.md`, markdown(b, sheets));
  const s = slug(b.id);
  added.push({
    id: `place-${s}-banner`,
    kind: 'scene',
    out: `src/ui/art/places/${b.id}/banner.webp`,
    width: 1536,
    quality: 82,
    budgetKB: 300,
    prompt: bannerPrompt(b),
    trickle: true,
  });
  sheets.forEach((doors, i) =>
    added.push({
      id: `place-${s}-doors-${i + 1}`,
      kind: 'scene',
      out: `src/ui/art/places/${b.id}/doors-${i + 1}`,
      width: 480,
      quality: 82,
      budgetKB: 60,
      prompt: sheetPrompt(b, doors, i + 1, sheets.length),
      cells: [3, 3],
      pieces: doors.map((d) => d.art),
      trickle: true,
    }),
  );
}
const ids = new Set(keep.map((a) => a.id));
writeFileSync(
  manifestPath,
  JSON.stringify(
    { ...manifest, assets: [...keep, ...added.filter((a) => !ids.has(a.id))] },
    null,
    2,
  ) + '\n',
);

// The order to paint them in: the City first, then the places nearest the starts.
const order = briefs
  .filter(({ b }) => !done.has(folderName(b.name)))
  .map(
    ({ b, sheets }, i) =>
      `${i + 1}. ${b.name} ${b.hanzi} (${b.layout}, ${1 + sheets.length} run${sheets.length ? 's' : ''})`,
  );
writeFileSync(
  `${ROOT}/README.md`,
  [
    '# Places and their doors, to paint',
    '',
    'Each place you walk into paints its own banner and doors (A6; `docs/art-pipeline.md` § Places and their doors). Each folder in `To paint/` holds a `brief.md` with the ChatGPT prompts, written from the place’s data by `npx tsx tools/place-brief.ts`; save the results into `art/inbox/` under the names the brief gives, run `npm run art`, and move the folder to `Done/`. Until then the game shows the plain card, hatched.',
    '',
    'In this order: the City of the Guarded Mouth first, then the places nearest the starts.',
    '',
    ...order,
    '',
  ].join('\n'),
);
console.log(`${added.length} assets for ${order.length} places; the order in ${ROOT}/README.md`);

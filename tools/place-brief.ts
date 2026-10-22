// Writes the art brief for each place you walk into (A6; docs/art-pipeline.md § Places and their
// doors): its banner and its door sheets, as ChatGPT prompts written from the place's own data, so a
// brief carries everything the game knows of it (Jan's call: every city and faction drawn by hand
// from its own description). One folder a place, named in English, in art/places/To paint/ until
// its art is in and in Done/ after (move it by hand), with brief.md; and its assets in
// art/manifest.json as trickle assets, waiting for Jan's PNGs in art/inbox/.
//   npx tsx tools/place-brief.ts [region-id]      (the Border Wilds by default)
// Run it again after a place's data or doors change: briefs in To paint/ and the manifest's
// entries are rewritten; a place in Done/ is left alone.
import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import type { Population } from '../src/content/atlas/schema.ts';
import { REGIONS } from '../src/content/map/index.ts';
import { PLACE_KIND_INFO } from '../src/content/map/places.ts';
import { doorLine } from '../src/content/doorLines.ts';
import { PLACE_LOOKS } from '../src/content/placeLooks.ts';
import { newLife, type GameState } from '../src/core/state.ts';
import { ensureMap, mapOf } from '../src/core/map/travel.ts';
import { placeKindOf } from '../src/core/map/gate.ts';
import { seatPowerAt } from '../src/core/joining.ts';
import {
  isOrganization,
  joinPower,
  leavePower,
  membershipsOf,
  realmStageOf,
  theName,
} from '../src/core/organizations.ts';
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

/**
 * The style every place's prompt carries word for word. It names no buildings and no palette:
 * a stock list of walls, domes and spirit-fire made the City and Pacified Fort come out alike
 * (Jan, after the first two), so each place's look comes from its own data, terrain and light.
 */
const STYLE =
  'STYLE: Chinese xianxia cultivation fantasy, as in Chinese cultivation games and donghua, painted with rich detail; never medieval European, never sci-fi. The world is vast, at continental scale: a city is a sea of roofs to the horizon, a village is the seat of a county the size of a country. What cultivators build is grand and larger than life, but paint only what this place has, never a stock xianxia city. Rock stays natural rock. NO TEXT, NO LETTERS, NO NUMBERS, NO UI, no signs with writing, no frame, no watermark.';

/** The land a place stands in, as the painting should feel it. */
const TERRAIN_LOOK: Record<string, string> = {
  coast: 'a sea coast: surf, reefs, sea cliffs, harbour water and salt haze',
  hills:
    'folded green hill country, terraced fields in the valleys, beacon peaks on the ridgelines',
  karst:
    'karst country: stone pillars by the hundred standing out of a sea of cloud, sinkholes and caves',
  marsh: 'black fen water, reeds, mist lying flat on the water, stilts and causeways',
  plains: 'open grass plains to the horizon, wide sky, herds and wind',
  steppe: 'high dry steppe, wind-bent grass, a huge sky',
  forest: 'old forest, giant trees, roots and moss, light falling in shafts',
  mountains: 'high mountains, snowfields and sheer faces, cloud below the peaks',
  canyon: 'a deep red canyon, sheer walls and a river far below',
};

/** The lights a place is painted under (Jan, after the first two came out alike). */
const LIGHTS = [
  'a grey dawn, mist low in the valleys and the first sun on the high stone',
  'a moonlit night, silver light on stone and water, lamps warm against it',
  'late golden afternoon under heavy cloud, long shadows',
  'a storm rolling in, rain curtains and lightning far off',
  'a red sunset smouldering through smoke',
  'a snowy night, the roofs white, lamps warm in the cold',
  'heavy rain at dusk, every street and roof a mirror',
  'a bright overcast morning, soft light, colours clear',
];
/** Each place's light, dealt in the painting order, so places painted one after another differ. */
const lights = new Map<string, string>();
const lightOf = (id: string) => lights.get(id) ?? LIGHTS[0]!;

/** The main checkout, where the map's painted places live (art/map is shared by every worktree). */
const MAIN = dirname(resolve(execSync('git rev-parse --git-common-dir').toString().trim()));
/** A place's own painting on the world map (A5.3), the reference every run attaches. */
function refOf(name: string): string | undefined {
  const f = join(MAIN, 'art', 'map', region, 'places', 'Done', folderName(name), 'painted.png');
  return existsSync(f) ? f : undefined;
}

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
  terrain: string;
  features: string[];
  ref?: string;
  size?: number;
  population?: Population;
}

/** What makes a place itself: its reference, its land, its light and what sets it apart. */
/** The place's true size, said so the painting is drawn at it (Jan: make the scale accurate). */
function scaleOf(b: Brief): string | null {
  if (!b.size) return null;
  const km = Math.round(b.size / 2);
  const who = b.population ? `, home to ${people(b.population)}` : '';
  const at =
    km >= 50
      ? 'its roofs run past the horizon, its walls and great works are cliffs hundreds of metres tall, and a whole tower is a speck in the view'
      : km >= 15
        ? 'a great city in its own right that fills the whole view, streets as wide as rivers, its biggest halls the size of hills'
        : km >= 5
          ? 'a large town spreading across its valley or terraces, thousands of roofs, its cultivators’ works towering over them'
          : 'a settlement of thousands, its houses at human size and its few cultivators’ works far larger than life';
  return `SCALE: it is about ${n(b.size)} li (${n(km)} km) across${who}. Paint it at that true size from a nearby height: ${at}. Never a small medieval town.`;
}

function look(b: Brief): string[] {
  const own = PLACE_LOOKS[b.id];
  return [
    ...(b.ref
      ? [
          `Attached is ${b.name} as it is painted on the game's world map, seen from very high: this is the same place up close, so keep its architecture, its colours and the way it sits on the land.`,
        ]
      : []),
    `Make it unmistakably ${b.name}, unlike any other city, town or sect in the game.`,
    ...(own
      ? [
          `ITS LOOK: ${own.look} Colours: ${own.colours}. It feels ${own.feels}. Leave out: ${own.not}.`,
        ]
      : []),
    `From the world map it shows as: ${b.fromAbove}${b.features.length ? ` Within it: ${b.features.join('; ')}.` : ''}`,
    ...[scaleOf(b)].filter((x): x is string => !!x),
    `The land: ${TERRAIN_LOOK[b.terrain] ?? b.terrain}.`,
    `The light: ${lightOf(b.id)}. Keep the whole on the dark side, so gold and ivory text reads over it.`,
  ];
}

const slug = (id: string) => id.replace(/^qm-/, '').replace(/[^a-z0-9-]/g, '-');

function bannerPrompt(b: Brief): string {
  return [
    `Create ONE landscape 1536x1024 painting AS AN ASSET, placed behind real HTML text and buttons on a game screen: the banner of ${b.name} (${b.pinyin} ${b.hanzi}), ${b.what}, as a traveller arriving sees it from a height nearby.`,
    ...look(b),
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
    `Create ONE landscape 1536x1024 image AS A SHEET of nine separate painted scenes on an even 3x3 grid, each cell exactly 512x341, edge to edge, with no borders, gaps, frames, text or labels between them. The game cuts it into nine pictures, each shown as a door card with its name written under it by the game. All nine are views inside ${b.name} (${b.hanzi}), ${b.what}, the same place as the banner made just before in this chat: its architecture, light and palette in every cell, each scene's subject in its upper two thirds (the card's name covers the bottom third).${of > 1 ? ` This is sheet ${i} of ${of}.` : ''}`,
    'Cells, left to right, top to bottom:',
    cells.join('\n'),
    'Vary the shot across the cells: at least three inside (a counter, a hall’s interior, a workshop), some close on the work, some wide; the walls or skyline behind in no more than three cells. People only small, in the middle distance, faceless; the place is the subject.',
    ...look(b),
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
    ...(b.ref
      ? [
          `**Attach this to every run**, the place as it is painted on the world map: \`${b.ref}\``,
          '',
        ]
      : []),
    'Run them in one chat, the banner first, so the door sheets keep its look.',
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
/** A life that is a member of a power, to read the doors its members see. */
function memberOf(base: GameState, power: string): GameState | null {
  let s = base;
  for (const m of membershipsOf(s.world, s.player.id))
    s = { ...s, world: leavePower(s.world, s.player.id, m.power, s.calendar.day).world };
  for (const by of [undefined, 'birth'] as const) {
    const r = joinPower(s.world, s.player.id, power, s.calendar.day, {
      you: true,
      realm: realmStageOf(s),
      ...(by ? { by } : {}),
    });
    if (r.ok) return { ...s, world: r.world };
  }
  return null;
}

/**
 * Every door a power's hall can show at a place, so a brief paints them all at once (Jan's call:
 * a site's art in one go): what an outsider sees, what a member sees (read from a member's life,
 * so the elders' hall has its own name, the Commandery at the March), the member's own tiles, and
 * the law hall a marked face is sent to.
 */
function hallDoors(p: MapPlace, power: string, onlyPower: boolean): Door[] {
  const pick = (ds: Door[]) => (onlyPower ? ds.filter((d) => d.group === 'power') : ds);
  const out = pick(doorsOf(life, map, p));
  const member = memberOf(life, power);
  const extra: Door[] = [
    ...(member ? pick(doorsOf(member, map, p)) : []),
    SEAT_TILE,
    INSIDE_TILE,
    ...(isOrganization(power)
      ? [
          {
            id: 'law-hall',
            seal: '律',
            name: 'Law hall',
            hanzi: '律堂',
            sub: 'restitution for a leaked method',
            group: 'hall' as const,
            art: 'law-hall',
            room: 'hall' as const,
          },
        ]
      : []),
  ];
  for (const d of extra) if (!out.some((x) => x.art === d.art)) out.push(d);
  return out;
}

function about(e: Entry | undefined, regionName: string): string[] {
  if (!e) return [];
  return [
    `${e.name}${e.pinyin ? `, ${e.pinyin}` : ''}${e.hanzi ? ` ${e.hanzi}` : ''}, in ${regionName.replace(/^The /, 'the ')}${e.way ? `, ${/^[aeiou]/.test(e.way) ? 'an' : 'a'} ${e.way}-way ${e.type ?? 'power'}` : ''}.`,
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

for (const p of map.places) {
  const kind = placeKindOf(p);
  if (!kind || kind === 'site') continue;
  const doors = doorsOf(life, map, p);
  const power = seatPowerAt(map, p);
  const own = power === p.id;
  const layout = layoutOf(kind);
  const e = byId.get(p.id);
  let list: Door[];
  if (layout === 'hall' && own && power && isOrganization(power)) list = hallDoors(p, power, false);
  else if (layout === 'grid') list = gridTabs(doors).flatMap((t) => t.doors);
  else list = doors.filter((d) => d.group !== 'power');
  // The map seller shows only to one inside (mapsAt), so the brief adds it by the kind's maps;
  // last on the sheets, so a sheet already painted keeps its cells.
  if (PLACE_KIND_INFO[kind].maps && !list.some((d) => d.id === 'maps'))
    list.push({
      id: 'maps',
      seal: '图',
      name: 'Map seller',
      hanzi: '图铺',
      sub: 'the region’s maps and its kingdoms’',
      group: 'hear',
      art: 'maps',
      room: 'departures',
    });
  if (layout === 'village' && power)
    list.push({
      ...SEAT_TILE,
      id: 'hall',
      name: `${theName(power)}’s hall`,
      hanzi: undefined,
      art: 'hall',
    });
  // A power whose seat stands here (the Guild in the City, the March at Pacified Fort) paints its
  // hall with the place, so one site's brief covers every picture shown there (Jan's call): its
  // doors on sheets of their own after the place's, so the place's sheets keep their cells.
  const housed = Object.entries(data.content.homes)
    .filter(([pow, h]) => h === p.id && pow !== p.id && isOrganization(pow))
    .map(([pow]) => pow);
  // The power's own map place (the Guild's) paints with the place it stands in.
  const home = data.content.homes[p.id];
  if (home && home !== p.id) continue;
  if (list.length === 0 && !e?.fromAbove) continue;
  const sheets: Door[][] = [];
  for (let i = 0; i < list.length; i += 9) sheets.push(list.slice(i, i + 9));
  for (const pow of housed) {
    const pd = hallDoors(p, pow, true).map((d) => ({ ...d, name: `${d.name} (${theName(pow)})` }));
    for (let i = 0; i < pd.length; i += 9) sheets.push(pd.slice(i, i + 9));
  }
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
      terrain: p.terrain,
      features: p.features.map((f) => f.name),
      size: e?.size,
      population: e?.population,
      ref: refOf(p.name),
    },
    sheets,
    near: p.id === data.content.defaultHome ? -1 : nearStart(p),
  });
}

briefs.sort((a, z) => a.near - z.near);
briefs.forEach(({ b }, i) => lights.set(b.id, LIGHTS[i % LIGHTS.length]!));

// The briefs, and the manifest's trickle entries for every place not done.
const done = new Set(existsSync(DONE) ? readdirSync(DONE) : []);
const manifestPath = 'art/manifest.json';
const manifest = manifestSchema.parse(JSON.parse(readFileSync(manifestPath, 'utf8')));
// A place in Done/ keeps its entries (its art is in); the rest are written again.
const doneIds = new Set(
  briefs.filter(({ b }) => done.has(folderName(b.name))).map(({ b }) => `place-${slug(b.id)}-`),
);
const keep = manifest.assets.filter(
  (a) => !a.id.startsWith('place-') || !a.trickle || [...doneIds].some((d) => a.id.startsWith(d)),
);
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
    quality: 78,
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

// Asks an image model on OpenRouter for a map painting (A5): a region from its guide, or a detail
// tile from its reference. The key is OPENROUTER_API_KEY in .env.local, read here and never printed.
//   npx tsx tools/map-paint.ts region <region-id> <out.png> [--take A|B|C|D] [--style <painting.png>]
//     [--with <neighbour painting.png> ...]
//   npx tsx tools/map-paint.ts tile <region-id> <tile-id> [<out.png>] [--note <text>] [--ref <png>]
// About $0.21 and a minute or two an image with openai/gpt-5.4-image-2.
import { readFileSync } from 'node:fs';
import sharp from 'sharp';
import { guideJson, guidePng, paintingPng, workDir } from './map-paths.ts';

const MODEL = 'openai/gpt-5.4-image-2';

const KEY = readFileSync('.env.local', 'utf8')
  .match(/^OPENROUTER_API_KEY=(.*)$/m)?.[1]
  ?.trim();
if (!KEY) throw new Error('no OPENROUTER_API_KEY in .env.local');

const PALETTE =
  'Night-dark and moonlit, desaturated: slate and blue-grey stone, deep pine green, muted ochre and umber earth, dark teal water, soft mist, a faint cool rim of starlight. No neon, no glow haze, no bright daylight.';
const NO_PLACES =
  'NO PLACES AND NO ROADS: ignore the white symbols and the red lines and paint the land under them as it is around them. No buildings, no towns, no lights, no paths: only the land itself.';
const NO_TEXT = 'NO TEXT, no labels, no letters, no compass, no scale bar, no frame, no UI.';
const LEGEND =
  'Colors in the guide are terrains: slate blue = karst, forests of thin stone pillars; grey = mountains, and a wide grey band is a mountain ridge that runs on across borders; steel blue line = a river winding in its valley; tan = rolling dry hills; pale olive = open grassland; soft green = green hills terraced with herb gardens; dark green = pine forest; teal = marsh, reeds and dark water; pale sand = rocky coast and dunes; mauve = blighted dead gardens; navy = the dark sea; flat dark grey = the land beyond, plain dark lowland in shadow, low detail.';

const SMALL =
  'SCALE, the most important thing: this is a whole country thousands of miles across. Everything that rises is SMALL and there is a great deal of it: a mountain ridge is hundreds of tiny packed peaks, never a few big ones; a karst area is thousands of needle-thin stone pillars, as fine as a field of grass; hills are a fine wrinkled texture; a forest is a carpet of tiny trees. No single peak or pillar is wider than about one percent of the image. The land must feel vast, with open ground between features.';
const MIX =
  'SCALE: halfway between the second image and a true map of a whole country. Each peak and stone pillar is about HALF the size it is in the second image and there are more of them: the ridge is a range of dozens of sharp peaks, the karst is crowded with hundreds of tall stone pillars. There is more open ground between features, so the land feels larger and the places in it farther apart.';
const XIANXIA =
  'MOOD, a xianxia cultivation world, sacred and wild: a sea of cloud pools in the valleys and round the karst, so the stone pillars rise out of the mist like Zhangjiajie and Huangshan; lone gnarled pines cling to pillar tops and cliff edges; thin waterfalls fall from the cliffs into mist; the ridge peaks are sharp and dramatic, like Chinese ink-wash mountains; a few faint threads of pale cyan spirit qi drift in the mist over the wildest ground and the lake, very subtle. Ancient, untouched, numinous.';

/** Each take: how it is seen, how big things are, and what it keeps of the earlier painting. */
const TAKES: Record<
  string,
  { view: string; scale: string; keep: string; mood?: string; palette?: string }
> = {
  A: {
    view: 'VIEW: from very high, tilted slightly, about 60 degrees from the horizon, so the land rises toward you like a beautifully painted relief model: peaks, stone pillars and cliffs stand up out of the map with real height and cast soft shadows to the lower right.',
    scale: SMALL,
    keep: 'match its palette, its rich painted finish and the way the land rises out of the map, but NOT its scale.',
  },
  B: {
    view: 'VIEW: almost straight down from very high above, like a map, with the height shown by light and shadow: every peak, stone pillar and cliff still stands out of the land with real relief and casts a soft shadow to the lower right.',
    scale: SMALL,
    keep: 'match its palette, its rich painted finish and the way the land rises out of the map, but NOT its scale.',
  },
  // C and D, Jan's mix: the earlier painting's bold relief and palette at half its scale, in a
  // cultivation mood.
  C: {
    view: 'VIEW: the same high, slightly oblique view as the second image, the peaks and stone pillars jutting boldly up out of the map with real height, sharp light from the upper left and long soft shadows to the lower right.',
    scale: MIX,
    keep: 'this is the look we love: keep its palette and brightness, its rich painted finish and above all how boldly the peaks and stone pillars jut up out of the map. Change only the scale and the mood, as below.',
    mood: XIANXIA,
    palette:
      "Keep the second image's palette: moonlit but clear, ochre and umber hills, slate-blue karst, deep pine green, teal water, white mist. No neon, no glow haze.",
  },
  D: {
    view: 'VIEW: from high and tilted more than the second image, about 50 degrees from the horizon, so the land rises toward you like a carved relief model, the peaks and stone pillars standing tall with dramatic light from the upper left and long shadows.',
    scale: MIX,
    keep: 'this is the look we love: keep its palette and brightness, its rich painted finish and above all how boldly the peaks and stone pillars jut up out of the map. Change only the scale and the mood, as below.',
    mood:
      XIANXIA.replace('very subtle', 'subtle but visible') +
      ' The whole land feels like a place where immortals walk.',
    palette:
      "Keep the second image's palette: moonlit but clear, ochre and umber hills, slate-blue karst, deep pine green, teal water, white mist. No neon, no glow haze.",
  },
};

function regionPrompt(take: string): string {
  const t = TAKES[take];
  if (!t) throw new Error(`no take ${take}`);
  return [
    `Repaint the first attached image, a flat color layout guide, as a finished painted fantasy world map of the same land. Same framing and size as the guide, portrait 2:3. Keep the guide's layout EXACTLY: the coastlines, the borders between areas, the ridges and the rivers stay in the same place and the same shape. The second attached image is an earlier painting of this land: ${t.keep}`,
    t.view,
    t.scale,
    ...(t.mood ? [t.mood] : []),
    `AREAS read at a glance: each colored area is clearly its own terrain, with its own color and texture and soft but clear edges. The thin black lines are borders: paint them as faint dark seams, not walls. ${LEGEND}`,
    NO_PLACES,
    'The land is flat to its edges and runs straight on into the land beyond: NO cliffs round it, NO floating island, NO raised slab. Only where the land meets the sea is there a coast, with surf and a few sea cliffs.',
    t.palette ?? PALETTE,
    NO_TEXT,
  ].join('\n\n');
}

const TILE_PROMPT = [
  'The first attached image is a blurry close-up of a painted fantasy world map. Repaint it sharp and finely detailed at the same size, as if seen through a much better lens: keep EVERYTHING where it is. Every coastline, every edge between terrains, every field of stone pillars, hill, ridge, forest, lake, marsh and patch of mist stays in the same place, shape, size and color. Add only fine detail: individual stone pillars and pines, rock faces, grass and scree, ripples on water, wisps of mist.',
  'The second attached image is the layout guide for this same area. Use it only to keep the terrains true; never draw its flat colors, lines or symbols. The third attached image shows the level of painted detail and the palette wanted.',
  'SCALE: this is still a vast land seen from very high above; a stone pillar or a peak is small, and there are many of them, never a few giant ones.',
  // Jan's take D: the cultivation mood only shows close in, so the tiles carry its details.
  'MOOD, a xianxia cultivation world, in the fine detail: mist pooling between the stone pillars so their tops rise out of a sea of cloud; lone gnarled pines on pillar tops and cliff edges; thin waterfalls threading down cliffs into the mist; sharp ink-wash ridgelines; here and there the faintest thread of pale cyan spirit qi drifting in the mist, very subtle. Ancient and untouched.',
  'NO PLACES AND NO ROADS: no buildings, no towns, no lights, no paths, no symbols. Night-dark and moonlit, desaturated, the same palette as the first image.',
  NO_TEXT,
].join('\n\n');

const asJpeg = async (file: string) =>
  `data:image/jpeg;base64,${(await sharp(file).jpeg({ quality: 88 }).toBuffer()).toString('base64')}`;

async function paint(prompt: string, images: string[], aspect: string, out: string) {
  const content = [
    { type: 'text', text: prompt },
    ...(await Promise.all(
      images.map(async (f) => ({ type: 'image_url', image_url: { url: await asJpeg(f) } })),
    )),
  ];
  const t0 = Date.now();
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL,
      modalities: ['image', 'text'],
      messages: [{ role: 'user', content }],
      image_config: { aspect_ratio: aspect },
    }),
  });
  const json = (await res.json()) as {
    choices?: { message?: { images?: { image_url?: { url?: string } }[] } }[];
    usage?: { cost_details?: { upstream_inference_cost?: number } };
    error?: { message?: string };
  };
  if (!res.ok) throw new Error(`OpenRouter ${res.status}: ${json.error?.message ?? 'no message'}`);
  const url = json.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!url) throw new Error('the model sent no image');
  const buf = Buffer.from(url.split(',')[1]!, 'base64');
  await sharp(buf).png().toFile(out);
  const meta = await sharp(buf).metadata();
  const cost = json.usage?.cost_details?.upstream_inference_cost;
  console.log(
    `wrote ${out} (${meta.width}x${meta.height}) in ${((Date.now() - t0) / 1000).toFixed(0)} s${cost ? `, $${cost.toFixed(2)}` : ''}`,
  );
}

const [mode, region, a, ...rest] = process.argv.slice(2);
if (mode === 'region' && region && a) {
  const take = rest.includes('--take') ? rest[rest.indexOf('--take') + 1]! : 'A';
  const style = rest.includes('--style')
    ? rest[rest.indexOf('--style') + 1]!
    : paintingPng(region);
  // Neighbours' finished paintings, so the borders match: --with <painting.png>, as many as there are.
  const neighbours = rest.flatMap((v, i) => (rest[i - 1] === '--with' ? [v] : []));
  const guide = JSON.parse(readFileSync(guideJson(region), 'utf8')) as {
    W: number;
    H: number;
  };
  const portrait = guide.H > guide.W;
  const prompt =
    regionPrompt(take).replace('portrait 2:3', portrait ? 'portrait 2:3' : 'landscape 3:2') +
    (neighbours.length
      ? `\n\nThe last ${neighbours.length === 1 ? 'attached image is the painting' : `${neighbours.length} attached images are the paintings`} of the land next door, which the guide shows round its edges. Paint those parts to match, and carry their light, palette, scale and detail on across the borders without a seam.`
      : '');
  await paint(
    prompt,
    [guidePng(region), style, ...neighbours],
    portrait ? '2:3' : '3:2',
    a,
  );
} else if (mode === 'tile' && region && a) {
  // --note "<text>" adds a line to the prompt for this tile (a place GPT got wrong, A5.1's Stone
  // Eyes); --ref <png> stands in for the reference (one with the wrong thing painted out).
  const flag = (f: string) => (rest.includes(f) ? rest[rest.indexOf(f) + 1] : undefined);
  const note = flag('--note');
  const dir = workDir(region);
  const out =
    rest.find((v, i) => !v.startsWith('--') && !rest[i - 1]?.startsWith('--')) ??
    `${dir}/tile-${a}.png`;
  await paint(
    note ? `${TILE_PROMPT}\n\n${note}` : TILE_PROMPT,
    [flag('--ref') ?? `${dir}/tile-${a}-ref.png`, `${dir}/tile-${a}-guide.png`, 'art/concepts/map-1.webp'],
    '3:2',
    out,
  );
} else {
  throw new Error(
    'usage: map-paint.ts region <region> <out.png> [--take D] [--style <png>] [--with <png>...] | tile <region> <tile> [<out.png>] [--note <text>] [--ref <png>]',
  );
}

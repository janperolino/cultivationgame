// The land's paintings for going in where no place has one (after P3.9b, Jan's idea: take B's
// go-in screen paints where you stand, so the wilds get several paintings a terrain, picked by the
// spot). This holds each region's terrains, how many paintings each and what each shows, and writes
// two things from them:
//   npx tsx tools/land-request.ts manifest          adds the paintings to art/manifest.json, waiting
//   npx tsx tools/land-request.ts request <terrain> writes the terrain's job into Jan's cross-agent
//                                                   folder (its README holds the protocol)
// After the painter is done, copy outputs/*.png into art/inbox/ and run `npm run art`; the game
// picks them up by their folder (ui/landArt.ts). Drafted for Jan's review (docs/review-queue.md).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const COMMS = process.env.CROSS_AGENT_COMMS ?? 'C:/Users/janpe/CMPTProjects/cross-agent comms';

interface Terrain {
  name: string;
  /** The land as it is here, for every painting of it. */
  land: string;
  /** One line a painting: its subject, its light. */
  scenes: readonly string[];
}

interface Region {
  id: string;
  name: string;
  /** The region as a whole, for every painting in it. */
  look: string;
  terrains: Readonly<Record<string, Terrain>>;
}

const BORDER_WILDS: Region = {
  id: 'qm-bianhuang',
  name: 'the Border Wilds',
  look: "The Border Wilds: sixty thousand li of wild karst hills on a continent's southwest coast, kingdoms that are islands of farmland in a sea of stone, beasts holding the rest; across a strait lies beast country, and at low tide an island chain is a road both ways. Raids have tripled in five years. A frontier: old, wild, a little dangerous, rich with spirit herbs and hidden caves.",
  terrains: {
    karst: {
      name: 'Karst',
      land: 'limestone karst: stone towers and needles hundreds of zhang tall, sinkholes, caves, slot gorges, ferns and twisted pines clinging to grey rock, mist in the hollows',
      scenes: [
        'Limestone towers rising out of morning mist as far as the eye goes, a goat track winding between their feet. Pale dawn.',
        "A sinkhole's mouth as wide as a valley, ferns and vines hanging over its lip, its floor lost in dark. Overcast noon.",
        "A cave under a great overhang, its ceiling blackened by old fires, a raider's cold camp of stones and bones. Late afternoon light slanting in.",
        'A green river running out of a cave mouth into a gorge between towers. Rain.',
        'A forest of stone needles under a full moon, silver light on wet rock, deep shadow between.',
        'A collapsed valley floor of fallen rock between pillars, a smugglers’ cairn of stacked stones marking the way. Noon haze.',
        'From a high saddle between two peaks, a sea of karst towers to the horizon. A red sunset.',
        'A slot gorge so narrow the sky is a thread, water ankle-deep over pale stone. Dim blue light.',
      ],
    },
    marsh: {
      name: 'Marsh',
      land: 'black-water marsh between karst knolls: reed beds taller than a man, drowned trees, plank causeways, lotus and duckweed, fog',
      scenes: [
        'Reed beds taller than a man under thick fog, a narrow channel of black water through them. Grey morning.',
        'A plank causeway on stilts crossing black water of no depth you can see. Dusk.',
        'A drowned grove of dead trees standing in still water, their reflections perfect. Overcast.',
        "An abandoned fisher's stilt hut leaning over the water, its nets rotted. Low evening sun.",
        'Pale marsh-lights drifting over black water at night, karst knolls dark behind.',
      ],
    },
    hills: {
      name: 'Hills',
      land: 'folded green hill country between the karst, terraced fields in the valleys, beacon towers on the ridgelines, pine and bamboo on the slopes',
      scenes: [
        'Terraced slopes of ripening millet stepping down a valley, mist pooled in its floor. Dawn.',
        'A grassy crest with a stone beacon tower far off on the next ridge, its fire lit. Dusk.',
        "A woodcutter's bark shelter on a steep slope of pines. Rain.",
        'A hill road climbing to a pass with a small roadside shrine and a stone lion. Clear noon.',
        'Folded hills under a starry night, a single farm lamp in a valley.',
      ],
    },
    forest: {
      name: 'Forest',
      land: 'old forest in the karst valleys: camphor and pine giants, moss, deep undergrowth, ravines and fallen trunks, shafts of light',
      scenes: [
        'An old pine with low spreading branches in a clearing, shafts of light through the canopy. Morning.',
        'A ravine choked with deep undergrowth and ferns, dark and close. Dim green light.',
        'A fallen trunk bridging a deep gully, moss thick on it. Afternoon.',
        'Camphor giants hung with moss in rain, the trunks wider than houses.',
        'A clearing burned black by something that breathes fire, the trees around it scorched. Smoky dusk.',
      ],
    },
    coast: {
      name: 'Coast',
      land: 'a rocky sea coast: shingle banks, reefs, sea cliffs, tide pools, fishing villages far off, salt haze, the strait beyond',
      scenes: [
        'A shingle bank and the tide line, surf breaking on reefs offshore. Windy grey morning.',
        "Fishers' drying racks with nets and split fish on a pebble beach, boats drawn up. Evening.",
        'Sea cliffs with surf exploding at their feet, seabirds wheeling. Storm light.',
        'At low tide, a chain of islands stepping off toward the horizon across wet sand and reef. Golden afternoon.',
        'A wrecked junk on a reef at dusk, its sails in tatters.',
      ],
    },
    plains: {
      name: 'Plains',
      land: 'a kingdom’s farmland on the flat between karst: millet and rice, cart tracks, lone trees, villages far off',
      scenes: [
        'A lone camphor tree in a field of tall millet, a cart track beside it. Summer noon.',
        'Flooded rice paddies mirroring the sky, karst towers on the horizon. Dawn.',
        'A farmstead burned after a beast raid, smoke still rising, its fields trampled. Overcast.',
        'Open grassland under a coming storm, the grass flattened by the wind.',
        'A village’s threshing floor and haystacks under harvest moonlight.',
      ],
    },
    sea: {
      name: 'Sea',
      land: 'the Jade Strait and the island chain: green water, sea stacks, reefs and small islands, the far shore beast country',
      scenes: [
        'Green strait water seen from a low reef, sea stacks rising out of it. Bright morning.',
        'A small island in the chain with a tidal causeway of wet stone. Afternoon.',
        'Sea stacks in fog, waves breaking on their feet.',
        'The night sea glowing with green light in the wake of something unseen, stars above.',
        'The strait in a storm, waves high, the far shore a dark line.',
      ],
    },
  },
};

const REGIONS: readonly Region[] = [BORDER_WILDS];

const fileOf = (r: Region, terrain: string, n: number) => `land-${r.id}-${terrain}-${n}`;

/** One painting's prompt: where it sits on the screen, the region, the terrain, its subject. */
function prompt(r: Region, t: Terrain, scene: string): string {
  return [
    `Create ONE landscape 1536x1024 painting AS AN ASSET for a game screen: a place in ${r.name}'s wilds as someone standing there sees it, at eye level or from a little above.`,
    '',
    `THE SCENE: ${scene}`,
    '',
    `THE LAND: ${t.land}.`,
    '',
    `THE REGION: ${r.look}`,
    '',
    'The game shows it on the left of the screen, cropped to a square from the middle: keep the subject in the middle third, sky above and near ground below. A small dark caption box sits over the top-left corner, and small labels over the bottom fifth, so keep both calm.',
    '',
    'Paint the land only: no people close up, no cultivator, no creatures. Rich, painterly, atmospheric; not too bright.',
    '',
    'STYLE: Chinese xianxia cultivation fantasy, as in Chinese cultivation games and donghua, painted with rich detail; never medieval European, never sci-fi. The world is vast, at continental scale: stone towers hundreds of zhang tall, valleys a day across. Rock stays natural rock. NO TEXT, NO LETTERS, NO NUMBERS, NO UI, no signs with writing, no frame, no watermark.',
  ].join('\n');
}

function manifest(): void {
  const path = join('art', 'manifest.json');
  const m = JSON.parse(readFileSync(path, 'utf8')) as { assets: { id: string }[] };
  const ours = new Set<string>();
  for (const r of REGIONS) {
    for (const [id, t] of Object.entries(r.terrains)) {
      t.scenes.forEach((scene, i) => {
        const asset = {
          id: fileOf(r, id, i + 1),
          kind: 'scene',
          out: `src/ui/art/land/${r.id}/${id}/${i + 1}.webp`,
          width: 1280,
          quality: 74,
          budgetKB: 220,
          prompt: prompt(r, t, scene),
          trickle: true,
        };
        ours.add(asset.id);
        const at = m.assets.findIndex((a) => a.id === asset.id);
        if (at >= 0) m.assets[at] = asset;
        else m.assets.push(asset);
      });
    }
  }
  writeFileSync(path, `${JSON.stringify(m, null, 2)}\n`);
  console.log(`${ours.size} land paintings in the manifest, waiting to be painted.`);
}

function request(terrain: string): void {
  const r = REGIONS.find((x) => x.terrains[terrain]);
  const t = r?.terrains[terrain];
  if (!r || !t) throw new Error(`No terrain ${terrain}`);
  const job = join(
    COMMS,
    'land',
    `${r.name.replace(/^the /, '').replace(/^./, (c) => c.toUpperCase())} ${t.name}`,
  );
  mkdirSync(join(job, 'outputs'), { recursive: true });
  const files = t.scenes.map((_, i) => `${fileOf(r, terrain, i + 1)}.png`);
  writeFileSync(
    join(job, 'request.md'),
    [
      `# Request: ${t.name} in ${r.name}, ${t.scenes.length} paintings for going in`,
      '',
      'From: Claude (the P3.9b session of Severed Heaven). Jan gives the go-ahead.',
      '',
      `**Make ${t.scenes.length} images**, one per prompt below, in order, in one conversation, so they share one look: the same land, painted the same way, at different spots and in different light.`,
      '',
      '- Each image is **1536×1024, landscape**.',
      '- **No text, letters or numbers** anywhere in any image.',
      '- Save each image as a PNG in `outputs/` under exactly these names:',
      ...files.map((f, i) => `  ${i + 1}. \`${f}\``),
      '- When all are saved, write `done.md` here: the files made, and anything that went wrong or that you changed.',
      '',
      'Don’t edit anything else in this folder or anywhere else.',
      '',
      '---',
      '',
      ...t.scenes.flatMap((scene, i) => [
        `## ${i + 1}. \`${files[i]}\``,
        '',
        '```text',
        prompt(r, t, scene),
        '```',
        '',
      ]),
    ].join('\n'),
  );
  console.log(`Wrote ${join(job, 'request.md')}`);
}

const [what, arg] = process.argv.slice(2);
if (what === 'manifest') manifest();
else if (what === 'request' && arg) request(arg);
else if (what === 'request-all')
  for (const r of REGIONS) for (const t of Object.keys(r.terrains)) request(t);
else console.log('npx tsx tools/land-request.ts manifest | request <terrain> | request-all');

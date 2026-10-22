// The cue table (S1, docs/art-pipeline.md § Sound): every sound the game plays, by id, with the
// moment it plays on and where to find it. The sound layer reads the ids and kinds; the tools read
// the rest (`npm run sound:find` lays Kenney's recorded packs out as candidates by their file names,
// and the picker shows `plays` and `listen` with search links to Pixabay and Freesound's site for
// what Jan finds by hand; never Freesound's API, which is non-commercial). A cue with no file
// shipped plays nothing, so a cue can stand here before its sound is found. S1.1, Jan's calls: real
// recorded sounds (bronze, wood, cloth, breath, strings), never synth blips, so Kenney's Interface
// Sounds and UI Audio packs are off the list.
import type { DamageType, OutcomeForm } from '../../content/combat.ts';

/** A loop is an effect held while something lasts (qi flowing, a breakthrough's charge). */
export type SoundKind = 'effect' | 'loop' | 'ambience' | 'music';

/** When an effect is loaded: at the start, with the crafts, or when a fight starts. */
export type EffectGroup = 'ui' | 'craft' | 'combat';

export interface CueInfo {
  id: string;
  kind: SoundKind;
  /** What it plays on, in words, for the cue list and the picker. */
  plays: string;
  /** Search terms for Pixabay's and Freesound's sites, best first. */
  search: readonly string[];
  /** Kenney pack file names that fit, as the start of the name (`impactBell_heavy`). */
  kenney?: readonly string[];
  /** Pixabay Music search terms, for a track picked by hand. */
  pixabay?: string;
  /** The brief a track is picked to: the cave's three takes from S1's talk. */
  brief?: string;
  /** What to listen for, for the picker: S1.1's direction for the effect. */
  listen?: string;
  group?: EffectGroup;
  /** Low-priority effects (a click, a tab, a toast) stay quiet when another effect just played. */
  minor?: boolean;
}

type Effect<I extends string> = CueInfo & { id: I; kind: 'effect' };

const fx = <I extends string>(
  id: I,
  plays: string,
  search: readonly string[],
  kenney: readonly string[] = [],
  more: Partial<CueInfo> = {},
): Effect<I> => ({ plays, search, kenney, group: 'ui', ...more, id, kind: 'effect' });

const hit = <I extends string>(
  id: I,
  plays: string,
  search: readonly string[],
  kenney?: readonly string[],
  more: Partial<CueInfo> = {},
) => fx(id, plays, search, kenney, { group: 'combat', ...more });

/** S1.1, Jan's pick for a blow: a short whoosh, then a deep boom with a little ring. */
const THUD = 'A short whoosh, then a deep cinematic boom with a little ring: qi behind the blow.';

export const CUES = [
  // ---------------------------------------------------------------- menu and navigation
  fx('ui-click', 'Any button', ['wood tap soft', 'wooden click'], [], {
    minor: true,
    listen: 'A soft knock of wood, short and dry; heard a hundred times an hour.',
  }),
  fx('ui-tab', 'A tab or a rail glyph', ['paper flip soft', 'page flick'], [], {
    minor: true,
    listen: 'A flick of paper or silk, lighter than the click.',
  }),
  fx('ui-toast', 'A toast', ['small bell ding soft', 'tingsha'], [], {
    minor: true,
    listen: 'One small bell, soft, a little ring after it.',
  }),
  fx(
    'ui-open',
    'The square opening',
    ['cloth whoosh soft', 'scroll unroll paper'],
    ['bookOpen', 'cloth'],
    { listen: 'Silk or a scroll unrolling: a soft whoosh with grain in it.' },
  ),
  fx('ui-close', 'The square closing', ['paper fold soft', 'cloth whoosh short'], ['bookClose'], {
    listen: 'The same cloth or paper, shorter, folding away.',
  }),

  // ---------------------------------------------------------------- feel
  fx('feel-gain', 'A gain by the figure (F1)', ['wind chime single', 'crystal chime'], [], {
    listen: 'A small chime, jade or glass, bright but never a beep.',
  }),
  fx(
    'feel-loss',
    'A loss by the figure (F1)',
    ['wood knock low', 'muted thud'],
    ['impactWood_light'],
    { listen: 'A low, muted knock of wood.' },
  ),
  fx('feel-arrive', 'A card arriving', ['paper slide', 'letter paper'], ['bookPlace'], {
    listen: 'Paper sliding onto a table.',
  }),
  fx(
    'feel-alert',
    'An encounter stopping your road while you are off the World screen',
    ['temple bell single hit', 'small gong hit'],
    ['impactBell_heavy'],
    { listen: 'A temple bell struck once, a call to look.' },
  ),
  fx('feel-pass', 'An encounter ahead you can go round', ['wind chime gentle', 'chimes soft'], [], {
    listen: 'Wind chimes stirring, gentle, passing.',
  }),
  fx(
    'feel-sheathe',
    'An encounter or a fight over',
    ['sword sheath', 'sword sheathe slide'],
    ['drawKnife', 'metalLatch'],
  ),

  // ---------------------------------------------------------------- qi and the breakthrough
  fx('feel-orb', 'An orb drawn into the figure', ['soft breath whoosh', 'magic absorb soft'], [], {
    listen: 'A soft in-breath, airy, with a faint shimmer; qi coming in.',
  }),
  {
    id: 'feel-qi-hum',
    kind: 'loop',
    plays: 'Under Cultivate while qi flows, swelling as the bar fills',
    search: ['meditation drone hum', 'singing bowl drone loop'],
    listen: 'A faint low hum that loops without a seam, like a bowl still ringing.',
  },
  fx(
    'feel-settle',
    'A ladder full, ready for the gate',
    ['singing bowl short', 'low hum swell'],
    ['impactBell'],
    { listen: 'A singing bowl touched once: full, waiting.' },
  ),
  fx(
    'feel-warn',
    "The breakthrough's warning, 3 s before (F1)",
    ['wind rising', 'rumble swell'],
    [],
    {
      listen: 'Wind gathering, low; something is coming.',
    },
  ),
  {
    id: 'feel-charge',
    kind: 'loop',
    plays: "The breakthrough's charge, qi building through the scene",
    search: ['rising drone swell', 'energy riser'],
    listen: 'A low drone that can loop; the game raises it and its pitch as the race runs.',
  },
  fx(
    'feel-gate',
    'A gate caught in the scene, a step higher each',
    ['guzheng single note', 'zither pluck'],
    [],
    {
      listen: 'One plucked guzheng note, clean; the game pitches it up the five-note scale.',
    },
  ),
  fx('feel-layer', 'A layer up in Qi Condensation', ['small gong swell', 'gong soft'], [], {
    listen:
      "Jan's pick: a gong swell, smaller; wind rushing in, then a gong that blooms and fades.",
  }),
  fx('feel-stage', 'A stage up past Qi Condensation', ['gong swell', 'temple gong'], [], {
    listen: "Jan's pick: a gong swell; wind rushing in, then a temple gong that blooms and fades.",
  }),
  fx('feel-fanfare', 'Through a great gate (F1)', ['gong crash', 'large gong swell'], [], {
    listen: 'The biggest gong of all, a crash that blooms long; the sting plays over it.',
  }),
  fx(
    'feel-fail',
    'A failed breakthrough',
    ['glass crack low', 'thunder short dull'],
    ['impactGlass_heavy'],
  ),

  // ---------------------------------------------------------------- quests
  fx(
    'quest-step',
    "A quest's step done, the origin's chain too",
    ['small bell ting', 'bell tap'],
    [],
    {
      listen: 'One small bell, a ting; quieter than the toast.',
    },
  ),
  fx('quest-done', 'A quest handed in', ['guqin', 'chinese harp short'], [], {
    listen: 'A short guqin phrase, three notes or so, over a soft bell.',
  }),

  // ---------------------------------------------------------------- things
  fx('shop-buy', 'Buying', ['coin pouch', 'coins handful'], ['handleCoins']),
  fx('shop-sell', 'Selling', ['coins drop table', 'coins counting'], ['handleCoins']),
  fx(
    'bag-equip',
    'Putting gear on or off',
    ['cloth armor equip', 'sword draw'],
    ['cloth', 'clothBelt', 'beltHandle'],
  ),
  fx(
    'bag-stones',
    'Feeding stones, changing money',
    ['stones clack', 'pebbles hand'],
    ['impactMining', 'impactGeneric_light'],
  ),
  fx('book-page', 'A copy read, a page turned', ['book page turn'], ['bookFlip']),
  fx(
    'book-graft',
    'A manual grafted onto a tree',
    ['seal stamp', 'wood stamp thud'],
    ['bookPlace', 'impactWood_medium'],
  ),
  fx('tree-node', 'Buying a node', ['jade click resonant', 'crystal tap'], ['impactGlass_light']),
  fx('craft-furnace', 'The furnace lit', ['fire whoosh ignite', 'furnace roar short'], [], {
    group: 'craft',
  }),
  fx(
    'craft-pill',
    'A pill out of the furnace',
    ['lid pop', 'cork pop bottle'],
    ['metalPot', 'metalClick'],
    { group: 'craft' },
  ),
  fx('craft-quench', "The forge's quench", ['hot metal quench water sizzle'], [], {
    group: 'craft',
  }),
  fx(
    'craft-hammer',
    "The forge's strike",
    ['anvil hammer hit'],
    ['impactMetal_heavy', 'impactPlate_heavy'],
    { group: 'craft' },
  ),
  fx('craft-brush', 'A talisman stroke', ['brush stroke paper', 'calligraphy brush'], [], {
    group: 'craft',
  }),
  fx(
    'craft-talisman',
    'A talisman used or finished',
    ['paper burst fire whoosh', 'paper tear quick'],
    [],
    { group: 'craft' },
  ),
  fx(
    'map-depart',
    'Setting off on a course',
    ['footsteps gravel start', 'horse whinny short'],
    ['footstep_grass', 'footstep_concrete'],
  ),

  // ---------------------------------------------------------------- combat: the forms
  hit(
    'hit-slash',
    'A slash lands',
    ['sword whoosh hit', 'sword slash impact'],
    ['knifeSlice', 'chop'],
    {
      listen: THUD,
    },
  ),
  hit('hit-thrust', 'A thrust lands', ['spear stab whoosh', 'stab impact'], ['knifeSlice'], {
    listen: THUD,
  }),
  hit('hit-palm', 'A palm lands', ['cinematic punch', 'cinematic hit'], ['impactPunch'], {
    listen: THUD,
  }),
  hit('hit-projectile', 'A projectile lands', ['magic projectile hit', 'arrow impact']),
  hit('hit-aura', 'An aura washes over', ['energy wave whoosh']),
  hit('hit-bite', 'A bite', ['animal bite crunch']),
  hit('hit-claw', 'A claw', ['claw scratch slash']),
  hit(
    'hit-charge',
    'A charge',
    ['cinematic impact heavy', 'heavy body impact'],
    ['impactSoft_heavy', 'impactPunch_heavy'],
    { listen: THUD },
  ),
  hit('hit-tail', 'A tail', ['whip lash heavy']),
  hit('hit-breath', 'A breath', ['monster breath roar']),
  hit(
    'act-defend',
    'A guard held',
    ['shield block metal'],
    ['impactMetal_heavy', 'impactPlate_heavy'],
  ),
  hit('act-flee', 'Fleeing', ['running footsteps whoosh'], ['footstep_grass']),
  hit('act-talk', 'Talking, a command', ['low murmur short']),
  // ---------------------------------------------------------------- combat: the elements' tails
  hit('el-metal', 'Metal, over the form', ['metal ring'], ['impactMetal_light']),
  hit('el-wood', 'Wood, over the form', ['wood crack branch'], ['impactWood_heavy']),
  hit('el-water', 'Water, over the form', ['water splash']),
  hit('el-fire', 'Fire, over the form', ['fire burst']),
  hit('el-earth', 'Earth, over the form', ['rock crumble'], ['impactMining']),
  hit('el-lightning', 'Lightning, over the form', ['electric zap']),
  hit('el-wind', 'Wind, over the form', ['wind gust short']),
  hit('el-ice', 'Ice, over the form', ['ice crack'], ['impactGlass_medium']),
  hit('el-soul', 'Soul, over the form', ['ghostly whisper whoosh']),
  hit('el-poison', 'Poison, over the form', ['acid sizzle']),
  // ---------------------------------------------------------------- combat: the results
  hit('res-critical', 'A critical', ['impact boom heavy']),
  hit('res-miss', 'A miss', ['whoosh miss air']),
  hit('res-backfire', 'A backfire', ['magic fizzle crack']),
  hit('res-quake', 'Under every blow from Core Formation up', ['earthquake rumble short']),

  // ---------------------------------------------------------------- ambience
  {
    id: 'amb-cave',
    kind: 'ambience',
    plays: 'Cultivate, Routine, Crafts and the Dwelling',
    search: ['cave ambience drips', 'cave wind loop'],
  },
  {
    id: 'amb-wilds',
    kind: 'ambience',
    plays: 'The World, the wild places',
    search: ['forest wind birds ambience', 'mountain wind loop'],
  },
  {
    id: 'amb-market',
    kind: 'ambience',
    plays: 'The World at a town or a city',
    search: ['market crowd ambience', 'bazaar ambience'],
  },
  {
    id: 'amb-sect',
    kind: 'ambience',
    plays: 'The World at a sect or a gated hall',
    search: ['temple bell distant ambience', 'monastery bells wind'],
  },
  {
    id: 'amb-night',
    kind: 'ambience',
    plays: 'After dark, under the cave or the World',
    search: ['night insects crickets loop', 'night crickets ambience'],
  },
  {
    id: 'amb-storm',
    kind: 'ambience',
    plays: 'Over the rest in a storm',
    search: ['thunderstorm rain loop distant thunder', 'rain storm ambience'],
  },
  {
    id: 'amb-tense',
    kind: 'ambience',
    plays: 'While an encounter waits or a fight runs, in place of the rest',
    search: ['tense drone low ambience', 'dark drone suspense'],
  },

  // ---------------------------------------------------------------- music
  {
    id: 'music-cave-1',
    kind: 'music',
    plays: 'The cave: Still Water',
    search: [],
    pixabay: 'guqin meditation',
    brief: 'Solo guqin with a sparse xiao, slow, long silences, cave reverb, no percussion.',
  },
  {
    id: 'music-cave-2',
    kind: 'music',
    plays: 'The cave: Mist over the Seat',
    search: [],
    pixabay: 'guzheng erhu ambient',
    brief:
      'Gentle guzheng arpeggios over a low erhu, a soft dizi later, warm and hopeful, no drums.',
  },
  {
    id: 'music-cave-3',
    kind: 'music',
    plays: 'The cave: The Deep Vein',
    search: [],
    pixabay: 'chinese dark ambient',
    brief: 'A low drone, slow pipa harmonics, breathy xiao, a faint choir, vast and mysterious.',
  },
  {
    id: 'music-map-1',
    kind: 'music',
    plays: 'The travel map and its places',
    search: [],
    pixabay: 'chinese journey dizi',
    brief: 'A dizi lead, erhu, a light frame drum, a journey across vast lands.',
  },
  {
    id: 'music-map-2',
    kind: 'music',
    plays: 'The travel map and its places',
    search: [],
    pixabay: 'guqin',
    brief: 'A journey across vast lands, in Chinese instruments.',
  },
  {
    id: 'music-map-3',
    kind: 'music',
    plays: 'The travel map and its places',
    search: [],
    pixabay: 'guzheng cinematic',
    brief: 'A journey across vast lands, in Chinese instruments.',
  },
  {
    id: 'music-combat',
    kind: 'music',
    plays: 'A fight',
    search: [],
    pixabay: 'chinese battle drums',
    brief: 'Taiko-like drums, a fast pipa, an urgent erhu, a fight between cultivators.',
  },
  {
    id: 'music-sting',
    kind: 'music',
    plays: 'Through a great gate, over the music ducked',
    search: [],
    pixabay: 'chinese epic gong',
    brief: 'About 12 s: a gong swell, a guzheng glissando, a rising choir, a held resolve.',
  },
] as const satisfies readonly CueInfo[];

export type CueId = (typeof CUES)[number]['id'];
export type EffectId = Extract<(typeof CUES)[number], { kind: 'effect' }>['id'];
export type AmbienceId = Extract<(typeof CUES)[number], { kind: 'ambience' }>['id'];
export type MusicId = Extract<(typeof CUES)[number], { kind: 'music' }>['id'];
export type LoopId = Extract<(typeof CUES)[number], { kind: 'loop' }>['id'];

const byId = new Map<string, CueInfo>(CUES.map((c) => [c.id, c]));

export function cueInfo(id: string): CueInfo | undefined {
  return byId.get(id);
}

/** The music each place in the soundscape rotates through. */
export const MUSIC_SETS = {
  cave: ['music-cave-1', 'music-cave-2', 'music-cave-3'],
  map: ['music-map-1', 'music-map-2', 'music-map-3'],
  fight: ['music-combat'],
} as const satisfies Record<string, readonly MusicId[]>;

export type MusicSet = keyof typeof MUSIC_SETS;

/** A form's sound: the attacks' own, and the actions that share one. */
export const FORM_CUE: Record<OutcomeForm, EffectId | null> = {
  slash: 'hit-slash',
  thrust: 'hit-thrust',
  palm: 'hit-palm',
  projectile: 'hit-projectile',
  aura: 'hit-aura',
  bite: 'hit-bite',
  claw: 'hit-claw',
  charge: 'hit-charge',
  tail: 'hit-tail',
  breath: 'hit-breath',
  defend: 'act-defend',
  flee: 'act-flee',
  talk: 'act-talk',
  command: 'act-talk',
  item: 'ui-open',
};

/** An element's tail over the form; physical has none. */
export const ELEMENT_CUE: Record<DamageType, EffectId | null> = {
  physical: null,
  metal: 'el-metal',
  wood: 'el-wood',
  water: 'el-water',
  fire: 'el-fire',
  earth: 'el-earth',
  lightning: 'el-lightning',
  wind: 'el-wind',
  ice: 'el-ice',
  soul: 'el-soul',
  poison: 'el-poison',
};

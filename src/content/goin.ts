// Going in, the road (design § The world, Going in: doors and frames, Escape and death, A trip;
// § The resolver, Scenes and time; P3.9's talk with Jan, 2026-10-22). The numbers a scene you go
// into reads, and the land Go in here stands on: three features a terrain, drafted for Jan's
// review, beside a site's own from the atlas.
import type { ActId } from './resolver.ts';

/** The turns a scene keeps for the screen; the last six of them go to GLM (ai/context.ts). */
export const GOIN_TURNS_KEPT = 20;

/**
 * How long the narrator tells each moment, in words (design § The resolver, Narration): going in,
 * going in where nobody is (a find, an omen, open ground), a turn with something at stake, a plain
 * turn, a fight's end told once, and the words more for an arrival, the law or a cover blown.
 */
export const GOIN_LENGTHS = {
  opening: [80, 150],
  quiet: [50, 90],
  stake: [50, 120],
  plain: [40, 100],
  fight: [60, 120],
} as const;
export type GoInLength = keyof typeof GOIN_LENGTHS;
export const ARRIVAL_WORDS = 30;

/** Acts that spend something of yours: a plan holding one is at stake, and waits for Do it. */
export const COST_ACTS: readonly ActId[] = [
  'buy',
  'sell',
  'pay',
  'gift',
  'bribe',
  'ransom',
  'deliver',
  'slip',
  'recruit',
  'item',
];

/** Acts realm pressure refuses while you are pinned: you can only talk, beg or burn a talisman. */
export const PINNED_REFUSES: readonly ActId[] = [
  'flee',
  'leave',
  'go-home',
  'sneak',
  'hide',
  'follow',
  'attack',
  'ambush',
  'duel',
  'spar',
  'seize',
  'rob',
  'steal',
];

/** Fallen and robbed, you are left for dead: this much off your lines for this many days. */
export const LEFT_FOR_DEAD = { share: 0.5, days: 20 } as const;

/** Reaching home after this many days out brings the road home's card (design § The world, A trip). */
export const ROAD_HOME_DAYS = 3;

/** People who drift into Go in here's scene, drawn from the road's own encounters where you stand. */
export const HERE_ARRIVALS = 3;

export interface LandFeature {
  name: string;
  tags: readonly string[];
}

/**
 * What open ground holds, by terrain: three features each, the tags the resolver reads (cover and
 * dark favor stealth, height perception). Drafted for Jan's review.
 */
export const TERRAIN_FEATURES: Readonly<Record<string, readonly LandFeature[]>> = {
  plains: [
    { name: 'a lone camphor tree', tags: ['height', 'cover'] },
    { name: 'tall millet on the field edge', tags: ['cover', 'burnable'] },
    { name: 'a cart track rutted to the axle', tags: ['narrow'] },
  ],
  steppe: [
    { name: 'a cairn of herders’ stones', tags: ['height', 'fragile'] },
    { name: 'feather grass to the knee', tags: ['cover', 'burnable'] },
    { name: 'a dry wash', tags: ['cover', 'fall'] },
  ],
  coast: [
    { name: 'a shingle bank', tags: ['height'] },
    { name: 'the tide line', tags: ['water', 'crossing'] },
    { name: 'a fisher’s drying rack', tags: ['burnable', 'fragile'] },
  ],
  desert: [
    { name: 'a dune crest', tags: ['height', 'fall'] },
    { name: 'a wind-cut rock', tags: ['cover'] },
    { name: 'a sand-choked well', tags: ['water', 'fall'] },
  ],
  plateau: [
    { name: 'the plateau’s lip', tags: ['height', 'fall'] },
    { name: 'thornbrush', tags: ['cover', 'burnable'] },
    { name: 'a cold spring', tags: ['water'] },
  ],
  hills: [
    { name: 'the crest of the hill', tags: ['height'] },
    { name: 'a terraced slope', tags: ['cover', 'fall'] },
    { name: 'a woodcutter’s shelter', tags: ['cover', 'burnable', 'fragile'] },
  ],
  tundra: [
    { name: 'a frost heave', tags: ['height'] },
    { name: 'a frozen meltwater pool', tags: ['water', 'fragile'] },
    { name: 'lichen-black boulders', tags: ['cover'] },
  ],
  canyon: [
    { name: 'the canyon wall', tags: ['height', 'fall'] },
    { name: 'a slot between the rocks', tags: ['cover', 'narrow', 'dark'] },
    { name: 'the stream at the bottom', tags: ['water', 'crossing'] },
  ],
  forest: [
    { name: 'an old pine with low branches', tags: ['height', 'cover'] },
    { name: 'deep undergrowth', tags: ['cover', 'dark', 'burnable'] },
    { name: 'a fallen trunk over a gully', tags: ['crossing', 'narrow', 'fall'] },
  ],
  volcanic: [
    { name: 'a vent breathing sulphur', tags: ['fire'] },
    { name: 'a ridge of black glass', tags: ['height', 'fragile'] },
    { name: 'an ash drift', tags: ['cover'] },
  ],
  karst: [
    { name: 'a limestone pillar', tags: ['height', 'fall'] },
    { name: 'a sinkhole’s mouth', tags: ['fall', 'dark'] },
    { name: 'a cave under the overhang', tags: ['cover', 'dark'] },
  ],
  marsh: [
    { name: 'reed beds over the head', tags: ['cover', 'burnable'] },
    { name: 'black water of no depth you can see', tags: ['water', 'fall'] },
    { name: 'a plank causeway', tags: ['crossing', 'narrow', 'fragile'] },
  ],
  jungle: [
    { name: 'a strangler fig', tags: ['height', 'cover'] },
    { name: 'a curtain of vines', tags: ['cover', 'dark'] },
    { name: 'a brown river', tags: ['water', 'crossing'] },
  ],
  ice: [
    { name: 'a pressure ridge', tags: ['height', 'cover'] },
    { name: 'thin ice over black water', tags: ['water', 'fragile', 'fall'] },
    { name: 'a snow drift', tags: ['cover'] },
  ],
  islands: [
    { name: 'a sea stack', tags: ['height', 'fall'] },
    { name: 'a cove', tags: ['cover', 'water'] },
    { name: 'driftwood piled above the tide', tags: ['burnable', 'cover'] },
  ],
  twilight: [
    { name: 'a standing stone that casts two shadows', tags: ['height'] },
    { name: 'grey grass that never moves', tags: ['cover', 'dark'] },
    { name: 'a still pool that shows no sky', tags: ['water'] },
  ],
  mountains: [
    { name: 'a ledge over the drop', tags: ['height', 'fall'] },
    { name: 'a scree slope', tags: ['fall', 'fragile'] },
    { name: 'a cleft out of the wind', tags: ['cover', 'narrow'] },
  ],
  sea: [
    { name: 'the swell', tags: ['water'] },
    { name: 'a reef under the surface', tags: ['water', 'fall'] },
    { name: 'a spar of wreckage', tags: ['crossing', 'fragile'] },
  ],
};

/**
 * Crafters are respected (Jan, K1's talk; P3.9b): your best craft's grade adds a tenth a grade to a
 * talk's leverage, up to three tenths, and two a grade to a first impression, up to six.
 */
export const CRAFT_RESPECT = { perGrade: 0.1, max: 0.3, firstLook: 2, firstLookMax: 6 } as const;

/** The target of an enter that names a spot the scene doesn't list: the engine makes it from `as`. */
export const NEW_SPOT = 'frame:new';

/** Lines of talk to a tick: an exchange of talk is a tick, not a tick a line (talk first). */
export const TALK_PER_TICK = 3;

/** The target of an act aimed at someone in the crowd the scene doesn't list: made from `who`. */
export const NEW_FACE = 'face:new';

/**
 * Noise heard across the whole place (design § Moving): a Qi Condensation brawl stays on its street,
 * a Foundation fight is heard across a town, a Nascent Soul one across a city. The li a noise must
 * carry to fill the place, by where it stands.
 */
export const PLACE_LI = { village: 1, town: 5, seat: 25, city: 120, wilds: 1 } as const;

/**
 * A body found (Jan's call in P3.9b's talk): hidden, by the stealth it was hidden with, in days (a
 * week clear, three days close, by the next morning short); left where it fell, by morning where the
 * place keeps a watch. Burned, sunk or fed to beasts, never.
 */
export const BODY_FOUND = { clear: 7, close: 3, short: 0.25 } as const;

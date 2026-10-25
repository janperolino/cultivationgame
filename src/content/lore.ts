// The world book (P3.9w; design § The resolver, What GLM sees, What a person brings to the scene).
// Common knowledge of the world and its systems, by who would know it. The lore and customs half is
// written by hand as data in `content/lore/` (for Jan's review, docs/review-queue.md); the
// mechanics half is generated from the game's own data in core/lore.ts, so it never drifts. Each
// turn every person present gets the entries they'd know that touch the topic at hand: picked by
// who they are and the topic, never by similarity to your words (Jan asked about RAG: it picks by
// your words, not by what they'd know, and leaks).
import customs from '../../content/lore/customs.json';
import borderWilds from '../../content/lore/border-wilds.json';

/**
 * What an entry is about, and the words that bring it up. The interpreter names up to three for a
 * typed turn; your words, the last two turns and the door you stand at add theirs.
 */
export const TOPICS = {
  realms: [
    'realm',
    'realms',
    'layer',
    'cultivation base',
    'qi condensation',
    'foundation establishment',
    'core formation',
    'golden core',
    'nascent soul',
    'how strong',
    'stronger',
  ],
  breakthrough: [
    'breakthrough',
    'break through',
    'bottleneck',
    'establish foundation',
    'form a core',
    'tribulation',
    'heart demon',
  ],
  pills: ['pill', 'pills', 'elixir', 'dan', 'medicine', 'foundation pill', 'qi-gathering'],
  prices: [
    'price',
    'prices',
    'cost',
    'costs',
    'how much',
    'expensive',
    'cheap',
    'worth',
    'sell',
    'buy',
  ],
  money: [
    'stone',
    'stones',
    'spirit stone',
    'silver',
    'taels',
    'coin',
    'money',
    'pay',
    'wage',
    'wages',
    'debt',
    'loan',
  ],
  powers: [
    'sect',
    'sects',
    'clan',
    'clans',
    'guild',
    'gate',
    'pavilion',
    'temple',
    'society',
    'school',
    'join',
    'recruit',
    'disciple',
  ],
  seats: [
    'senior',
    'junior',
    'elder',
    'outer disciple',
    'inner disciple',
    'true disciple',
    'rank',
    'seat',
    'master',
    'patriarch',
    'sect master',
  ],
  respect: [
    'respect',
    'bow',
    'kneel',
    'rude',
    'insult',
    'offend',
    'manners',
    'senior',
    'immortal',
    'kill',
    'face',
  ],
  board: [
    'bounty',
    'bounties',
    'board',
    'posting',
    'postings',
    'mission',
    'missions',
    'job',
    'work',
    'hire',
  ],
  contribution: ['contribution', 'allowance', 'monthly', 'stipend', 'quota', 'merit'],
  crafts: [
    'alchemy',
    'alchemist',
    'refining',
    'refiner',
    'talisman',
    'talismans',
    'array',
    'arrays',
    'formation',
    'furnace',
    'craft',
    'grade',
  ],
  beasts: [
    'beast',
    'beasts',
    'core',
    'cores',
    'tide',
    'monster',
    'wolf',
    'python',
    'jiao',
    'ape',
    'hunt',
    'hunter',
  ],
  wilds: ['wilds', 'road', 'roads', 'travel', 'strait', 'island', 'islands', 'wall', 'karst', 'li'],
  law: [
    'law',
    'watch',
    'guard',
    'guards',
    'garrison',
    'magistrate',
    'crime',
    'steal',
    'thief',
    'murder',
    'punish',
    'arrest',
  ],
  history: [
    'history',
    'era',
    'sealed era',
    'ancient',
    'severed',
    'heaven ladder',
    'legend',
    'old days',
    'starfall',
  ],
  roots: [
    'spirit root',
    'spirit roots',
    'roots',
    'talent',
    'aptitude',
    'testing day',
    'tested',
    'children',
  ],
  lifespan: ['lifespan', 'live long', 'how old', 'age', 'immortality', 'die', 'years'],
  methods: [
    'method',
    'methods',
    'manual',
    'manuals',
    'technique',
    'techniques',
    'jade slip',
    'slip',
    'art',
    'arts',
  ],
  mortals: ['mortal', 'mortals', 'peasant', 'farmer', 'commoner', 'ordinary people', 'family'],
  places: ['city', 'town', 'market', 'teahouse', 'inn', 'den', 'black market', 'harbor', 'where'],
} as const satisfies Record<string, readonly string[]>;

export type Topic = keyof typeof TOPICS;
export const TOPIC_IDS = Object.keys(TOPICS) as [Topic, ...Topic[]];

/** Topics carried from earlier turns: the last two still count, so "and how much?" keeps them. */
export const TOPIC_TURNS = 2;
/** At most this many entries a person a turn, and this many in the whole scene. */
export const LORE_PER_PERSON = 3;
export const LORE_PER_SCENE = 10;

/**
 * Who knows an entry: any one of its tags is enough, and a tag joined by `&` needs all its parts.
 * `everyone`, `mortal`, `cultivator`, `region:<id>` (lives there), `place:<id>` (lives there or
 * keeps a room there), `power:<id>` (a member), `trade:<id>` (their door kind, mortal kind or craft)
 * and `realm:<id>+` (that realm and up).
 */
export interface LoreEntry {
  id: string;
  /** As the person would know it, 50 words at most. */
  text: string;
  about: Topic[];
  knownBy: string[];
  /** Told to anyone (the default), or only to a friend: a power's own business. */
  tells?: 'anyone' | 'friend';
  /** Words that bring this entry up on their own. */
  words?: string[];
  /** An entry this one says better, left out for whoever knows both: the price here over the posted one. */
  over?: string;
}

/** The hand-written half: the customs everywhere, then each region's. */
export const WRITTEN_LORE: readonly LoreEntry[] = [
  ...(customs as LoreEntry[]),
  ...(borderWilds as LoreEntry[]),
];

/** What a door kind's talk turns to, so a pill shop always has pills at hand. */
export const DOOR_TOPICS: Readonly<Record<string, readonly Topic[]>> = {
  inn: ['places'],
  teahouse: ['places'],
  market: ['prices'],
  craft: ['crafts', 'prices'],
  trading: ['prices', 'money'],
  bounty: ['board'],
  gate: ['law'],
  hall: ['powers', 'seats'],
  ground: ['seats'],
  den: ['money'],
  temple: ['history'],
};

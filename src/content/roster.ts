// The Border Wilds roster (design § Enemies, beasts and the people you meet), in the Qi
// Condensation and Foundation bands: P2.2's matchup list and P3.7's encounter templates. A template
// names a species or a pedigree and path; core/combat/generate.ts rolls the rest on the `people`
// stream. Names and parts follow the atlas entries the canon pass reads.
import type { BeastElement } from './beasts.ts';
import type { WeaponKind } from './combat.ts';
import type { NpcPath, PedigreeId, ProfileId } from './enemies.ts';
import type { RealmId } from './realms.ts';
import type { DamageType } from './techniques.ts';

interface TemplateBase {
  id: string;
  name: string;
  /** The realms it is met at, lowest first. */
  band: readonly RealmId[];
  profile: ProfileId;
  notes: string;
}

export interface BeastTemplate extends TemplateBase {
  kind: 'beast';
  /** A species id, or null to roll one of the lone species. */
  species: string | null;
}

export interface CultivatorTemplate extends TemplateBase {
  kind: 'cultivator';
  pedigree: PedigreeId;
  /** Their path, when it isn't their pedigree's (P3.2). */
  path?: NpcPath;
  weapon: WeaponKind;
  /** Their arts' element, if their method gives them one. */
  element: BeastElement | null;
  /** A bloodline whose beast abilities they use as body techniques. */
  bloodline?: BeastElement | 'rolled';
  /** Key items that drop with them: a token, a bounty. */
  carries?: readonly string[];
  /** The power they belong to, an atlas id: whose name they give when threatened (O3). */
  power?: string;
  /** The one damage type their armor's material resists: water-silk turns fire. */
  resists?: DamageType;
}

export type Template = BeastTemplate | CultivatorTemplate;

const QC = ['qi-condensation'] as const;
const FE = ['foundation-establishment'] as const;
const BOTH = ['qi-condensation', 'foundation-establishment'] as const;

export const BORDER_WILDS: readonly Template[] = [
  {
    id: 'cave-bat-swarm',
    name: 'Cave bat swarm',
    kind: 'beast',
    species: 'cave-bat',
    band: QC,
    profile: 'aggressive',
    notes: 'screech dazes; wings and guano',
  },
  {
    id: 'stone-skin-boar',
    name: 'Stone-skin boar',
    kind: 'beast',
    species: 'stone-skin-boar',
    band: QC,
    profile: 'aggressive',
    notes: 'stone skin at green; hide and marrow',
  },
  {
    id: 'tide-crab',
    name: 'Tide crab',
    kind: 'beast',
    species: 'tide-crab',
    band: QC,
    profile: 'cautious',
    notes: 'shell, meat',
  },
  {
    id: 'karst-python',
    name: 'Karst python',
    kind: 'beast',
    species: 'karst-python',
    band: FE,
    profile: 'cunning',
    notes: "illusion; the Soul-Lost Stone Forest's great one is Nascent Soul",
  },
  {
    id: 'reef-ape',
    name: 'Reef ape',
    kind: 'beast',
    species: 'reef-ape',
    band: FE,
    profile: 'aggressive',
    notes: "Ape's Palm Reef; fists, blade feathers at blue",
  },
  {
    id: 'strait-shark',
    name: 'Strait shark',
    kind: 'beast',
    species: 'strait-shark',
    band: FE,
    profile: 'aggressive',
    notes: "the Shark Caves' kin; fang, fin",
  },
  {
    id: 'vast-wilds-raider-beast',
    name: 'Vast Wilds raider beast',
    kind: 'beast',
    species: 'vast-wilds-raider',
    band: FE,
    profile: 'aggressive',
    notes: 'what the raids bring over; old and better-blooded than the local stock',
  },
  {
    id: 'ridge-wolf',
    name: 'Ridge wolves',
    kind: 'beast',
    species: 'ridge-wolf',
    band: BOTH,
    profile: 'aggressive',
    notes: 'the Howling Downs and the Wolf King’s ridge; packs of three to six; hide and fangs',
  },
  {
    id: 'thunder-deer',
    name: 'Thunder-horned deer',
    kind: 'beast',
    species: 'thunder-deer',
    band: QC,
    profile: 'cautious',
    notes: 'the Spirit Herders’ plains; the herds bolt before they fight',
  },
  {
    id: 'marsh-crocodile',
    name: 'Marsh crocodile',
    kind: 'beast',
    species: 'marsh-crocodile',
    band: BOTH,
    profile: 'cunning',
    notes: 'the fens; lies still under the reeds; hide and gall',
  },
  {
    id: 'stone-ape',
    name: 'Stone apes',
    kind: 'beast',
    species: 'stone-ape',
    band: FE,
    profile: 'aggressive',
    notes: 'the Stone-Ape King’s troops in the karst; fists and hide',
  },
  {
    id: 'march-conscript',
    name: 'March conscript',
    kind: 'cultivator',
    pedigree: 'rogue',
    weapon: 'spear',
    element: null,
    band: QC,
    profile: 'cautious',
    carries: ['token of the March'],
    power: 'qm-anbian-fu',
    notes: 'spear; a garrison method; a token of the March',
  },
  {
    id: 'garrison-deserter',
    name: 'Garrison deserter',
    kind: 'cultivator',
    pedigree: 'rogue',
    weapon: 'spear',
    element: null,
    band: QC,
    profile: 'cowardly',
    carries: ['stolen stones', 'a price on their head'],
    notes: 'spear; stolen stones; a price on their head',
  },
  {
    id: 'half-blood-raider',
    name: 'Half-blood raider',
    kind: 'cultivator',
    pedigree: 'rogue',
    path: 'body',
    weapon: 'fist',
    element: null,
    bloodline: 'rolled',
    band: BOTH,
    profile: 'aggressive',
    notes: 'fist and beast abilities; hunted by the wall',
  },
  {
    id: 'night-bridge-smuggler',
    name: 'Night Bridge smuggler',
    kind: 'cultivator',
    pedigree: 'rogue',
    weapon: 'fist',
    element: null,
    band: BOTH,
    profile: 'cunning',
    carries: ['escape talisman'],
    power: 'qm-yeqiao-hui',
    notes: 'fist; an escape talisman; the Night Bridge method at night',
  },
  {
    id: 'raider-isles-pirate',
    name: 'Raider Isles pirate',
    kind: 'cultivator',
    pedigree: 'rogue',
    weapon: 'saber',
    element: null,
    band: BOTH,
    profile: 'cunning',
    carries: ["White Fang Stockade's token"],
    notes: "saber; White Fang Stockade's token",
  },
  {
    id: 'beast-butcher-disciple',
    name: 'Beast-Butcher Gate disciple',
    kind: 'cultivator',
    pedigree: 'small-sect',
    path: 'body',
    weapon: 'saber',
    element: null,
    band: BOTH,
    profile: 'aggressive',
    carries: ['beast cores', "the Gate's token"],
    power: 'qm-tushou-men',
    notes: "saber; cores on them; the Gate's token",
  },
  {
    id: 'sea-taming-disciple',
    name: 'Sea-Taming Sect disciple',
    kind: 'cultivator',
    pedigree: 'small-sect',
    weapon: 'spear',
    element: 'water',
    resists: 'fire',
    band: FE,
    profile: 'cautious',
    carries: ["the Sect's token"],
    notes: 'spear; a water-silk robe',
  },
  // A place's crowd (content/crowd.ts, P3.9b): the cultivators a street's faces are once engaged.
  {
    id: 'rogue-cultivator',
    name: 'Rogue cultivator',
    kind: 'cultivator',
    pedigree: 'rogue',
    weapon: 'sword',
    element: null,
    band: BOTH,
    profile: 'cautious',
    notes: 'sword; a scrounged method; owes nobody',
  },
  {
    id: 'caravan-guard',
    name: 'Caravan guard',
    kind: 'cultivator',
    pedigree: 'rogue',
    weapon: 'saber',
    element: null,
    band: BOTH,
    profile: 'cautious',
    notes: 'saber; hired by the season; the caravan master’s pass',
  },
  {
    id: 'sect-disciple',
    name: 'Sect disciple',
    kind: 'cultivator',
    pedigree: 'small-sect',
    weapon: 'sword',
    element: null,
    band: BOTH,
    profile: 'cautious',
    notes: 'sword; a small sect’s method; their sect behind them',
  },
  {
    id: 'beast-hunter',
    name: 'Beast hunter',
    kind: 'cultivator',
    pedigree: 'rogue',
    path: 'body',
    weapon: 'spear',
    element: null,
    band: BOTH,
    profile: 'aggressive',
    carries: ['beast cores'],
    notes: 'spear; cores on them; hunts by the board',
  },
];

/**
 * The regional cast's templates (N2), one a pedigree: a cast member's kit regenerates from theirs
 * and their seed at the realm they reached. Never drawn by an encounter, which names its own.
 */
const CAST_BAND = [
  'qi-condensation',
  'foundation-establishment',
  'core-formation',
  'nascent-soul',
] as const;
const castTemplate = (pedigree: PedigreeId, name: string): CultivatorTemplate => ({
  id: `cast-${pedigree}`,
  name,
  kind: 'cultivator',
  pedigree,
  weapon: 'sword',
  element: null,
  band: CAST_BAND,
  profile: 'cautious',
  notes: 'the regional cast: a seed and pins',
});
export const CAST_TEMPLATES: readonly Template[] = [
  castTemplate('rogue', 'Rogue cultivator'),
  castTemplate('small-sect', 'Small-sect cultivator'),
  castTemplate('great-sect', 'Great-sect cultivator'),
  castTemplate('sacred-land', 'Sacred-land cultivator'),
  castTemplate('chosen', 'Chosen of heaven'),
];

const byId = new Map([...BORDER_WILDS, ...CAST_TEMPLATES].map((t) => [t.id, t]));

export function template(id: string): Template {
  const t = byId.get(id);
  if (!t) throw new RangeError(`Unknown template ${id}`);
  return t;
}

/** Border Wilds names (pinyin, as people keep): surnames and given names, rolled on the `people` stream. */
export const BORDER_WILDS_NAMES = {
  surnames: ['Bai', 'Chen', 'Du', 'Gao', 'Guo', 'Han', 'Lu', 'Ma', 'Shi', 'Tie', 'Wei', 'Zhao'],
  given: ['Bo', 'Cang', 'Feng', 'Gang', 'Hu', 'Jin', 'Kui', 'Lang', 'Shan', 'Tao', 'Ying', 'Yun'],
} as const;

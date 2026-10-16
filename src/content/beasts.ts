// Beasts (design § Enemies, beasts and the people you meet): body-first foes on the same ladder,
// with a bloodline rarity in place of pedigree, one element, a profile, a pack size and a parts
// table. Every species has natural attacks that cost no qi; its bloodline rolls abilities on top
// from its element's table, none at white, one at green, two at blue, the whole table and an aura
// at purple. Attacking abilities are techniques on the same engine, tagged with the element's Dao;
// the rest are passives that shape the sheet. A bloodline in a cultivator (a half-blood, a blood
// rite) unlocks the same abilities as body techniques. A new species or ability is an entry here.
import type { ProfileId } from './enemies.ts';
import type { DamageType, Form } from './techniques.ts';

/** The ten elements a bloodline can carry: every damage type but physical. */
export const BEAST_ELEMENTS = [
  'fire',
  'water',
  'earth',
  'wood',
  'metal',
  'lightning',
  'wind',
  'ice',
  'soul',
  'poison',
] as const satisfies readonly DamageType[];
export type BeastElement = (typeof BEAST_ELEMENTS)[number];

/** What a passive ability does to the sheet. */
export interface Passive {
  /** Multiplies Defense, as armor would. */
  armor?: number;
  /** Adds Agility. */
  agility?: number;
  /** Multiplies Accuracy. */
  accuracy?: number;
  /** Multiplies HP. */
  hp?: number;
  /** Resists one damage type by this share. */
  resist?: { type: DamageType; share: number };
}

export interface Ability {
  id: string;
  name: string;
  element: BeastElement;
  /** An attack: a technique on the body or soul ladder that costs qi at tier 1's rate. */
  attack?: { form: Form; damage: DamageType; power: number; qiCost: number };
  passive?: Passive;
}

const atk = (form: Form, damage: DamageType, power: number, qiCost: number) => ({
  attack: { form, damage, power, qiCost },
});

/** Each element's abilities, in the order a bloodline rolls them. */
export const ABILITIES: readonly Ability[] = [
  { id: 'ember-breath', name: 'ember breath', element: 'fire', ...atk('breath', 'fire', 45, 10) },
  {
    id: 'burning-hide',
    name: 'burning hide',
    element: 'fire',
    passive: { resist: { type: 'fire', share: 0.5 }, armor: 1.1 },
  },
  { id: 'heat-sense', name: 'heat sense', element: 'fire', passive: { accuracy: 1.15 } },
  { id: 'tide-pull', name: 'tide pull', element: 'water', ...atk('aura', 'water', 40, 8) },
  { id: 'mist-veil', name: 'mist veil', element: 'water', passive: { agility: 3 } },
  { id: 'chill', name: 'chill', element: 'water', ...atk('breath', 'water', 35, 6) },
  { id: 'stone-skin', name: 'stone skin', element: 'earth', passive: { armor: 1.4 } },
  { id: 'quake-stomp', name: 'quake stomp', element: 'earth', ...atk('charge', 'earth', 45, 10) },
  { id: 'burrow', name: 'burrow', element: 'earth', passive: { agility: 2 } },
  { id: 'root-grasp', name: 'root grasp', element: 'wood', ...atk('claw', 'wood', 35, 8) },
  { id: 'regrowth', name: 'regrowth', element: 'wood', passive: { hp: 1.25 } },
  {
    id: 'venom-thorn',
    name: 'venom thorn',
    element: 'wood',
    ...atk('projectile', 'poison', 40, 8),
  },
  { id: 'iron-scales', name: 'iron scales', element: 'metal', passive: { armor: 1.4 } },
  {
    id: 'blade-feathers',
    name: 'blade feathers',
    element: 'metal',
    ...atk('projectile', 'metal', 45, 10),
  },
  {
    id: 'lightning-dash',
    name: 'lightning dash',
    element: 'lightning',
    ...atk('charge', 'lightning', 45, 10),
  },
  {
    id: 'paralyzing-bite',
    name: 'paralyzing bite',
    element: 'lightning',
    ...atk('bite', 'lightning', 35, 6),
  },
  { id: 'gale-wing', name: 'gale wing', element: 'wind', ...atk('aura', 'wind', 40, 8) },
  { id: 'uncatchable', name: 'uncatchable', element: 'wind', passive: { agility: 4 } },
  {
    id: 'freezing-breath',
    name: 'freezing breath',
    element: 'ice',
    ...atk('breath', 'ice', 45, 10),
  },
  {
    id: 'frost-armor',
    name: 'frost armor',
    element: 'ice',
    passive: { armor: 1.25, resist: { type: 'ice', share: 0.5 } },
  },
  { id: 'illusion', name: 'illusion', element: 'soul', ...atk('aura', 'soul', 40, 8) },
  { id: 'fear-roar', name: 'fear roar', element: 'soul', ...atk('aura', 'soul', 35, 6) },
  { id: 'soul-gaze', name: 'soul gaze', element: 'soul', passive: { accuracy: 1.15 } },
  { id: 'venom-fang', name: 'venom fang', element: 'poison', ...atk('bite', 'poison', 45, 10) },
  { id: 'miasma', name: 'miasma', element: 'poison', ...atk('aura', 'poison', 35, 6) },
];

/** From purple up a bloodline carries an aura: everything it does hits this much harder. */
export const AURA_POWER = 1.1;

/** Beasts are body-first: this much HP, and no armor, so Defense sits at the gray band. */
export const BEAST_HP = 1.5;
export const BEAST_DEFENSE = 0.8;

/** How many abilities a bloodline rolls, by rarity: the whole table from purple. */
export const ABILITY_COUNT = {
  gray: 0,
  white: 0,
  green: 1,
  blue: 2,
  purple: 3,
  gold: 3,
  red: 3,
  pristine: 3,
} as const;

/** A natural attack: free of qi, on the body ladder, physical. */
export interface NaturalAttack {
  name: string;
  form: Form;
  power: number;
  /** Some natural attacks carry a type: a bat's screech is soul. */
  damage?: DamageType;
}

export interface Species {
  id: string;
  name: string;
  /** Null when the species rolls one, as the Vast Wilds raiders do. */
  element: BeastElement | null;
  profile: ProfileId;
  /** Pack size, fewest to most; one for a lone beast. */
  pack: readonly [number, number];
  natural: readonly NaturalAttack[];
  /** The abilities its bloodline rolls first, before the element table's order. */
  first?: readonly string[];
  /** A swarm's members are small: their HP and Attack against a lone beast's. */
  scale?: { hp: number; attack: number };
  /** The bias on its bloodline roll: 1 is the shared table. */
  bloodline?: number;
  parts: readonly string[];
}

export const SPECIES: readonly Species[] = [
  {
    id: 'cave-bat',
    name: 'cave bat',
    element: 'wind',
    profile: 'aggressive',
    pack: [6, 12],
    natural: [
      { name: 'bite', form: 'bite', power: 30 },
      { name: 'screech', form: 'aura', power: 20, damage: 'soul' },
    ],
    scale: { hp: 0.12, attack: 0.1 },
    parts: ['wings', 'guano'],
  },
  {
    id: 'stone-skin-boar',
    name: 'stone-skin boar',
    element: 'earth',
    profile: 'aggressive',
    pack: [1, 1],
    natural: [
      { name: 'tusk charge', form: 'charge', power: 30 },
      { name: 'bite', form: 'bite', power: 25 },
    ],
    first: ['stone-skin'],
    parts: ['hide', 'marrow'],
  },
  {
    id: 'tide-crab',
    name: 'tide crab',
    element: 'water',
    profile: 'cautious',
    pack: [3, 5],
    natural: [{ name: 'pincer', form: 'claw', power: 30 }],
    scale: { hp: 0.6, attack: 0.7 },
    parts: ['shell', 'meat'],
  },
  {
    id: 'karst-python',
    name: 'karst python',
    element: 'soul',
    profile: 'cunning',
    pack: [1, 1],
    natural: [
      { name: 'coil', form: 'tail', power: 30 },
      { name: 'bite', form: 'bite', power: 25 },
    ],
    first: ['illusion'],
    parts: ['skin', 'gall', 'fang'],
  },
  {
    id: 'reef-ape',
    name: 'reef ape',
    element: 'metal',
    profile: 'aggressive',
    pack: [2, 4],
    natural: [{ name: 'fists', form: 'palm', power: 30 }],
    first: ['iron-scales', 'blade-feathers'],
    parts: ['fists', 'hide'],
  },
  {
    id: 'strait-shark',
    name: 'strait shark',
    element: 'water',
    profile: 'aggressive',
    pack: [1, 1],
    natural: [
      { name: 'bite', form: 'bite', power: 30 },
      { name: 'tail', form: 'tail', power: 25 },
    ],
    parts: ['fang', 'fin'],
  },
  {
    id: 'vast-wilds-raider',
    name: 'Vast Wilds raider beast',
    element: null,
    profile: 'aggressive',
    pack: [1, 1],
    natural: [
      { name: 'claw', form: 'claw', power: 30 },
      { name: 'bite', form: 'bite', power: 25 },
    ],
    bloodline: 1.6,
    parts: ['hide', 'fang', 'blood'],
  },
  // The map's beasts (P3.7): the hills' wolves, the plains' deer, the marsh's crocodiles and the
  // karst's apes, for the encounter templates.
  {
    id: 'ridge-wolf',
    name: 'ridge wolf',
    element: 'wind',
    profile: 'aggressive',
    pack: [3, 6],
    natural: [
      { name: 'bite', form: 'bite', power: 30 },
      { name: 'flanking lunge', form: 'charge', power: 22 },
    ],
    scale: { hp: 0.45, attack: 0.5 },
    parts: ['hide', 'fang'],
  },
  {
    id: 'thunder-deer',
    name: 'thunder-horned deer',
    element: 'lightning',
    profile: 'cautious',
    pack: [2, 5],
    natural: [{ name: 'horn charge', form: 'charge', power: 30 }],
    first: ['lightning-dash'],
    scale: { hp: 0.6, attack: 0.6 },
    parts: ['hide', 'meat'],
  },
  {
    id: 'marsh-crocodile',
    name: 'marsh crocodile',
    element: 'water',
    profile: 'cunning',
    pack: [1, 1],
    natural: [
      { name: 'death roll', form: 'bite', power: 32 },
      { name: 'tail', form: 'tail', power: 24 },
    ],
    first: ['mist-veil'],
    parts: ['hide', 'gall'],
  },
  {
    id: 'stone-ape',
    name: 'stone ape',
    element: 'earth',
    profile: 'aggressive',
    pack: [2, 4],
    natural: [{ name: 'fists', form: 'palm', power: 30 }],
    first: ['stone-skin'],
    parts: ['fists', 'hide'],
  },
];

const speciesById = new Map(SPECIES.map((s) => [s.id, s]));

export function species(id: string): Species {
  const s = speciesById.get(id);
  if (!s) throw new RangeError(`Unknown species ${id}`);
  return s;
}

const abilityById = new Map(ABILITIES.map((a) => [a.id, a]));

export function ability(id: string): Ability {
  const a = abilityById.get(id);
  if (!a) throw new RangeError(`Unknown ability ${id}`);
  return a;
}

/** An element's abilities in rolling order. */
export function elementAbilities(e: BeastElement): Ability[] {
  return ABILITIES.filter((a) => a.element === e);
}

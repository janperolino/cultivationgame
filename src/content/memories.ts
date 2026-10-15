// The memory table (design § The resolver, What lasts; P3.4's talk): opinion is the sum of the
// reasons a person remembers, RimWorld's way, and standing the same for a power. Each row is a
// reason, a value, a fade and a tag; a person's motives and leans weight the tags
// (content/personality.ts). A fade runs straight from full to nothing over its span; a stacking
// row adds up to its cap, any other row restarts at full when it happens again. GLM's memory
// effect names a row and can't invent one. core/resolver/opinion.ts holds the rules.
import type { DeedKind } from './resolver.ts';

const WEEK = 7;
const MONTH = 30;
const SEASON = 90;
const YEAR = 360;

/** What a memory is about, for the motives and leans that weight it. */
export const MEMORY_TAGS = [
  'rescue',
  'kin',
  'service',
  'payment',
  'company',
  'knowledge',
  'face',
  'insult',
  'threat',
  'theft',
  'prize',
  'harm',
  'deceit',
  'power',
  'evil',
] as const;
export type MemoryTag = (typeof MEMORY_TAGS)[number];

export interface MemoryRow {
  /** In the holder's words, as their page lists it. */
  reason: string;
  /** Its value; for a row whose value is its own, the default. */
  value: number;
  /** Days to fade to nothing, or null for never. */
  fade: number | null;
  /** A stacking row adds up to this; others restart at full. */
  cap?: number;
  tag: MemoryTag | null;
  /** Its value is given when it lands: a gift by its worth, a card's plain mapping. */
  own?: boolean;
}

export const MEMORIES = {
  // rescue
  'saved-life': { reason: 'Saved my life', value: 40, fade: null, tag: 'rescue' },
  healed: { reason: 'Healed me', value: 20, fade: YEAR, tag: 'rescue' },
  protected: { reason: 'Protected me', value: 20, fade: YEAR, tag: 'rescue' },
  spared: { reason: 'Spared me', value: 15, fade: YEAR, tag: 'rescue' },
  // kin: the ripples through a tie
  'saved-loved': { reason: 'Saved someone I love', value: 30, fade: null, tag: 'kin' },
  'hurt-loved': { reason: 'Hurt someone I love', value: -20, fade: SEASON, tag: 'kin' },
  'killed-loved': { reason: 'Killed someone I love', value: -100, fade: null, tag: 'kin' },
  'blood-feud': { reason: 'A blood feud with my family', value: -40, fade: null, tag: 'kin' },
  // service
  'fought-beside': { reason: 'Fought beside me', value: 10, fade: YEAR, tag: 'service' },
  taught: { reason: 'Taught me', value: 15, fade: YEAR, tag: 'service' },
  'kept-secret': { reason: 'Kept my secret', value: 15, fade: YEAR, tag: 'service' },
  service: { reason: 'Did me a service', value: 10, fade: SEASON, cap: 30, tag: 'service' },
  'kept-promise': { reason: 'Kept a promise', value: 10, fade: SEASON, tag: 'service' },
  // payment
  'paid-fairly': { reason: 'Paid me fairly', value: 3, fade: MONTH, cap: 15, tag: 'payment' },
  gift: { reason: 'A gift', value: 5, fade: SEASON, cap: 30, tag: 'payment', own: true },
  cheated: { reason: 'Cheated me in trade', value: -15, fade: SEASON, tag: 'payment' },
  'debt-late': { reason: 'A debt past due', value: -5, fade: MONTH, cap: -30, tag: 'payment' },
  // company
  'shared-drink': {
    reason: 'Shared a drink with me',
    value: 2,
    fade: WEEK,
    cap: 10,
    tag: 'company',
  },
  'spent-time': { reason: 'Spent time with me', value: 2, fade: WEEK, cap: 20, tag: 'company' },
  // knowledge
  'told-new': { reason: 'Told me something new', value: 5, fade: SEASON, tag: 'knowledge' },
  // face
  'gave-face': { reason: 'Gave me face', value: 10, fade: SEASON, tag: 'face' },
  'cost-face': { reason: 'Cost me face', value: -15, fade: SEASON, tag: 'face' },
  'beat-me': { reason: 'Beat me in a fair contest', value: -5, fade: SEASON, tag: 'face' },
  spurned: { reason: 'Spurned me', value: -15, fade: YEAR, tag: 'face' },
  // insult and threat
  insulted: { reason: 'Insulted me', value: -10, fade: MONTH, cap: -30, tag: 'insult' },
  humiliated: { reason: 'Humiliated me in public', value: -30, fade: YEAR, tag: 'insult' },
  threatened: { reason: 'Threatened me', value: -20, fade: SEASON, tag: 'threat' },
  // theft and prize
  stole: { reason: 'Stole from me, and I found out', value: -25, fade: YEAR, tag: 'theft' },
  robbed: { reason: 'Robbed me', value: -30, fade: YEAR, tag: 'theft' },
  'took-mine': { reason: 'Took what was mine', value: -20, fade: YEAR, tag: 'prize' },
  // harm
  hurt: { reason: 'Hurt me', value: -30, fade: YEAR, tag: 'harm' },
  captive: { reason: 'Took me captive', value: -40, fade: YEAR, tag: 'harm' },
  framed: { reason: 'Framed me', value: -50, fade: null, tag: 'harm' },
  betrayed: { reason: 'Betrayed me', value: -80, fade: null, tag: 'harm' },
  'killed-enemy': { reason: 'Killed my enemy', value: 15, fade: YEAR, tag: 'harm' },
  'sided-enemy': { reason: 'Sided with my enemy', value: -15, fade: SEASON, tag: 'harm' },
  // deceit
  lied: { reason: 'Lied to me, and I found out', value: -25, fade: YEAR, tag: 'deceit' },
  'broke-promise': { reason: 'Broke a promise', value: -20, fade: YEAR, tag: 'deceit' },
  'spread-secret': { reason: 'Spread my secret', value: -30, fade: YEAR, tag: 'deceit' },
  // power
  'insulted-sect': {
    reason: 'Insulted my sect or master',
    value: -15,
    fade: SEASON,
    tag: 'power',
  },
  'wronged-us': { reason: "Wronged us, I'm told", value: -20, fade: YEAR, tag: 'power' },
  // evil: felt only by the righteous
  'did-evil': { reason: 'Did evil, I hear', value: -15, fade: YEAR, tag: 'evil' },
  // plain rows, with values of their own
  'from-before': { reason: 'From before', value: 0, fade: null, tag: null, own: true },
  'first-look': { reason: 'A first impression', value: 0, fade: SEASON, tag: null, own: true },
  'good-turn': { reason: 'Did right by me', value: 10, fade: SEASON, tag: null, own: true },
  'bad-turn': { reason: 'Did me wrong', value: -10, fade: SEASON, tag: null, own: true },
} as const satisfies Record<string, MemoryRow>;
export type MemoryId = keyof typeof MEMORIES;
export const MEMORY_IDS = Object.keys(MEMORIES) as MemoryId[];

export function memoryRow(id: MemoryId): MemoryRow {
  return MEMORIES[id];
}

/** A gift's worth as a memory: its value in stones, held to +5 to +30. */
export const GIFT_MIN = 5;
export const GIFT_MAX = 30;

/** The whole weight a memory can carry, from motives, leans, quirks and likes together. */
export const WEIGHT_MIN = 0.25;
export const WEIGHT_MAX = 3;
/** A motive that names a memory's tag doubles it; a liked gift counts double. */
export const MOTIVE_WEIGHT = 2;
export const LIKED_GIFT = 2;

/** Shown "(fading)" once under this share of its full value. */
export const FADING_SHARE = 0.5;

/** The trust words opinion reads (design § The resolver, People checks): the lowest total for each. */
export const TRUST_AT = [
  { word: 'hostile', at: -Infinity },
  { word: 'wary', at: -39 },
  { word: 'neutral', at: -9 },
  { word: 'friendly', at: 10 },
  { word: 'trusting', at: 40 },
] as const;

/** A never-fading memory weighing this or worse makes an enemy. */
export const ENEMY_AT = -80;
/** A lover whose opinion falls under this becomes a former lover. */
export const FORMER_LOVER_BELOW = -9;

// ── Deeds into memories ──────────────────────────────────────────────────────────────────────

/** What the one a deed was done to remembers, once they know who did it. */
export const DEED_MEMORY: Partial<Record<DeedKind, MemoryId>> = {
  theft: 'stole',
  robbery: 'robbed',
  assault: 'hurt',
  lie: 'lied',
  threat: 'threatened',
  frame: 'framed',
  betrayal: 'betrayed',
  kidnapping: 'captive',
  rescue: 'saved-life',
};

/** What someone tied to its victim remembers: in full through a love tie, at half through a friend. */
export const DEED_RIPPLE: Partial<Record<DeedKind, MemoryId>> = {
  killing: 'killed-loved',
  massacre: 'killed-loved',
  assault: 'hurt-loved',
  kidnapping: 'hurt-loved',
};

/** The deeds the righteous hold against you when they hear of them, done to anyone. */
export const EVIL_DEEDS: readonly DeedKind[] = [
  'killing',
  'massacre',
  'robbery',
  'kidnapping',
  'betrayal',
  'frame',
];

/** Killing their enemy pleases them. */
export const ENEMY_KILLED: readonly DeedKind[] = ['killing', 'massacre'];

// ── Standing ─────────────────────────────────────────────────────────────────────────────────

export interface StandingRow {
  reason: string;
  value: number;
  fade: number | null;
  own?: boolean;
}

/** A power's remembered reasons (design § The resolver, What lasts). */
export const STANDING_ROWS = {
  'killed-ours': { reason: 'Killed one of ours', value: -30, fade: null },
  massacre: { reason: 'A massacre of ours', value: -60, fade: null },
  'captive-ours': { reason: 'Took one of ours captive', value: -30, fade: YEAR },
  'robbed-us': { reason: 'Robbed us', value: -15, fade: YEAR },
  'attacked-ours': { reason: 'Attacked one of ours', value: -10, fade: SEASON },
  'lied-to-us': { reason: 'Lied to us', value: -10, fade: SEASON },
  mission: { reason: 'A mission done for us', value: 10, fade: YEAR },
  tribute: { reason: 'Tribute', value: 5, fade: SEASON, own: true },
  member: { reason: 'One of ours', value: 10, fade: null },
} as const satisfies Record<string, StandingRow>;
export type StandingId = keyof typeof STANDING_ROWS;
export const STANDING_IDS = Object.keys(STANDING_ROWS) as StandingId[];

/** What a power holds against you once one of its people learns who did it to its own. */
export const DEED_STANDING: Partial<Record<DeedKind, StandingId>> = {
  killing: 'killed-ours',
  massacre: 'massacre',
  kidnapping: 'captive-ours',
  robbery: 'robbed-us',
  theft: 'robbed-us',
  assault: 'attacked-ours',
  exposure: 'lied-to-us',
};

/** The standing words, each the lowest total for it, and what it counts in a people check. */
export const STANDING_WORDS = [
  { word: 'hunted', at: -Infinity, leverage: 0.5 },
  { word: 'hostile', at: -59, leverage: 0.67 },
  { word: 'cold', at: -29, leverage: 0.85 },
  { word: 'unknown', at: -9, leverage: 1 },
  { word: 'known', at: 10, leverage: 1.15 },
  { word: 'favored', at: 30, leverage: 1.3 },
  { word: 'honored', at: 60, leverage: 1.5 },
] as const;
export type StandingWord = (typeof STANDING_WORDS)[number]['word'];

/** Heat caps standing: at each heat, the best standing it allows (design § What lasts). */
export const HEAT_CAPS = [
  { heat: 9, cap: -60 },
  { heat: 6, cap: -30 },
  { heat: 3, cap: -10 },
] as const;

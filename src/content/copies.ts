// Copies (design § Cultivation, Reading): a manual, a method or a technique handed over as a thing,
// bought, given, found or stolen, is a copy you read on your study hours, never a lesson. Every one
// has a copy derived from it, not written by hand: an item of the manual kind with the read use
// naming what it teaches, at its rarity and tier. Copies never take a Bag square; the cultivator
// counts them by what they teach, and the bookcase stands each as a spine (core/reading.ts).
import type { Item } from './items.ts';
import { hasManual, manual, methodManual, techniqueArt, type Manual } from './manuals.ts';
import { hasMethod, method } from './methods.ts';
import { rarityRank, type RarityId } from './rarity.ts';
import { hasTechnique, technique } from './techniques.ts';
import { TREES } from './trees/index.ts';

/** What a copy teaches: a loose manual, a method or a technique. */
export const COPY_KINDS = ['manual', 'method', 'technique'] as const;
export type CopyKind = (typeof COPY_KINDS)[number];

export interface CopyOf {
  kind: CopyKind;
  id: string;
}

/** A copy's id, by what it teaches: "manual:tide-counting", "technique:rampart-palm". */
export function copyId(kind: CopyKind, id: string): string {
  return `${kind}:${id}`;
}

/** What a copy id teaches, or null when it names nothing the game holds. */
export function copyOf(id: string): CopyOf | null {
  const at = id.indexOf(':');
  if (at < 0) return null;
  const kind = id.slice(0, at) as CopyKind;
  const of = id.slice(at + 1);
  if (kind === 'manual') return hasManual(of) && isLoose(manual(of)) ? { kind, id: of } : null;
  if (kind === 'method') return hasMethod(of) ? { kind, id: of } : null;
  if (kind === 'technique') return hasTechnique(of) ? { kind, id: of } : null;
  return null;
}

export function hasCopy(id: string): boolean {
  return copyOf(id) !== null;
}

function isLoose(m: Manual): boolean {
  return !m.method && !m.technique;
}

/** The copy of a manual on the bookcase: a method's teaches the method, an Art its technique. */
export function copyOfManual(m: Manual): string {
  if (m.method) return copyId('method', m.method);
  if (m.technique) return copyId('technique', m.technique);
  return copyId('manual', m.id);
}

// A method with no manual of its own, or a technique with no Art written, still stands on the
// bookcase as a spine with no nodes, made once and kept.
const bare = new Map<string, Manual>();

function bareManual(kind: 'method' | 'technique', id: string): Manual {
  const key = copyId(kind, id);
  const made = bare.get(key);
  if (made) return made;
  const t = kind === 'method' ? method(id) : technique(id);
  const first = kind === 'technique' ? technique(id).daos[0] : undefined;
  const m: Manual = {
    id: kind === 'method' ? id : `art-${id}`,
    name: t.name,
    pinyin: t.pinyin,
    hanzi: t.hanzi,
    kind: kind === 'method' ? 'method' : 'art',
    rarity: t.rarity,
    source: t.source,
    ladder: t.ladder,
    ...(kind === 'method' ? { method: id } : { technique: id }),
    host:
      kind === 'method' ? t.ladder : first && TREES.some((tr) => tr.id === first) ? first : null,
    tier: t.tier,
    nodes: [],
  };
  bare.set(key, m);
  return m;
}

/** The manual a copy stands as on the bookcase: the manual, the method's, or the technique's Art. */
export function copyManual(id: string): Manual {
  const of = copyOf(id);
  if (!of) throw new RangeError(`Unknown copy ${id}`);
  if (of.kind === 'manual') return manual(of.id);
  if (of.kind === 'method') return methodManual(of.id) ?? bareManual('method', of.id);
  return techniqueArt(of.id) ?? bareManual('technique', of.id);
}

/**
 * A copy's form (design § Economy, Methods in the market, A book or a slip): a tier 1 manual is a
 * bound book, copied by hand; from tier 2 up it is a jade slip, read and copied by divine sense.
 * Only a slip can be sealed: one at gold and up, or one written as sealed.
 */
export type CopyForm = 'book' | 'slip' | 'sealed';
export const COPY_FORM_WORDS: Record<CopyForm, string> = {
  book: 'a bound book',
  slip: 'a jade slip',
  sealed: 'a sealed jade slip',
};

export function copyForm(id: string): CopyForm {
  const of = copyOf(id);
  if (!of) throw new RangeError(`Unknown copy ${id}`);
  const t =
    of.kind === 'method'
      ? method(of.id)
      : of.kind === 'technique'
        ? technique(of.id)
        : manual(of.id);
  if (t.tier < 2) return 'book';
  return t.sealed || rarityRank(t.rarity) >= rarityRank('gold') ? 'sealed' : 'slip';
}

/** A copy's chapter in its line: a loose manual stands alone, as a first. */
export function copyChapter(id: string): number {
  const of = copyOf(id);
  if (of?.kind === 'method') return method(of.id).chapter;
  if (of?.kind === 'technique') return technique(of.id).chapter;
  return 1;
}

/** What a copy teaches, in a phrase: "the Tide-Counting Formula", "Rampart Palm". */
export function copyTitle(id: string): string {
  const of = copyOf(id);
  if (!of) return 'a copy no longer written';
  if (of.kind === 'technique') return technique(of.id).name;
  return `the ${of.kind === 'method' ? method(of.id).name : manual(of.id).name}`;
}

function copyRarityTier(of: CopyOf): { rarity: RarityId; tier: number } {
  if (of.kind === 'method') return method(of.id);
  if (of.kind === 'technique') return technique(of.id);
  return manual(of.id);
}

/** A copy as an item record: the manual kind, its rarity and tier, the read use naming what it teaches. */
export function copyItem(id: string): Item {
  const of = copyOf(id);
  if (!of) throw new RangeError(`Unknown copy ${id}`);
  const m = copyManual(id);
  const { rarity, tier } = copyRarityTier(of);
  const text =
    of.kind === 'technique'
      ? technique(of.id).text
      : (m.nodes[0]?.text ?? `A copy of the ${m.name}.`);
  return {
    id,
    name: m.name,
    pinyin: m.pinyin,
    hanzi: m.hanzi,
    tier,
    rarity,
    kind: 'manual',
    uses: { read: of },
    source: m.source,
    text,
  };
}

/**
 * Study days a copy takes to read at tier 1, by rarity: 3, 5, 8, 12, 20, 30 and 45 from white to
 * pristine, gray as white. Two study hours a day read a white formula in about 18 days.
 */
export const READ_DAYS: Record<RarityId, number> = {
  gray: 3,
  white: 3,
  green: 5,
  blue: 8,
  purple: 12,
  gold: 20,
  red: 30,
  pristine: 45,
};

/** The lump of insight finishing a copy gives at tier 1, by rarity, gray as white; Aptitude counts. */
export const READ_LUMP: Record<RarityId, number> = {
  gray: 10,
  white: 10,
  green: 15,
  blue: 20,
  purple: 30,
  gold: 40,
  red: 50,
  pristine: 60,
};

/** Reading time and its lump grow ×3 a tier. */
export const READ_TIER_SCALE = 3;

/** Study days the copy takes to read: its rarity's, ×3 a tier. */
export function readDays(id: string): number {
  const it = copyItem(id);
  return READ_DAYS[it.rarity] * READ_TIER_SCALE ** (it.tier - 1);
}

/** The lump of insight finishing the copy gives, before Aptitude: its rarity's, ×3 a tier. */
export function readLump(id: string): number {
  const it = copyItem(id);
  return READ_LUMP[it.rarity] * READ_TIER_SCALE ** (it.tier - 1);
}

/**
 * Suits you (design § Cultivation, Reading): how well a copy fits you multiplies its reading speed,
 * built from the rules that already say a thing fits. A copy of an element your root holds reads
 * ×1.25, each tier you hold in a technique's first Dao ×1.1, a technique with a kin at
 * Comprehension by kinship's quarter and a method by its fit; the product is capped at ×1.5, so no
 * fit makes a scripture an afternoon's read. Starting values for the sims.
 */
export const SUITS_ELEMENT = 1.25;
export const SUITS_DAO_TIER = 1.1;
export const SUITS_CAP = 1.5;

// Styles, the craft grade and craft renown (design § Professions, people and powers, Styles and the
// craft grade; K6). A style is a manual of the `style` kind grafted beside its craft Dao, written in
// the catalogs a layer at a time: each area keeps one common style a craft, sold and taught openly,
// and most powers that craft at all hold it; a power whose trade is the craft writes its own,
// guarded as its methods are. The grade 一品 to 九品 is the craft Dao tier you hold, certified at a
// guild's hall by one test batch; craft renown is renown's points kept per craft and region.
import { DAYS_PER_YEAR } from './calendar.ts';
import type { CraftId } from './crafts.ts';
import type { ItemKind } from './items.ts';
import type { RarityId } from './rarity.ts';

/**
 * Each area's common style a craft, by the atlas entry it is common to (the Border Wilds' five are
 * in catalogs/border-wilds.ts). A place reads the nearest of its ancestors that writes one.
 */
export const COMMON_STYLES: Readonly<Record<string, Partial<Record<CraftId, string>>>> = {
  'qm-bianhuang': {
    alchemy: 'frontier-pill-method',
    refining: 'frontier-forging-method',
    talismans: 'frontier-talisman-script',
    formations: 'frontier-ward-flag-method',
    farming: 'frontier-field-method',
  },
};

/**
 * The styles each power holds (K6's talk). Most hold their area's common style, mostly bought; the
 * Pavilion of Bound Bones and Red Marrow Cave write their own, and Apricot Grove's Frontier Hall
 * holds the Valley's, an import along its patron tie (its branch shop is the Valley's). A shop a
 * power owns stands the goods of the styles it holds (core/styles.ts). **Awaiting Jan's review.**
 */
export const STYLES_HELD: Readonly<Record<string, readonly string[]>> = {
  'qm-wanyi-hui': [
    'frontier-pill-method',
    'frontier-forging-method',
    'frontier-talisman-script',
    'frontier-ward-flag-method',
    'frontier-field-method',
  ],
  'qm-qian-shi': ['frontier-pill-method', 'frontier-talisman-script'],
  'qm-hu-shi': ['frontier-pill-method', 'frontier-field-method'],
  'qm-tushou-men': ['frontier-pill-method', 'frontier-forging-method'],
  'qm-baijiang-zong': ['frontier-pill-method', 'frontier-forging-method'],
  'qm-shoudeng-zong': ['frontier-talisman-script'],
  'qm-jingzhong-si': ['frontier-pill-method', 'frontier-talisman-script'],
  'qm-yeqiao-hui': ['frontier-talisman-script'],
  'qm-fugu-ge': ['bone-binding-array-canon', 'frontier-talisman-script'],
  'qm-chisui-dong': ['marrow-draining-blood-method'],
  'qm-xinglin-bianguan': ['apricot-grove-healing-canon'],
  xinglin: ['apricot-grove-healing-canon'],
};

// ---------------------------------------------------------------- the craft grade

/** The grades, first to ninth: 一品 is Alchemy's tier 1 held, certified. */
export const CRAFT_GRADES = [
  { name: 'First-grade', hanzi: '一品' },
  { name: 'Second-grade', hanzi: '二品' },
  { name: 'Third-grade', hanzi: '三品' },
  { name: 'Fourth-grade', hanzi: '四品' },
  { name: 'Fifth-grade', hanzi: '五品' },
  { name: 'Sixth-grade', hanzi: '六品' },
  { name: 'Seventh-grade', hanzi: '七品' },
  { name: 'Eighth-grade', hanzi: '八品' },
  { name: 'Ninth-grade', hanzi: '九品' },
] as const;

/** What a crafter of each craft is called: a second-grade alchemist 二品丹师. */
export const CRAFTER: Readonly<Record<CraftId, { name: string; hanzi: string }>> = {
  alchemy: { name: 'alchemist', hanzi: '丹师' },
  refining: { name: 'refiner', hanzi: '器师' },
  talismans: { name: 'talisman master', hanzi: '符师' },
  formations: { name: 'array master', hanzi: '阵师' },
  farming: { name: 'spirit farmer', hanzi: '灵植师' },
};

/** The Bag kinds each craft makes, so a shop that deals in them knows its maker by name. */
export const CRAFT_DEALS: Readonly<Record<CraftId, readonly ItemKind[]>> = {
  alchemy: ['pill'],
  refining: ['gear', 'treasure', 'tool'],
  talismans: ['talisman'],
  formations: [],
  farming: ['herb'],
};

/**
 * The examination 考品 (K6's talk): one batch of the grade's tier at the guild's own bench, your
 * own inputs, that holds, played or queued; its fee in low-grade stones a grade. A guild examines
 * to the tier of its strongest realm, so the frontier branch, Foundation-led, grades to 二品.
 */
export const EXAM = { fee: 10 } as const;

/** The crafts whose benches are built, so the guild can examine them (K8 and K10 add the rest). */
export const EXAMINED: readonly CraftId[] = ['alchemy', 'refining', 'talismans'];

// ---------------------------------------------------------------- craft renown

/**
 * Craft renown (K6's talk, Jan's numbers): renown's points and levels kept per craft and region.
 * Each month a point for every month's wage of your marked goods sold in a region (30 low on the
 * realm curve), at most two a month; a grade certified and a gold piece or better made are two
 * more. It fades a level a year while nothing of yours sells there. Your mark lifts the price of
 * what you made by 3% a level where you are known; from 3 the shops and halls know you by name,
 * from 6 a guild or a power that practices the craft offers its guest elder seat.
 */
export const CRAFT_RENOWN = {
  mark: 0.03,
  wage: 30,
  monthMost: 2,
  certified: 2,
  rare: 2,
  rareFrom: 'gold' as RarityId,
  fadeDays: DAYS_PER_YEAR,
  byName: 3,
  guest: 6,
} as const;

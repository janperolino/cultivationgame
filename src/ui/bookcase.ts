// The bookcase's words and sizes (design § Cultivation, Where manuals live), apart from the
// screen so they are tested: how wide and tall a spine stands, what its hover card says of the
// manual and each node, and what a search finds.
import { MANUAL_KINDS, type Manual, type ManualNode } from '../content/manuals.ts';
import { MASTERY } from '../content/mastery.ts';
import { rarity, rarityRank } from '../content/rarity.ts';
import { statInfo } from '../content/stats.ts';
import { tree } from '../content/trees/index.ts';
import type { Cultivator } from '../core/state.ts';
import { hasLearned, nodeReady, nodeSealed } from '../core/trees.ts';

/** A spine's width in px, by kind and rarity: a formula 23, an art 25, from purple 27, up to 34. */
export function spineWidth(m: Manual): number {
  if (m.kind === 'scripture' || m.kind === 'inheritance') return 34;
  if (m.kind === 'style') return 28;
  if (m.kind === 'method' || rarityRank(m.rarity) >= rarityRank('purple')) return 27;
  return m.kind === 'art' ? 25 : 23;
}

const BASE_HEIGHT: Record<Manual['kind'], number> = {
  formula: 116,
  art: 122,
  method: 128,
  style: 130,
  scripture: 136,
  inheritance: 136,
};

/** A spine's height in px: its kind's, and 4 more a node up to four, never past 146. */
export function spineHeight(m: Manual): number {
  return Math.min(146, BASE_HEIGHT[m.kind] + Math.min(m.nodes.length, 4) * 4);
}

/** How many nodes the hover card lists before "+ 3 more". */
export const CARD_NODES = 5;
/** Past this many nodes a spine shows "1/9" instead of a pip each. */
export const PIPS_MAX = 4;

/** A node on a spine or a card: learned, buyable now, waiting on mastery or realm, or not yet. */
export type NodeMark = 'learned' | 'ready' | 'sealed' | 'waiting';

export function nodeMark(c: Cultivator, n: ManualNode): NodeMark {
  if (hasLearned(c, n.id)) return 'learned';
  if (nodeReady(c, n)) return 'ready';
  return nodeSealed(c, n) ? 'sealed' : 'waiting';
}

/** "wakes at Mastery" for a method's or an Art's node, else "sealed above your realm". */
function sealedWords(m: Manual, n: ManualNode): string {
  return n.mastery !== undefined && (m.method || m.technique)
    ? `wakes at ${MASTERY[n.mastery]!.name}`
    : 'sealed above your realm';
}

/** What the card says of a node's state, after its effect. */
export function nodeWords(c: Cultivator, m: Manual, n: ManualNode): string {
  const mark = nodeMark(c, n);
  if (mark === 'learned') return nodeSealed(c, n) ? `learned, ${sealedWords(m, n)}` : 'learned';
  if (mark === 'ready') return 'ready to learn';
  if (mark === 'sealed') return sealedWords(m, n);
  const missing = n.requires.filter((r) => !hasLearned(c, r));
  if (missing.length) {
    const names = missing.map((r) => m.nodes.find((x) => x.id === r)?.name ?? r);
    return `after ${names.join(' and ')}`;
  }
  return `${n.cost} insight`;
}

export function learnedCount(c: Cultivator, m: Manual): number {
  return m.nodes.filter((n) => hasLearned(c, n.id)).length;
}

/** "Blue formula · beside Qi, tier 1 · 1 of 2 learned", or "· above the trees ·". */
export function cardMeta(c: Cultivator, m: Manual): string {
  const where = m.host ? `beside ${tree(m.host).name}, tier ${m.tier}` : 'above the trees';
  const kind = MANUAL_KINDS[m.kind].name.toLowerCase();
  return `${rarity(m.rarity).name} ${kind} · ${where} · ${learnedCount(c, m)} of ${m.nodes.length} learned`;
}

/** The spine's label for a screen reader: its English name, rarity, kind and learned count. */
export function spineLabel(c: Cultivator, m: Manual): string {
  const kind = MANUAL_KINDS[m.kind].name.toLowerCase();
  return `${m.name}, ${rarity(m.rarity).name.toLowerCase()} ${kind}, ${learnedCount(c, m)} of ${m.nodes.length} learned`;
}

/** Where a click takes you: onto the host's tree, or its own tree at the top of the tab. */
export function openWords(m: Manual, hostOpen: boolean): string {
  return m.host && hostOpen
    ? `Click to open it on the ${tree(m.host).name} tree`
    : 'Click to open its own tree above';
}

/** Whether a search finds the manual: its name, pinyin or hanzi, a node's name, or a stat. */
export function matchesManual(m: Manual, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const words = [m.name, m.pinyin, m.hanzi, MANUAL_KINDS[m.kind].name];
  for (const n of m.nodes) {
    words.push(n.name, n.hanzi);
    for (const e of [...n.effects, ...(n.own ?? [])]) words.push(e.stat, statInfo(e.stat).name);
  }
  return words.some((w) => w.toLowerCase().includes(q));
}

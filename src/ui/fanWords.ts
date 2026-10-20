// What the fans say about a node or a manual's jewel (TreeFan.tsx): its state, the band you
// cultivate in, and the hover card's words, for a tree's nodes and a manual's alike.
import { MANUAL_KINDS, manual, type Manual } from '../content/manuals.ts';
import type { AnyNode } from '../content/nodes.ts';
import { rarity } from '../content/rarity.ts';
import { CRAFTS, hasRecipe } from '../content/crafts.ts';
import { hasItem, item } from '../content/items.ts';
import { REALMS } from '../content/realms.ts';
import { craftBranchOf, CRAFT_BRANCH_INFO } from '../content/trees/craft.ts';
import { treeOf, type Tree } from '../content/trees/index.ts';
import { manualReady } from '../core/manuals.ts';
import type { Cultivator } from '../core/state.ts';
import { canLearn, hasLearned, nodeSealed, treeTier } from '../core/trees.ts';
import { learnedCount, nodeWords } from './bookcase.ts';
import { formatEffect, formatNumber } from './format.ts';
import { wakeWords } from './manualWords.ts';

/** A node as the fans draw it: learned, buyable now (or short only of insight), or locked. */
export type NodeState = 'learned' | 'available' | 'locked';

export function nodeState(c: Cultivator, n: AnyNode): NodeState {
  if (hasLearned(c, n.id)) return 'learned';
  const check = canLearn(c, n.id);
  // Short only of insight still reads as reachable: the path is open.
  return check.ok || check.reason.startsWith('Needs') ? 'available' : 'locked';
}

/** The band you cultivate in on a tree: its ladder's realm, from 1 (a craft Dao's craft reach). */
export function hereTier(c: Cultivator, t: Tree): number {
  return treeTier(c, t);
}

/** What a craft Dao's seal says it does: the recipe it teaches, or will once its craft opens. */
export function sealWords(n: AnyNode): string | null {
  if (n.home !== 'tree' || !n.recipe) return null;
  const name = hasItem(n.recipe) ? item(n.recipe).name : n.name;
  if (hasRecipe(n.recipe)) return `Teaches the ${name} recipe`;
  const craft = treeOf(n.id).craft;
  return `Teaches the ${name} recipe once ${craft ? CRAFTS[craft].name : 'its craft'} opens`;
}

/** What a hover card says: a title, a line under it, the effects, the state, and flavor. */
export interface TipWords {
  title: string;
  hanzi: string;
  sub: string;
  effects: string;
  status: string;
  /** learned, ready (in the accent), or neither. */
  tone: 'learned' | 'ready' | 'plain';
  text: string;
  rarity?: Manual['rarity'];
}

/** A node's hover card: its tree or manual, its effects, and where it stands. */
export function nodeTip(c: Cultivator, n: AnyNode): TipWords {
  const state = nodeState(c, n);
  const sealed = nodeSealed(c, n);
  const seal = sealWords(n);
  const effects = [
    ...(seal ? [seal] : []),
    ...n.effects.map(formatEffect),
    ...('own' in n && n.own ? n.own.map((e) => `${formatEffect(e)} on its technique`) : []),
  ].join(', ');
  if (n.home === 'manual') {
    const m = manual(n.manual);
    return {
      title: n.name,
      hanzi: n.hanzi,
      sub: `${m.name} · ${n.kind}`,
      effects,
      status: `${nodeWords(c, m, n)}${state === 'available' && !hasLearned(c, n.id) ? ` · ${formatNumber(n.cost)} insight` : ''}`,
      tone: state === 'learned' ? 'learned' : state === 'available' && !sealed ? 'ready' : 'plain',
      text: n.text,
    };
  }
  const t = treeOf(n.id);
  const realmName = REALMS[n.tier - 1]!.name;
  const branch = craftBranchOf(n.branch);
  const where = branch
    ? ` · ${CRAFT_BRANCH_INFO[branch].name} ${CRAFT_BRANCH_INFO[branch].hanzi}`
    : '';
  const kind = n.recipe ? 'seal' : n.kind;
  const status =
    state === 'learned'
      ? sealed
        ? `Learned, sealed until ${realmName}`
        : 'Learned'
      : state === 'available'
        ? `${formatNumber(n.cost)} insight to learn${sealed ? `, sealed until ${realmName}` : ''}`
        : 'Learn the node before it first';
  return {
    title: n.name,
    hanzi: n.hanzi,
    sub: `${t.name} · tier ${n.tier}${where} · ${kind}`,
    effects,
    status,
    tone: state === 'learned' ? 'learned' : state === 'available' ? 'ready' : 'plain',
    text: n.text,
  };
}

/** A jewel's hover card, like the bookcase's: name, rarity, kind, tier, learned, source. */
export function jewelTip(c: Cultivator, m: Manual, sealed: boolean): TipWords {
  const ready = manualReady(c, m);
  return {
    title: m.name,
    hanzi: m.hanzi,
    sub: `${rarity(m.rarity).name} ${MANUAL_KINDS[m.kind].name.toLowerCase()} · tier ${m.tier} (${REALMS[m.tier - 1]!.name})`,
    effects: `${learnedCount(c, m)} of ${m.nodes.length} learned${ready ? ' · one ready' : ''}`,
    status: sealed ? `Sealed until ${REALMS[m.tier - 1]!.name}` : `From ${m.source}`,
    tone: ready ? 'ready' : 'plain',
    text: `${wakeWords(m)} Click to open it.`,
    rarity: m.rarity,
  };
}

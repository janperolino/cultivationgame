// The codex (design § UI and screens, The journal 志; content/codex): an entry shows once its
// feature is met, so the codex spoils nothing, and carries a dot until opened. The lineage keeps
// what it has met, so a reborn life knows what the last one learned. Most features are read from
// the state (`noteCodex`, run as the life runs and on every action); a few the UI sees happen,
// a shop's counter opened or a coming-back story told, and meets by their test (`meetCodex`).
import { CODEX, type CodexEntry, type CodexMet, type MetTest } from '../content/codex/index.ts';
import { item, hasItem } from '../content/items.ts';
import { TREES } from '../content/trees/index.ts';
import { nextStep } from './cultivation.ts';
import { built } from './guides.ts';
import { methodMastery, knownMethods } from './methods.ts';
import { mastery } from './techniques.ts';
import { ownedCopies } from './reading.ts';
import { shownTrees } from './seen.ts';
import { stats } from './stats.ts';
import { followersOf } from './resolver/followers.ts';
import { lifespanEdgeDay, unlock, type GameState } from './state.ts';
import { groundPiles } from './map/ground.ts';
import { technique, hasTechnique } from '../content/techniques.ts';

export { CODEX, codexEntry, hasCodexEntry } from '../content/codex/index.ts';

/** The Qi tree's Breath branch nodes, which pay only while you attend. */
const BREATH_NODES = new Set(
  TREES.flatMap((t) => {
    const breath = new Set(t.branches.filter((b) => b.breath).map((b) => b.id));
    return t.nodes.filter((n) => n.branch && breath.has(n.branch)).map((n) => n.id);
  }),
);

const LADDER_IDS = ['qi', 'body', 'soul'] as const;

function held(s: GameState, test: (id: string) => boolean): boolean {
  return Object.entries(s.player.items).some(([id, n]) => n > 0 && hasItem(id) && test(id));
}

/** The named checks (content/codex/schema.ts, `MET_TESTS`); the UI-seen ones read false here. */
/** The named checks on the life, also read by a quest's step (core/journal.ts). */
export const MET: Readonly<Record<MetTest, (s: GameState) => boolean>> = {
  'qi-method': (s) => s.player.activeMethods.qi !== null,
  art: (s) => knownMethods(s.player, 'body').length + knownMethods(s.player, 'soul').length > 0,
  minor: (s) =>
    LADDER_IDS.some((k) => s.player[k].realm !== 'qi-condensation' || s.player[k].stage > 1),
  'major-near': (s) => LADDER_IDS.some((k) => nextStep(s.player[k]).kind === 'major'),
  stones: (s) =>
    s.player.stones +
      s.player.higherStones.mid +
      s.player.higherStones.high +
      s.player.higherStones.top >
    0,
  insight: (s) => s.player.insight.earned > 0,
  card: (s) => Object.keys(s.cards.drawn).length > 0 || s.cards.pending.length > 0,
  'came-back': () => false,
  lifespan: (s) => {
    const edge = lifespanEdgeDay(s.player);
    return s.calendar.day >= edge - (edge - s.player.bornDay) * 0.1;
  },
  technique: (s) => Object.keys(s.player.techniques).length > 0,
  mastery: (s) =>
    Object.keys(s.player.techniques).some((id) => mastery(s.player, id).level > 0) ||
    Object.keys(s.player.methods).some((id) => methodMastery(s.player, id).level > 0),
  line: (s) =>
    Object.keys(s.player.techniques).some((id) => hasTechnique(id) && !!technique(id).line),
  routine: (s) => s.player.routines.length > 0,
  foundation: (s) => LADDER_IDS.some((k) => s.player[k].realm !== 'qi-condensation'),
  node: (s) => s.player.nodes.length > 0,
  'breath-branch': (s) => s.player.nodes.some((id) => BREATH_NODES.has(id)),
  'dao-tree': (s) => shownTrees(s.player).some((t) => !!t.dao),
  'craft-tree': (s) => shownTrees(s.player).some((t) => !!t.craft),
  manual: (s) => s.player.manuals.length > 0,
  copy: (s) => ownedCopies(s.player).length > 0,
  intent: (s) => Object.keys(s.player.intent).length > 0,
  'treasure-slot': (s) => stats(s.player).treasureSlots > 0,
  'veiled-aura': (s) => s.player.nodes.includes('qi-veiled-aura'),
  item: (s) => Object.values(s.player.items).some((n) => n > 0),
  gear: (s) => {
    const g = s.player.gear;
    return !!(g.weapon || g.armor || g.ring || g.pouch || g.treasures.length);
  },
  pill: (s) => held(s, (id) => item(id).kind === 'pill'),
  bonded: (s) => held(s, (id) => ['blue', 'purple', 'gold', 'red'].includes(item(id).rarity)),
  ground: (s) => groundPiles(s).length > 0,
  offering: (s) => held(s, (id) => !!item(id).uses.offer),
  travelled: (s) => !!s.map?.course || (s.map?.trail.length ?? 0) > 1,
  encounter: (s) => s.chronicle.some((e) => e.type === 'encounter'),
  group: (s) => !!s.map?.group,
  site: () => false,
  posting: (s) => (s.map?.postings.length ?? 0) > 0,
  place: (s) => !!s.map?.inside,
  shop: () => false,
  member: (s) => s.world.members.some((m) => m.who === s.player.id),
  post: (s) => s.player.jobs.length > 0,
  marked: (s) => s.chronicle.some((e) => e.type === 'power' && e.data.what === 'marked'),
  follower: (s) => followersOf(s.world, s.player.id).length > 0,
  fight: (s) => !!s.fight || s.chronicle.some((e) => e.type === 'spar'),
  'fight-item': (s) => held(s, (id) => !!item(id).uses.fight),
  tool: (s) => held(s, (id) => item(id).kind === 'tool'),
  batch: (s) => s.player.crafts.recent.length > 0,
  quest: (s) => s.journal.quests.length > 0,
  dwelling: (s) => s.player.dwellings.length > 0,
  claimed: (s) => s.player.dwellings.some((d) => d.held === 'claimed'),
  array: (s) => held(s, (id) => !!item(id).uses.array) || MET.laid(s),
  laid: (s) => s.player.grounds.length > 0 || s.player.dwellings.some((d) => d.arrays.length > 0),
  prepared: (s) => s.player.grounds.length > 0,
  rogue: (s) =>
    s.player.origin?.choice === 'refuse' && !s.world.members.some((m) => m.who === s.player.id),
};

/** Whether the state shows an entry's feature met. */
export function metNow(s: GameState, met: CodexMet): boolean {
  if ('start' in met) return true;
  if ('screen' in met) return s.unlocks.includes(met.screen) || met.screen === 'settings';
  if ('first' in met) return s.lineage.firsts.includes(met.first);
  if ('guide' in met) return s.lineage.guides.includes(met.guide);
  return MET[met.test](s);
}

function meet(s: GameState, ids: readonly string[]): GameState {
  const fresh = ids.filter((id) => !(id in s.lineage.codex));
  if (fresh.length === 0) return s;
  const codex = { ...s.lineage.codex };
  for (const id of fresh) codex[id] = 'new';
  return { ...s, lineage: { ...s.lineage, codex } };
}

/**
 * Adds every entry whose feature the state now shows met, each new; the same state if none. Off
 * while a guided start is still on its first seclusion's guides, which add their own.
 */
export function noteCodex(s: GameState): GameState {
  const next = meet(
    s,
    CODEX.filter((e) => !(e.id in s.lineage.codex) && metNow(s, e.met)).map((e) => e.id),
  );
  // The journal opens with the first thing it holds, once the first seclusion's screen is built
  // (core/journal.ts opens it for a quest too).
  const opens = Object.keys(next.lineage.codex).length > 0 && built(next, 'rail');
  return opens ? unlock(next, 'journal') : next;
}

/** Meets the entries of a test the UI saw happen: a shop's counter, a coming-back story. */
export function meetCodex(s: GameState, test: MetTest): GameState {
  return meet(
    s,
    CODEX.filter((e) => 'test' in e.met && e.met.test === test).map((e) => e.id),
  );
}

/** Opens an entry: its dot goes. */
export function seeCodex(s: GameState, id: string): GameState {
  if (s.lineage.codex[id] !== 'new') return s;
  return { ...s, lineage: { ...s.lineage, codex: { ...s.lineage.codex, [id]: 'seen' } } };
}

/** The entries met, in the codex's order. */
export function codexMet(s: GameState): CodexEntry[] {
  return CODEX.filter((e) => e.id in s.lineage.codex);
}

export function codexNew(s: GameState): number {
  return Object.values(s.lineage.codex).filter((v) => v === 'new').length;
}

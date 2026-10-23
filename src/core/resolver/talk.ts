// People checks on real opinion (design § The resolver, People checks; § NPC basics; P3.4).
// Leverage is trust, the word their opinion of you reads, times an offer that meets a motive they
// truly have, proof shown and your standing with their power; resistance is suspicion, the leans
// that name the talk (Hand in a bargain, Trust against a lie, a quirk against a confession) and a
// trust the act needs. The true numbers decide; what you see is judged from what you know of them:
// the memories you know they hold, the motives and leans you have learned. Your renown counts to
// anyone who knows your name; a recruit's bond sets what it needs: loyalty asks friendly (P3.4b).
import { hasItem, item, itemKind, type Item } from '../../content/items.ts';
import { priceOf } from '../prices.ts';
import { craftTiersHeld } from '../crafts.ts';
import { CRAFT_IDS } from '../../content/crafts.ts';
import { CRAFT_RESPECT } from '../../content/goin.ts';
import {
  ALWAYS_SUSPICIOUS,
  BARGAIN_AXIS,
  BENEATH_EACH,
  LIE_AXIS,
  QUIRKS,
  type GiftKind,
  type Nature,
  type OfferId,
} from '../../content/personality.ts';
import { realmIndex } from '../../content/realms.ts';
import {
  ACTS,
  AGAINST_ASK,
  HOME_REGION,
  type ActInfo,
  type DeedKind,
  type TrustWord,
} from '../../content/resolver.ts';
import type { GameState } from '../state.ts';
import { realmOfActor, type Actor } from './actor.ts';
import { leverage, readRealm, resistance, verdict, type Verdict } from './check.ts';
import { knowsNature, seenNature } from './nature.ts';
import { axisFactor, lean, natureOf, opinion, trustLevel } from './opinion.ts';
import type { Step } from './plan.ts';
import { LOYALTY_NEEDS } from '../../content/bonds.ts';
import { fameOf, knowsName } from './names.ts';
import { knownDeeds, standingOf, statesOf, type World } from './world.ts';

/** Someone's nature in a scene: their own if the scene gave them one, else the world's. */
export function actorNature(w: World, a: Actor): Nature {
  return a.nature ?? natureOf(w, a.id);
}

/** Whether an offer meets them: one of their motives, or a quirk's way in. */
export function meetsOffer(n: Nature, offer: OfferId): boolean {
  if ((n.motives as string[]).includes(offer)) return true;
  return n.quirks.some((q) => (QUIRKS[q] as { offer?: OfferId }).offer === offer);
}

/** The key for knowing an offer meets them: their motive, or the quirk behind it. */
function offerKnown(w: World, id: string, n: Nature, offer: OfferId): boolean {
  if ((n.motives as string[]).includes(offer)) return knowsNature(w, id, `motive:${offer}`);
  const q = n.quirks.find((x) => (QUIRKS[x] as { offer?: OfferId }).offer === offer);
  return !!q && knowsNature(w, id, `quirk:${q}`);
}

/** "Beneath me": an arrogant one's live line while you show a lower realm than theirs. */
function beneath(n: Nature, speaker: Actor, listener: Actor): number {
  const p = lean(n, 'pride');
  if (p <= 0) return 0;
  const read = readRealm(listener, speaker);
  const shown = read.kind === 'beyond' ? null : read.realm;
  if (!shown) return 0;
  return realmIndex(shown.realm) < realmIndex(realmOfActor(listener).realm) ? BENEATH_EACH * p : 0;
}

/** What makes them suspicious: a deceit of yours they know, or a guarded nature. */
const SUSPECT: readonly DeedKind[] = ['lie', 'theft', 'frame', 'betrayal'];

export interface TalkCheck {
  yours: number;
  theirs: number;
  verdict: Verdict;
  /** The verdict you can judge from what you know of them. */
  judged: Verdict;
  trust: TrustWord;
  /** Their trust as you read it. */
  seenTrust: TrustWord;
}

/** Leverage against resistance, once with the truth and once with what the speaker knows. */
export function talkCheck(
  s: GameState,
  a: Actor,
  target: Actor,
  st: Step,
  region: string = HOME_REGION,
): TalkCheck {
  const w = s.world;
  const day = s.calendar.day;
  const info: ActInfo = ACTS[st.act];
  const n = actorNature(w, target);
  const seen = seenNature(w, target.id, n);
  const extra = beneath(n, a, target);
  const trust = opinion(w, target.id, a.id, day, { extra, nature: n }).word;
  const seenTrust = opinion(w, target.id, a.id, day, {
    viewer: a.id,
    extra: beneath(seen, a, target),
    nature: seen,
  }).word;
  const standing = target.power ? standingOf(w, target.power, a.id, day).leverage : 1;
  const held = st.prop !== undefined && (a.items[st.prop] ?? 0) > 0;
  const superstitious = (nn: Nature) =>
    nn.quirks.some((q) => (QUIRKS[q] as { prop?: string }).prop === 'talisman') &&
    (st.uses ?? []).some(
      (u) => (a.items[u] ?? 0) > 0 && hasItem(u) && itemKind(item(u)) === 'talisman',
    );
  const helpers = (st.helpers ?? []).length;
  const renown =
    !a.disguised &&
    statesOf(w, a.id, 'false-name', day).length === 0 &&
    fameOf(w, a.id, region, 'renown', day) >= 1 &&
    knowsName(w, target.id, a.id, region, day);
  const yoursFor = (word: TrustWord, met: boolean, nn: Nature) =>
    leverage({
      trust: word,
      motive: met,
      prop: held || superstitious(nn),
      standing,
      helpers,
      renown,
    });
  const met = st.offer !== undefined && meetsOffer(n, st.offer);
  const seenMet = st.offer !== undefined && met && offerKnown(w, target.id, n, st.offer);

  const suspicious = knownDeeds(w, target.id, a.id).some((d) => SUSPECT.includes(d.kind));
  const theirsFor = (nn: Nature) => {
    let factor = 1;
    if (info.resist === 'bargain') factor *= axisFactor(nn, BARGAIN_AXIS);
    if (info.lie) factor *= axisFactor(nn, LIE_AXIS);
    if (info.resist === 'confess') {
      for (const q of nn.quirks) factor *= (QUIRKS[q] as { confess?: number }).confess ?? 1;
    }
    const always = lean(nn, 'trust') <= ALWAYS_SUSPICIOUS;
    // A motive against the ask doubles it; what you see counts only the motives you have learned.
    const motive = AGAINST_ASK[st.act];
    const against = !!motive && nn.motives.includes(motive);
    return resistance({ suspicion: suspicious || always, against }) * factor;
  };
  // A crafter is respected (Jan, K1's talk; P3.9b): your best craft's grade adds to any ask.
  const craft = a.id === s.player.id ? craftRespect(s) : 1;
  const yours = yoursFor(trust, met, n) * craft;
  const theirs = theirsFor(n);
  const yoursSeen = yoursFor(seenTrust, seenMet, seen) * craft;
  const theirsSeen = theirsFor(seen);
  // An act that needs a trust they don't hold is refused whatever you bring.
  const needs =
    info.needs ?? (st.act === 'recruit' && st.bond === 'loyalty' ? LOYALTY_NEEDS : undefined);
  const short = (word: TrustWord) => needs !== undefined && trustLevel(word) < trustLevel(needs);
  return {
    yours,
    theirs,
    verdict: short(trust) ? 'short' : verdict(yours, theirs),
    judged: short(seenTrust) ? 'short' : verdict(yoursSeen, theirsSeen),
    trust,
    seenTrust,
  };
}

/** A crafter's standing in a talk: ×(1 + a tenth a grade of your best craft), to ×1.3. */
export function craftRespect(s: GameState): number {
  const g = bestCraftGrade(s);
  return 1 + Math.min(CRAFT_RESPECT.max, CRAFT_RESPECT.perGrade * g);
}

/** Your best craft's grade held, 0 for none. */
export function bestCraftGrade(s: GameState): number {
  return Math.max(0, ...CRAFT_IDS.map((c) => craftTiersHeld(s.player, c)));
}

// ── Gifts ────────────────────────────────────────────────────────────────────────────────────

/** What a gift is worth, in stones at its posted price (core/prices.ts), and what kind of thing it is. */
export function giftOf(thing: string, n: number): { worth: number; kind: GiftKind | undefined } {
  if (thing === 'stones') return { worth: n, kind: 'stones' };
  if (!hasItem(thing)) return { worth: n, kind: undefined };
  const it = item(thing);
  const worth = priceOf(thing) * n;
  return { worth, kind: giftKindOf(it) };
}

function giftKindOf(it: Item): GiftKind | undefined {
  switch (it.kind) {
    case 'gear': {
      const slot = (it.uses as { equip?: { slot?: string } }).equip?.slot;
      return slot === 'weapon' ? 'blades' : slot === 'armor' ? 'armor' : 'trinkets';
    }
    case 'pill':
      return 'pills';
    case 'talisman':
      return 'talismans';
    case 'herb':
      return 'herbs';
    case 'beast-part':
      return 'beast-cores';
    case 'manual':
      return 'manuals';
    case 'treasure':
    case 'vessel':
      return 'curios';
    case 'material':
      return 'trinkets';
    default:
      return undefined;
  }
}

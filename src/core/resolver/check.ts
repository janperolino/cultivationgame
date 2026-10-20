// The check (design § The resolver, No dice in a check; Jan's calls in P3.3's talk): a capability
// against a number, never a roll. A capability is a line sized as the sheet sizes it (body, qi or
// soul, through wounds), times Agility where it counts, times what helps: the stat that names it,
// a technique's mastery, the things used, the helpers, at most ×2 together. It faces their
// capability, a feature's realm or the site's. Clear at ×1.25, close at ×1, short below; a whole
// realm's step short is beyond you and can't be tried. What you see is what your character can
// judge: against someone whose realm you can't read the verdict shows "?".
import { REALMS, realmIndex } from '../../content/realms.ts';
import {
  BEYOND_RATIO,
  CAPABILITIES,
  CLEAR_RATIO,
  COMPOSURE,
  HELP_CAP,
  HELPER_EACH,
  HELPER_MAX,
  LIE_READ_REALMS,
  MASTERY_EACH,
  MASTERY_ORIGIN,
  MOTIVE_AGAINST,
  MOTIVE_MET,
  PIN_REALMS,
  PRESENCE,
  PROP,
  RENOWN_LEVERAGE,
  STANDING_RANGE,
  SUSPICION,
  TRUST,
  USE_EACH,
  USE_MAX,
  type CapabilityId,
  type TrustWord,
} from '../../content/resolver.ts';
import { agilityShare } from '../../content/combat.ts';
import { MAX_MASTERY } from '../../content/mastery.ts';
import { lineSize, realmOfActor, realmSizeOf, sizeAt, type Actor } from './actor.ts';
import { backerComposure } from './backers.ts';
import type { RealmStage } from './world.ts';

export type Verdict = 'clear' | 'close' | 'short';

/** Clear at ×1.25 theirs, close at ×1, short below. */
export function verdict(yours: number, theirs: number): Verdict {
  if (yours >= theirs * CLEAR_RATIO) return 'clear';
  return yours >= theirs ? 'close' : 'short';
}

/** Whether theirs stands a whole realm's step above yours: the step can't be tried. */
export function isBeyond(yours: number, theirs: number): boolean {
  return theirs >= yours * BEYOND_RATIO;
}

/** What helps a check. Each counts as its rule says, and together they multiply by at most ×2. */
export interface Help {
  /** The stat that names the check: 0.1 is ×1.1. */
  stat?: number;
  /** A technique the step uses, at its mastery level (0 Glimpse to 4 Origin). */
  mastery?: number;
  /** Scene features and items used, and features that favor the check. */
  uses?: number;
  helpers?: number;
}

/** ×1.05 a mastery level past Glimpse, ×1.25 at Origin. */
export function masteryHelp(level: number): number {
  return level >= MAX_MASTERY ? MASTERY_ORIGIN : MASTERY_EACH ** Math.max(0, level);
}

/** Everything that helps, multiplied and held to ×2. */
export function helpFactor(h: Help): number {
  const f =
    Math.max(0, 1 + (h.stat ?? 0)) *
    (h.mastery === undefined ? 1 : masteryHelp(h.mastery)) *
    USE_EACH ** Math.min(USE_MAX, h.uses ?? 0) *
    HELPER_EACH ** Math.min(HELPER_MAX, h.helpers ?? 0);
  return Math.min(HELP_CAP, f);
}

/** What Agility does to a check that counts it: 5% a point above 10. */
export function agilityFactor(agility: number): number {
  return agilityShare(agility);
}

export interface CapabilityOpts {
  /** A technique the step uses. */
  technique?: string;
  /** Things used and features in their favor. */
  uses?: number;
  helpers?: number;
  /** Held to a shown realm: what a veiled cultivator lets show. */
  at?: RealmStage;
}

/**
 * An actor's capability: its base line through their wounds, Agility where it counts, and what
 * helps. Presence's base here is their own realm; what someone else reads on them is `presence`.
 */
export function capability(a: Actor, id: CapabilityId, o: CapabilityOpts = {}): number {
  const info = CAPABILITIES[id];
  let base: number;
  switch (info.base) {
    case 'body':
    case 'qi':
    case 'soul':
      base = lineSize(a, info.base);
      break;
    case 'shown':
    case 'realm':
      base = realmSizeOf(a);
      break;
    case 'one':
      base = 1;
      break;
  }
  if (o.at && info.base !== 'one') base = Math.min(base, sizeAt(o.at));
  const agile = 'agility' in info && info.agility ? agilityFactor(a.agility) : 1;
  const stat = 'stat' in info && info.stat ? (a.stats[info.stat] ?? 0) : 0;
  const mastery = o.technique !== undefined ? a.techniques[o.technique] : undefined;
  return base * agile * helpFactor({ stat, mastery, uses: o.uses, helpers: o.helpers });
}

// ── Reading a realm ──────────────────────────────────────────────────────────────────────────

/** What one cultivator reads on another: their true realm, the realm they show, or beyond you. */
export type Read =
  { kind: 'true'; realm: RealmStage } | { kind: 'shown'; realm: RealmStage } | { kind: 'beyond' };

/**
 * Reading a realm is a comparison too: with your perception at or above their soul you read their
 * true realm; below it you read the realm they show if they veil it, or that they're beyond you.
 */
export function readRealm(observer: Actor, target: Actor): Read {
  if (capability(observer, 'perception') >= lineSize(target, 'soul')) {
    return { kind: 'true', realm: realmOfActor(target) };
  }
  if (target.shown) return { kind: 'shown', realm: target.shown };
  return { kind: 'beyond' };
}

/**
 * What a capability of theirs looks like to you: the true number when you read their realm, scaled
 * down to the realm they show when they veil it, or null ("?") when you can't read them. People
 * checks aren't sized by realm, so you always judge those.
 */
export function judgedOf(observer: Actor, target: Actor, id: CapabilityId, value: number) {
  if (CAPABILITIES[id].base === 'one') return value;
  const read = readRealm(observer, target);
  if (read.kind === 'true') return value;
  if (read.kind === 'beyond') return null;
  return value * Math.min(1, sizeAt(read.realm) / realmSizeOf(target));
}

// ── Intimidation ─────────────────────────────────────────────────────────────────────────────

export interface Backing {
  /** A weapon drawn: ×1.2, ×1.5 from gold. */
  weapon?: boolean;
  technique?: boolean;
  /** Your infamy, to someone who knows your name. */
  infamy?: boolean;
  /** Followers at your back. */
  followers?: number;
}

/**
 * The danger you show someone: the realm they read on you (beyond them counts as the next realm
 * up from theirs) times what backs it, held to ×2. Two realms above them, by the realm you show
 * (your own, unveiled), realm pressure pins them.
 */
export function presence(
  you: Actor,
  them: Actor,
  b: Backing = {},
): { value: number; pinned: boolean } {
  const read = readRealm(them, you);
  const theirs = realmOfActor(them);
  // Beyond them reads as the next realm's first stage; a veil shows only what it shows.
  const above = REALMS[Math.min(REALMS.length - 1, realmIndex(theirs.realm) + 1)]!.id;
  const size =
    read.kind === 'true'
      ? realmSizeOf(you)
      : read.kind === 'shown'
        ? sizeAt(read.realm)
        : sizeAt({ realm: above, stage: 1 });
  const weapon =
    b.weapon && you.weapon !== 'none'
      ? you.weapon === 'gold'
        ? PRESENCE.goldWeapon
        : PRESENCE.weapon
      : 1;
  const f =
    weapon *
    (b.technique ? PRESENCE.technique : 1) *
    (b.infamy ? PRESENCE.infamy : 1) *
    PRESENCE.follower ** Math.min(PRESENCE.followers, b.followers ?? 0) *
    (1 + (you.stats.intimidate ?? 0));
  // Realm pressure is felt, not read: it pins by the realm you truly show, veiled or not.
  const felt = you.shown ?? realmOfActor(you);
  const pinned = realmIndex(felt.realm) - realmIndex(theirs.realm) >= PIN_REALMS;
  return { value: size * Math.min(HELP_CAP, f), pinned };
}

/**
 * The safety someone feels: their realm times their sect or their backer, whichever stands taller,
 * their crew and despair, held to ×2.
 */
export function composure(them: Actor, crew = 0): number {
  const sect = backerComposure(them);
  const f =
    sect *
    COMPOSURE.crew ** Math.min(COMPOSURE.crews, crew) *
    (them.desperate ? COMPOSURE.desperate : 1);
  return realmSizeOf(them) * Math.min(HELP_CAP, f);
}

// ── People checks ────────────────────────────────────────────────────────────────────────────

/** What you bring to a talk. Until P3.4, trust is neutral and no motive is known. */
export interface LeverageOpts {
  trust?: TrustWord;
  /** An offer that meets one of their motives. */
  motive?: boolean;
  /** Proof or a prop shown: a token, a sect's robe. */
  prop?: boolean;
  /** Standing with their power, 0.5 at its worst to 1.5 at its best; 1 when unknown. */
  standing?: number;
  /** Your renown, to someone who knows your name: anyone honors renown (P3.4b). */
  renown?: boolean;
  /** The stat, talent or Way naming the check, and helpers: held to ×2 together. */
  stat?: number;
  helpers?: number;
}

export function leverage(o: LeverageOpts = {}): number {
  const standing = Math.min(STANDING_RANGE[1], Math.max(STANDING_RANGE[0], o.standing ?? 1));
  return (
    TRUST[o.trust ?? 'neutral'] *
    (o.motive ? MOTIVE_MET : 1) *
    (o.prop ? PROP : 1) *
    standing *
    (o.renown ? RENOWN_LEVERAGE : 1) *
    helpFactor({ stat: o.stat, helpers: o.helpers })
  );
}

/** What stands against it: a motive against it, suspicion of you, their own talents. */
export function resistance(o: { against?: boolean; suspicion?: boolean; stat?: number } = {}) {
  return (
    (o.against ? MOTIVE_AGAINST : 1) *
    (o.suspicion ? SUSPICION : 1) *
    Math.max(0, 1 + (o.stat ?? 0))
  );
}

/** A soul two realms above yours reads your lies. */
export function readsLies(listener: Actor, speaker: Actor): boolean {
  return (
    realmIndex(listener.rungs.soul.realm) - realmIndex(speaker.rungs.soul.realm) >= LIE_READ_REALMS
  );
}

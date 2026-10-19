// Scenes and time (design § The resolver, Scenes and time; P3.3). A scene is a place, the people
// there, its features and a clock in ticks, a quarter of a wheel hour each. Each round everyone
// present acts through the same resolver in Agility order: the players take their plan's next
// step, followers keep their orders and NPCs act on their motives (intent.ts) unless given a plan.
// A step is previewed with the verdict your character can judge and its stakes, then done: its
// check, its cost on a close pass, what a short one means, the deeds it makes and who saw them,
// the noise it makes. A noise rings out to its range, and while it rings someone arrives on the
// place's traffic schedule, who comes drawn from its people on the `scene` stream; the law comes
// when it answers. A fight is handed to the combat engine whole for now (P3.9 plays it as a mode
// of the scene). The world's clock stops in a scene; leaving adds its ticks to the clock, off the
// wheel. A scene takes a list of player actors, so co-op can drop in after v1. People checks read
// real opinion, motives and standing (talk.ts); the players learn the outer leans of everyone in
// the scene as it begins, and what moves anyone when they act on it. Followers keep their bonds
// (followers.ts), checked each round; the asked tell what they know (knows.ts); renown, infamy and
// karma move with the deeds (names.ts); traces and backers ride the actors (backers.ts).
import {
  ACTS,
  CAPABILITIES,
  CLOSE_WOUND,
  FREED_KARMA,
  HOME_REGION,
  MERCY_KARMA,
  COSTS,
  LAW,
  NOISE_LI,
  NOISE_LI_MAX,
  NOISE_TICKS,
  SHORTS,
  TICKS_PER_DAY,
  TRAFFIC,
  type ActInfo,
  type CapabilityId,
  type CostId,
  type DeedKind,
  type PlaceKind,
  type ShortId,
  type Traffic,
} from '../../content/resolver.ts';
import { realmIndex } from '../../content/realms.ts';
import { combatant, topRung, wearFrom } from '../combat/combatant.ts';
import { startFight } from '../combat/fight.ts';
import { runFight } from '../combat/profile.ts';
import { withStream, type GameState } from '../state.ts';
import { lowestShown, plainActor, realmOfActor, sizeAt, YOU, type Actor } from './actor.ts';
import {
  capability,
  composure,
  isBeyond,
  judgedOf,
  presence,
  readRealm,
  readsLies,
  verdict,
  type Read,
  type Verdict,
} from './check.ts';
import { applyEffects, type Effect } from './effects.ts';
import { eraseNumbers, knowsErasing, leaveTrace, strongestTrace, talismanOf } from './backers.ts';
import { bondOf, checkBonds, wageFor, type BondBreak } from './followers.ts';
import { intentOf } from './intent.ts';
import { believesDead, currentPlaces, foundAlive, hear, telling } from './knows.ts';
import { fameOf, knowsName } from './names.ts';
import { meetingShows, revealNature } from './nature.ts';
import { contest, remember, tieOf } from './opinion.ts';
import { actorNature, giftOf, talkCheck } from './talk.ts';
import type { Plan, Step } from './plan.ts';
import {
  healWounds,
  learn,
  projectById,
  recordDeed,
  soulLamp,
  statesOf,
  updateState,
  workProject,
  addProject,
  discover,
  type Learner,
  type RealmStage,
} from './world.ts';
import { keepThreaded, noteTaken, npcFrom } from '../kept.ts';
import { opensRing, ringOf, ringTier, type Haul } from '../loot.ts';

/** A thing in the scene that can be used, searched, broken or hidden behind. */
export interface SceneFeature {
  id: string;
  name: string;
  tags: string[];
  /** Its own realm, for a check with no opponent: "a sheer karst wall, Foundation". */
  realm?: RealmStage;
  /** Capabilities it counts for, as a thing used: darkness for stealth. */
  favors?: CapabilityId[];
  /** Found only by a search. */
  hidden?: boolean;
  /** Broken, opened or spent. */
  broken?: boolean;
}

export interface Scene {
  /** An atlas or site id, and the power it answers to. */
  place: string;
  power: string | null;
  /** The region it stands in, whose renown and infamy its deeds move. */
  region: string;
  kind: PlaceKind;
  traffic: Traffic;
  /** The site's danger realm, what a check with no opponent faces. */
  danger: RealmStage;
  /** An open scene carries no stakes: people drift in at the place's traffic. */
  open: boolean;
  features: SceneFeature[];
  actors: Actor[];
  /** The player actors, by id. */
  players: string[];
  /** Who can arrive, in the order the table holds them. */
  table: Actor[];
  /** Ticks since the scene began. */
  tick: number;
  /** A noise ringing out this far, until this tick. */
  noise: { li: number; until: number } | null;
  /** The tick someone called by a noise or an open scene arrives, once called. */
  due: number | null;
  /** The tick the law arrives, once called. */
  lawDue: number | null;
  log: string[];
}

export interface SceneInit {
  place: string;
  power?: string | null;
  region?: string;
  kind?: PlaceKind;
  traffic?: Traffic;
  danger?: RealmStage;
  open?: boolean;
  features?: SceneFeature[];
  actors: Actor[];
  players?: string[];
  table?: Actor[];
}

export function startScene(init: SceneInit): Scene {
  return {
    place: init.place,
    power: init.power ?? null,
    region: init.region ?? HOME_REGION,
    kind: init.kind ?? 'wilds',
    traffic: init.traffic ?? 'wilds',
    danger: init.danger ?? { realm: 'qi-condensation', stage: 1 },
    open: init.open ?? false,
    features: init.features ?? [],
    actors: init.actors,
    players:
      init.players ??
      init.actors
        .filter((a) => a.side === YOU)
        .map((a) => a.id)
        .slice(0, 1),
    table: init.table ?? [],
    tick: 0,
    noise: null,
    due: null,
    lawDue: null,
    log: [],
  };
}

export function actorIn(scene: Scene, id: string): Actor | undefined {
  return scene.actors.find((a) => a.id === id);
}

/** Present: in the scene and able to act or see, hidden included. */
function active(a: Actor): boolean {
  return a.state === 'present' || a.state === 'hidden';
}

/** Who opposes an actor and can see: present, awake, on another side and not the law's prisoner. */
function watchers(scene: Scene, a: Actor): Actor[] {
  return scene.actors.filter((o) => o.side !== a.side && o.state === 'present');
}

function learner(a: Actor): Learner {
  return { id: a.id, power: a.power ?? null };
}

// ── The check a step makes ───────────────────────────────────────────────────────────────────

export interface StepCheck {
  yours: number;
  theirs: number;
  verdict: Verdict;
  /** What your character can judge: "?" against someone whose realm you can't read. */
  judged: Verdict | '?';
  /** Judged a whole realm's step short: the step can't be tried. */
  beyond: boolean;
  /** Who it faced, if anyone. */
  faced: string[];
  /** Realm pressure pinned them: two realms above, past a threat. */
  pinned?: boolean;
  /** A lie to a soul two realms above yours: it fails, and they know. */
  read?: boolean;
}

/** The things a step uses that count: features that are there, items held, a technique known. */
function usesCounted(scene: Scene, a: Actor, s: Step, cap: CapabilityId) {
  let uses = 0;
  let technique: string | undefined;
  for (const u of s.uses ?? []) {
    if (a.techniques[u] !== undefined) technique ??= u;
    else if ((a.items[u] ?? 0) > 0) uses += 1;
    else if (scene.features.some((f) => f.id === u && !f.hidden && !f.broken)) uses += 1;
  }
  const favoring = scene.features.filter((f) => !f.broken && f.favors?.includes(cap)).length;
  return { uses: uses + favoring, technique };
}

/** The realm a check faces with no opponent: the targeted feature's own, else the site's. */
function facedRealm(scene: Scene, target?: string): RealmStage {
  return scene.features.find((f) => f.id === target)?.realm ?? scene.danger;
}

/** A capability for a step: its group's worst at stealth, held to the shown realm when veiled. */
function stepCapability(scene: Scene, a: Actor, s: Step, cap: CapabilityId): number {
  const { uses, technique } = usesCounted(scene, a, s, cap);
  const helpers = (s.helpers ?? []).filter((h) => {
    const x = actorIn(scene, h);
    return x && active(x) && x.side === a.side;
  }).length;
  const at = s.manner === 'veiled' && a.shown ? a.shown : undefined;
  const own = capability(a, cap, { technique, uses, helpers, at });
  if (cap !== 'stealth' || !s.group?.length) return own;
  const members = s.group.map((g) => actorIn(scene, g)).filter((x): x is Actor => !!x);
  return Math.min(own, ...members.map((m) => capability(m, cap, { uses })));
}

/** The check a step would make, or null when the act has none. */
export function checkFor(s: GameState, scene: Scene, a: Actor, st: Step): StepCheck | null {
  const info: ActInfo = ACTS[st.act];
  const target = st.target ? actorIn(scene, st.target) : undefined;

  // Erasing a trace: your soul against its strength.
  if (st.act === 'erase') {
    const trace = target ? strongestTrace(s.world, target.id, s.calendar.day) : undefined;
    if (!trace) return null;
    const { yours, theirs } = eraseNumbers(a, trace);
    const v = verdict(yours, theirs);
    return { yours, theirs, verdict: v, judged: v, beyond: isBeyond(yours, theirs), faced: [] };
  }

  // Recruiting by fear is a threat, not a talk.
  const byFear = st.act === 'recruit' && st.bond === 'fear';
  if (info.people && !byFear) {
    if (!target) return null;
    if (info.lie && readsLies(target, a)) {
      return {
        yours: 0,
        theirs: 1,
        verdict: 'short',
        judged: 'short',
        beyond: false,
        faced: [target.id],
        read: true,
      };
    }
    const t = talkCheck(s, a, target, st, scene.region);
    return {
      yours: t.yours,
      theirs: t.theirs,
      verdict: t.verdict,
      judged: t.judged,
      beyond: false,
      faced: [target.id],
    };
  }

  const check = byFear ? ({ yours: 'presence', faces: 'composure' } as const) : info.check;
  if (!check) return null;

  if (check.yours === 'presence') {
    if (!target) return null;
    const show = st.show ?? [];
    const followers = scene.actors.filter(
      (x) => x.follows === a.id && x.state === 'present',
    ).length;
    const p = presence(a, target, {
      weapon: show.includes('weapon'),
      technique: show.includes('technique'),
      followers,
      infamy: infamous(s, scene, a, target),
    });
    const crew = scene.actors.filter(
      (x) => x.side === target.side && x.id !== target.id && x.state === 'present',
    ).length;
    const theirs = composure(target, crew);
    const v = p.pinned ? 'clear' : verdict(p.value, theirs);
    return {
      yours: p.value,
      theirs,
      verdict: v,
      judged: v,
      beyond: false,
      faced: [target.id],
      pinned: p.pinned,
    };
  }

  const yours = stepCapability(scene, a, st, check.yours);
  if (check.faces === 'feature' || check.faces === 'site') {
    const theirs = sizeAt(facedRealm(scene, st.target));
    const v = verdict(yours, theirs);
    return { yours, theirs, verdict: v, judged: v, beyond: isBeyond(yours, theirs), faced: [] };
  }

  // Against people: the target, or everyone watching; the strongest of them is what you face.
  const cap = check.faces;
  const faced = target ? [target] : watchers(scene, a);
  if (faced.length === 0) {
    return { yours, theirs: 0, verdict: 'clear', judged: 'clear', beyond: false, faced: [] };
  }
  let theirs = 0;
  let judgedTheirs: number | null = 0;
  for (const o of faced) {
    const { uses } = usesCounted(scene, o, { verb: 'look', act: 'look-around' }, cap);
    const value = capability(o, cap, { uses });
    theirs = Math.max(theirs, value);
    const j = judgedOf(a, o, cap, value);
    judgedTheirs = j === null || judgedTheirs === null ? null : Math.max(judgedTheirs, j);
  }
  const v = verdict(yours, theirs);
  const judged = judgedTheirs === null ? '?' : verdict(yours, judgedTheirs);
  const beyond = judgedTheirs !== null && isBeyond(yours, judgedTheirs);
  return { yours, theirs, verdict: v, judged, beyond, faced: faced.map((o) => o.id) };
}

// ── Preview: what you see before you act ─────────────────────────────────────────────────────

export interface StepPreview {
  act: Step['act'];
  /** Why it can't be tried at all, or null. */
  refused: string | null;
  check: StepCheck | null;
  /** The verdict shown: what your character can judge. */
  judged: Verdict | '?' | null;
  cost: CostId | null;
  short: ShortId | null;
  /** "sneak past · close · it makes noise · if short: you are caught" */
  line: string;
}

/** Why a step can't be tried, by scale, by what you hold or by what the act needs; null if it can. */
function refusal(
  s: GameState,
  scene: Scene,
  a: Actor,
  st: Step,
  check: StepCheck | null,
): string | null {
  const info: ActInfo = ACTS[st.act];
  if (info.waits) return `${info.name} waits for ${info.waits}`;
  if (!active(a)) return `${a.name} can't act`;
  for (const u of st.uses ?? []) {
    const held = (a.items[u] ?? 0) > 0 || a.techniques[u] !== undefined;
    const there = scene.features.some((f) => f.id === u && !f.hidden && !f.broken);
    if (!held && !there) return `there is no ${u} to use`;
  }
  if (st.prop && !(a.items[st.prop] ?? 0)) return `you don't hold ${st.prop}`;
  if (info.target === 'person' && (!st.target || !actorIn(scene, st.target)))
    return 'nobody to aim it at';
  if (info.target === 'feature' && !scene.features.some((f) => f.id === st.target && !f.hidden)) {
    return 'nothing like that here';
  }
  if (info.target === 'project' && !projectById(s.world, st.target ?? '')) return 'no such project';
  if (st.act === 'veil' && (a.stats.concealment ?? 0) <= 0)
    return 'you have no way to hide your realm';
  if (st.act === 'erase') {
    if (!knowsErasing(a, scene.players.includes(a.id)))
      return "you don't know how to erase a trace";
    if (!check) return 'no trace to erase';
  }
  const aimed = st.target ? actorIn(scene, st.target) : undefined;
  if (st.act === 'recruit' && aimed) {
    if (aimed.follows === a.id) return 'they already follow you';
    const bond = st.bond ?? 'pay';
    if (bond === 'pay' && a.stones < wageFor(aimed)) {
      return `you can't pay their wage, ${wageFor(aimed)} stones a month`;
    }
    if (bond === 'goal' && !projectById(s.world, st.goal ?? '')) return 'no goal to share';
  }
  if (check?.beyond) return 'beyond you: a whole realm short';
  const target = st.target ? actorIn(scene, st.target) : undefined;
  if (info.from && target) {
    const t = tieOf(s.world, a.id, target.id);
    if (!t || !info.from.includes(t)) return `only from ${info.from.join(' or ')}`;
  }
  if (
    info.above &&
    target &&
    realmIndex(realmOfActor(a).realm) <= realmIndex(realmOfActor(target).realm)
  ) {
    return 'you need a realm above them';
  }
  return null;
}

export function previewStep(s: GameState, scene: Scene, actorId: string, st: Step): StepPreview {
  const a = actorIn(scene, actorId);
  const info: ActInfo = ACTS[st.act];
  if (!a) {
    return {
      act: st.act,
      refused: 'nobody',
      check: null,
      judged: null,
      cost: null,
      short: null,
      line: '',
    };
  }
  const check = projectCheck(s, a, st) ?? checkFor(s, scene, a, st);
  const refused = refusal(s, scene, a, st, check);
  const cost = (st.cost ?? info.costs?.[0] ?? null) as CostId | null;
  const short = (info.short ?? null) as ShortId | null;
  const parts: string[] = [info.name];
  if (refused) parts.push(refused);
  else if (check) {
    parts.push(check.judged);
    if (check.judged !== 'clear' && cost) parts.push(COSTS[cost]);
    if (check.judged !== 'clear' && short) parts.push(`if short: ${SHORTS[short]}`);
  }
  return {
    act: st.act,
    refused,
    check,
    judged: check?.judged ?? null,
    cost,
    short,
    line: parts.join(' · '),
  };
}

/** A project step's check: its capability against the realm it names. */
function projectCheck(s: GameState, a: Actor, st: Step): StepCheck | null {
  if (st.act !== 'step') return null;
  const p = projectById(s.world, st.target ?? '');
  if (!p?.check) return null;
  const yours = capability(a, p.check.yours);
  const theirs = sizeAt(p.check.faces);
  const v = verdict(yours, theirs);
  return { yours, theirs, verdict: v, judged: v, beyond: isBeyond(yours, theirs), faced: [] };
}

// ── Doing a step ─────────────────────────────────────────────────────────────────────────────

export interface StepResult {
  actor: string;
  step: Step;
  refused: string | null;
  check: StepCheck | null;
  /** The cost a close pass paid. */
  cost: CostId | null;
  /** What a short verdict meant. */
  short: ShortId | null;
  /** Ticks it took. */
  ticks: number;
  /** What a reading of a realm saw. */
  read?: Read;
  /** Deeds it made, by id. */
  deeds: number[];
  /** Something you didn't see coming: a misjudged verdict, a cover blown. */
  surprise: string | null;
  /** How a fight it started ended: the side standing, or null for a draw. */
  fight?: { winner: string | null; turns: number };
}

interface Working {
  s: GameState;
  scene: Scene;
  deeds: number[];
  surprise: string | null;
}

function apply(w: Working, effects: Effect[]): void {
  const r = applyEffects(w.s, w.scene, effects);
  w.s = r.state;
  w.scene = r.scene!;
}

/**
 * Whether your infamy backs a threat: you have some in the scene's region, they know your name,
 * and no disguise or false name hides it.
 */
function infamous(s: GameState, scene: Scene, a: Actor, them: Actor): boolean {
  const day = s.calendar.day;
  if (a.disguised || statesOf(s.world, a.id, 'false-name', day).length > 0) return false;
  return (
    fameOf(s.world, a.id, scene.region, 'infamy', day) >= 1 &&
    knowsName(s.world, them.id, a.id, scene.region, day)
  );
}

function setActor(w: Working, id: string, f: (a: Actor) => Actor): void {
  w.scene = { ...w.scene, actors: w.scene.actors.map((a) => (a.id === id ? f(a) : a)) };
}

function note(w: Working, line: string): void {
  w.scene = { ...w.scene, log: [...w.scene.log, line] };
}

/** Makes a noise at an actor's realm, ringing for a while. */
function makeNoise(w: Working, loudest: Actor, ticks = NOISE_TICKS): void {
  const li = NOISE_LI[realmOfActor(loudest).realm] ?? NOISE_LI_MAX;
  const until = w.scene.tick + ticks;
  const n = w.scene.noise;
  w.scene = {
    ...w.scene,
    noise: { li: Math.max(li, n?.li ?? 0), until: Math.max(until, n?.until ?? 0) },
  };
}

/** Deeds the law doesn't come for. */
const LAWFUL: readonly DeedKind[] = ['rescue', 'victory', 'mission', 'death'];

/** Records a deed with its witnesses and calls the law if anyone saw it. */
function deed(
  w: Working,
  a: Actor,
  kind: DeedKind,
  seenBy: Actor[],
  victim?: Actor,
  evidence: string[] = [],
) {
  const r = recordDeed(
    w.s.world,
    {
      kind,
      actor: a.id,
      victim: victim?.id ?? null,
      place: w.scene.place,
      power: victim?.power ?? w.scene.power,
      evidence,
      witnesses: seenBy.filter((x) => x.id !== a.id).map(learner),
      region: w.scene.region,
      weaker:
        !!victim && realmIndex(realmOfActor(victim).realm) < realmIndex(realmOfActor(a).realm),
    },
    w.s.calendar.day,
  );
  w.s = { ...w.s, world: r.world };
  w.deeds.push(r.id);
  const law = LAW[w.scene.kind];
  if (law && !LAWFUL.includes(kind) && seenBy.length > 0 && w.scene.lawDue === null) {
    w.scene = { ...w.scene, lawDue: w.scene.tick + law.ticks };
  }
  return r.id;
}

/** The best-placed watcher, who sees when a close pass costs a witness. */
function sharpest(scene: Scene, a: Actor, among: Actor[]): Actor | undefined {
  return (
    [...among].sort((x, y) => capability(y, 'perception') - capability(x, 'perception'))[0] ??
    watchers(scene, a)[0]
  );
}

/** The cover a holder keeps, if any. */
function coverOf(s: GameState, id: string) {
  return statesOf(s.world, id, 'cover', s.calendar.day)[0];
}

/**
 * A cover blown: everyone it fooled and everyone watching learns, the exposure heats their powers,
 * and those it fooled will remember the lie (P3.4).
 */
function blowCover(w: Working, a: Actor, why: string, seenBy: Actor[]): void {
  const cover = coverOf(w.s, a.id);
  if (!cover || cover.data.kind !== 'cover') return;
  const fooled = cover.data.fooled;
  const learners = [...seenBy];
  for (const id of fooled) {
    const x = actorIn(w.scene, id);
    if (x && !learners.includes(x)) learners.push(x);
  }
  deed(w, a, 'exposure', learners);
  // Those it fooled learn the lie: the lies told them land as memories, or the cover itself does.
  const day = w.s.calendar.day;
  for (const id of fooled) {
    const x = actorIn(w.scene, id);
    const here = !!x && learners.includes(x);
    const lies = w.s.world.deeds.filter(
      (d) => d.kind === 'lie' && d.actor === a.id && d.victim === id,
    );
    let world = w.s.world;
    for (const d of lies) world = learn(world, d.id, x ? learner(x) : { id }, true, day, here);
    if (lies.length === 0) {
      world = remember(
        world,
        { holder: id, about: a.id, row: 'lied', known: here ? [a.id] : [] },
        day,
      );
    }
    w.s = { ...w.s, world };
  }
  apply(w, [{ do: 'state-break', id: cover.id, why }]);
  setActor(w, a.id, (x) => ({ ...x, shown: undefined }));
  w.surprise ??= `${a.name}'s cover is blown: ${why}`;
  note(w, `${a.name}'s cover is blown: ${why}.`);
}

function inspectInto(w: Working, observerId: string, targetId: string): void {
  const o = actorIn(w.scene, observerId);
  const t = actorIn(w.scene, targetId);
  if (!o || !t || o.side === t.side) return;
  // A disguise fools anyone who doesn't know your face; one who does sees through it with
  // perception at or above your stealth.
  if (
    t.disguised &&
    o.knows?.includes(t.id) &&
    capability(o, 'perception') >= capability(t, 'stealth')
  ) {
    const d = statesOf(w.s.world, t.id, 'disguise', w.s.calendar.day)[0];
    if (d) apply(w, [{ do: 'state-break', id: d.id, why: `${o.name} knows your face` }]);
    setActor(w, t.id, (x) => ({ ...x, disguised: false }));
    w.surprise ??= `${o.name} recognizes ${t.name}`;
    note(w, `${o.name} recognizes ${t.name}.`);
  }
  if (!t.shown) return;
  const read = readRealm(o, t);
  if (read.kind === 'true') {
    blowCover(w, t, `${o.name} sees through it`, [o]);
    return;
  }
  const cover = coverOf(w.s, t.id);
  if (cover?.data.kind === 'cover' && !cover.data.fooled.includes(o.id)) {
    w.s = {
      ...w.s,
      world: updateState(w.s.world, {
        ...cover,
        data: { ...cover.data, fooled: [...cover.data.fooled, o.id] },
      }),
    };
  }
}

/** Acting above your shown realm where someone sees it tests the cover. */
function testCoverByAct(
  w: Working,
  a: Actor,
  st: Step,
  check: StepCheck | null,
  hidden: boolean,
): void {
  if (!a.shown || st.manner === 'veiled' || hidden || !check) return;
  const info: ActInfo = ACTS[st.act];
  const cap = info.check?.yours;
  if (!cap) return;
  const base = CAPABILITIES[cap].base;
  const line =
    base === 'body' || base === 'qi' || base === 'soul'
      ? capability(a, cap) / capability(a, cap, { at: a.shown })
      : 1;
  if (line <= 1) return;
  const seen = watchers(w.scene, a);
  if (seen.length > 0) blowCover(w, a, `${a.name} acted above the realm shown`, seen);
}

/**
 * Asked, they tell what their trust in you opens: the deeds they know of you learn who did, and the
 * rest you hear, true or a lie, until you see it for yourself (knows.ts).
 */
function asked(w: Working, a: Actor, target: Actor) {
  const day = w.s.calendar.day;
  const n = actorNature(w.s.world, target);
  const t = telling(w.s.world, currentPlaces(), target.id, a.id, day, n);
  let world = w.s.world;
  const deeds = t.lie ? [] : t.facts.filter((f) => f.startsWith('deed:'));
  for (const f of deeds) world = learn(world, Number(f.slice(5)), learner(a), true, day);
  const rest = t.facts.filter((f) => !f.startsWith('deed:'));
  world = hear(world, rest, target.id, day, !t.lie);
  note(
    w,
    t.refused
      ? `${target.name} won't say.`
      : t.lie
        ? `${target.name} claims to know nothing.`
        : `${target.name} tells what they know (${t.facts.length}).`,
  );
  return world;
}

/**
 * Healing: someone down stands again, a life saved that they remember and heaven counts, seen by
 * whoever stands there; someone hurt remembers being healed, a small mercy if they are weaker.
 */
function heal(w: Working, a: Actor, target: Actor): void {
  if (target.state === 'down') {
    setActor(w, target.id, (x) => ({
      ...x,
      state: 'present',
      combatant: x.combatant
        ? { ...x.combatant, hp: Math.max(1, Math.round(x.combatant.maxHp * 0.25)) }
        : x.combatant,
    }));
    const saw = [...watchers(w.scene, a), actorIn(w.scene, target.id)!].filter(
      (x) => x.state === 'present',
    );
    deed(w, a, 'rescue', saw, target);
    return;
  }
  const c = target.combatant;
  if (target.wound <= 0 && !(c && c.hp < c.maxHp)) return;
  apply(w, [{ do: 'memory', who: target.id, about: a.id, row: 'healed' }]);
  if (realmIndex(realmOfActor(target).realm) < realmIndex(realmOfActor(a).realm)) {
    apply(w, [{ do: 'karma', who: a.id, n: MERCY_KARMA }]);
  }
}

/**
 * Why a follower won't carry out an order, or null: nobody takes one beyond them, and the paid
 * won't fight anyone they read above them; the loyal, the afraid and the goal-bound take the rest.
 */
export function orderRefusal(s: GameState, scene: Scene, f: Actor, st: Step): string | null {
  const b = bondOf(s.world, f.id);
  if (!b) return null;
  const pv = previewStep(s, scene, f.id, st);
  if (pv.check?.beyond) return 'beyond them';
  const target = st.target ? actorIn(scene, st.target) : undefined;
  if (b.kind === 'pay' && (ACTS[st.act] as ActInfo).fight && target) {
    const r = readRealm(f, target);
    if (r.kind === 'beyond' || realmIndex(r.realm.realm) > realmIndex(realmOfActor(f).realm)) {
      return "they aren't paid to die";
    }
  }
  return null;
}

/** Does one step for one actor: its check, cost, outcome, deeds and noise. The clock is the round's. */
export function doStep(
  s: GameState,
  scene: Scene,
  actorId: string,
  st: Step,
): {
  state: GameState;
  scene: Scene;
  result: StepResult;
} {
  const preview = previewStep(s, scene, actorId, st);
  const info: ActInfo = ACTS[st.act];
  const w: Working = { s, scene, deeds: [], surprise: null };
  const result = (extra: Partial<StepResult> = {}): StepResult => ({
    actor: actorId,
    step: st,
    refused: preview.refused,
    check: preview.check,
    cost: null,
    short: null,
    ticks: info.ticks ?? 1,
    deeds: w.deeds,
    surprise: w.surprise,
    ...extra,
  });
  if (preview.refused) {
    return { state: s, scene, result: { ...result(), ticks: 0 } };
  }
  const a = actorIn(scene, actorId)!;
  const target = st.target ? actorIn(scene, st.target) : undefined;
  const check = preview.check;
  const v: Verdict = check?.verdict ?? 'clear';
  if (check && check.judged !== '?' && check.judged !== v) {
    w.surprise = `it went ${v}, not ${check.judged}`;
  }
  let ticks = info.ticks ?? 1;
  let cost: CostId | null = null;
  let short: ShortId | null = null;
  const faced = (check?.faced ?? []).map((id) => actorIn(w.scene, id)!).filter(Boolean);
  let seenBy: Actor[] = [];

  if (v === 'close') {
    cost = preview.cost;
    switch (cost) {
      case 'time':
        ticks *= 2;
        break;
      case 'witness': {
        const x = sharpest(w.scene, a, faced);
        if (x) seenBy = [x];
        break;
      }
      case 'wound':
        apply(w, [{ do: 'wound', who: a.id, share: CLOSE_WOUND.share, days: CLOSE_WOUND.days }]);
        break;
      case 'heat':
        apply(w, [{ do: 'heat', holder: w.scene.place, n: 1 }]);
        break;
      case 'spent': {
        const used = (st.uses ?? []).find((u) => (a.items[u] ?? 0) > 0);
        if (used) apply(w, [{ do: 'item', who: a.id, id: used, n: -1, how: 'broken' }]);
        else {
          const f = (st.uses ?? []).find((u) => w.scene.features.some((x) => x.id === u));
          if (f)
            w.scene = {
              ...w.scene,
              features: w.scene.features.map((x) => (x.id === f ? { ...x, broken: true } : x)),
            };
        }
        break;
      }
      case 'trust':
        if (target) {
          apply(w, [
            {
              do: 'memory',
              who: target.id,
              about: a.id,
              row: 'bad-turn',
              value: -5,
              note: 'Pressed me hard',
            },
          ]);
        }
        break;
      case 'noise':
        makeNoise(w, a);
        break;
      case null:
        break;
    }
  }
  if (v === 'short') {
    short = preview.short;
    if (short === 'caught' || short === 'noticed' || short === 'seen-through') seenBy = faced;
  }

  const passed = v !== 'short';
  const youAre = (x: Actor) => w.s.player.id === x.id;
  const thing = st.thing ?? 'stones';
  const n = st.n ?? 1;

  // What the act does.
  switch (st.act) {
    case 'steal':
    case 'rob':
      if (passed && target) {
        const have = thing === 'stones' ? target.stones : (target.items[thing] ?? 0);
        const took = Math.min(have, thing === 'stones' ? (st.n ?? have) : n);
        if (took > 0) {
          apply(
            w,
            thing === 'stones'
              ? [
                  { do: 'stones', who: target.id, n: -took },
                  { do: 'stones', who: a.id, n: took },
                ]
              : [
                  { do: 'item', who: target.id, id: thing, n: -took, how: 'lost' },
                  { do: 'item', who: a.id, id: thing, n: took, how: 'gained' },
                ],
          );
          // What you take is pinned on them, and theirs becomes stolen goods (core/kept.ts).
          if (youAre(a)) {
            const items = thing === 'stones' ? {} : { [thing]: took };
            const stones = thing === 'stones' ? took : 0;
            w.s = { ...w.s, world: noteTaken(w.s.world, target, items, stones, w.scene.place) };
          }
        }
        // A robbery is done to someone's face: they know who.
        if (st.act === 'rob') seenBy = [...new Set([...seenBy, ...watchers(w.scene, a)])];
      }
      break;
    case 'burgle':
      // What a burglary takes is the place's, so it simply comes to you.
      if (passed && st.thing && st.thing !== 'stones') {
        apply(w, [{ do: 'item', who: a.id, id: st.thing, n, how: 'gained' }]);
      } else if (passed && st.thing === 'stones') apply(w, [{ do: 'stones', who: a.id, n }]);
      break;
    case 'loot':
      if (target && (target.state === 'down' || target.state === 'dead')) {
        const effects: Effect[] = [];
        for (const [id, k] of Object.entries(target.items)) {
          if (k > 0) {
            effects.push({ do: 'item', who: target.id, id, n: -k, how: 'lost' });
            effects.push({ do: 'item', who: a.id, id, n: k, how: 'gained' });
          }
        }
        if (target.stones > 0) {
          effects.push(
            { do: 'stones', who: target.id, n: -target.stones },
            { do: 'stones', who: a.id, n: target.stones },
          );
        }
        // A storage ring opens on the spot to a realm at its tier; otherwise it stays sealed.
        const ring = youAre(a) ? ringHaul(target) : null;
        let opened: Record<string, number> = {};
        if (ring && (target.items['storage-ring'] ?? 0) > 0) {
          const tier = ringTier('storage-ring', target.npc?.realm ?? topRung(target).realm);
          if (opensRing(w.s.player, tier)) {
            opened = ring.items;
            for (const [id, k] of Object.entries(ring.items)) {
              effects.push({ do: 'item', who: a.id, id, n: k, how: 'gained' });
            }
            if (ring.stones > 0) effects.push({ do: 'stones', who: a.id, n: ring.stones });
          } else {
            const sealed = { from: target.id, name: target.name, tier, ...ring };
            w.s = { ...w.s, world: { ...w.s.world, sealed: [...w.s.world.sealed, sealed] } };
          }
        }
        apply(w, effects);
        if (youAre(a)) {
          const took = Object.fromEntries(Object.entries(target.items).filter(([, k]) => k > 0));
          for (const [id, k] of Object.entries(opened)) took[id] = (took[id] ?? 0) + k;
          w.s = {
            ...w.s,
            world: noteTaken(w.s.world, target, took, target.stones, w.scene.place),
          };
        }
      }
      break;
    case 'buy':
    case 'sell':
    case 'pay':
    case 'gift':
    case 'bribe':
    case 'ransom':
    case 'deliver':
      if (target) {
        const effects: Effect[] =
          thing === 'stones'
            ? [
                { do: 'stones', who: a.id, n: -n },
                { do: 'stones', who: target.id, n },
              ]
            : [
                { do: 'item', who: a.id, id: thing, n: -n, how: 'lost' },
                { do: 'item', who: target.id, id: thing, n, how: 'gained' },
              ];
        apply(w, effects);
        if (st.act === 'gift') {
          const g = giftOf(thing, n);
          apply(w, [
            {
              do: 'memory',
              who: target.id,
              about: a.id,
              row: 'gift',
              value: g.worth,
              like: g.kind,
            },
          ]);
        } else if (st.act === 'pay' || st.act === 'buy') {
          apply(w, [{ do: 'memory', who: target.id, about: a.id, row: 'paid-fairly' }]);
        } else if (st.act === 'ransom' && st.about && st.about !== a.id) {
          // Paying for someone else's freedom: heaven counts it, and they go free.
          apply(w, [{ do: 'karma', who: a.id, n: FREED_KARMA }]);
          for (const c of w.s.world.states) {
            if (c.data.kind === 'captive' && c.data.held === st.about) {
              apply(w, [{ do: 'state-break', id: c.id, why: 'ransomed' }]);
            }
          }
        }
      }
      break;
    case 'veil': {
      const floor = lowestShown(a);
      const want = st.shown ?? floor;
      const shown =
        realmIndex(want.realm) < realmIndex(floor.realm) ||
        (want.realm === floor.realm && want.stage < floor.stage)
          ? floor
          : want;
      apply(w, [
        {
          do: 'state-start',
          state: {
            holder: a.id,
            since: w.s.calendar.day,
            data: { kind: 'cover', shown, story: st.as, fooled: [] },
          },
        },
      ]);
      setActor(w, a.id, (x) => ({ ...x, shown }));
      break;
    }
    case 'disguise':
      apply(w, [
        {
          do: 'state-start',
          state: {
            holder: a.id,
            since: w.s.calendar.day,
            data: { kind: 'disguise', as: st.as ?? 'a stranger' },
          },
        },
      ]);
      setActor(w, a.id, (x) => ({ ...x, disguised: true }));
      break;
    case 'threaten':
      // A threat that lands wins its one demand; a follower by fear is a recruit (P3.4b).
      seenBy = [...new Set([...seenBy, ...(target ? [target] : [])])];
      if (target) w.s = { ...w.s, world: revealNature(w.s.world, target.id, ['nerve']) };
      // "My father is…": the threatened name their backer.
      if (target?.backer && youAre(a)) {
        apply(w, [{ do: 'knowledge', kind: 'truth', id: `backer:${target.id}` }]);
        note(w, `${target.name} names ${target.backer.name} as their backer.`);
      }
      break;
    case 'recruit':
      if (passed && target) {
        const bond = st.bond ?? 'pay';
        const wage = bond === 'pay' ? wageFor(target) : undefined;
        if (wage) {
          apply(w, [
            { do: 'stones', who: a.id, n: -wage },
            { do: 'stones', who: target.id, n: wage },
          ]);
        }
        apply(w, [{ do: 'bond', who: target.id, with: a.id, bond, wage, goal: st.goal }]);
        setActor(w, target.id, (x) => ({ ...x, side: a.side, follows: a.id }));
        // Obedience from fear is a threat that landed, and they remember it.
        if (bond === 'fear') deed(w, a, 'threat', [target], target);
      }
      break;
    case 'ask':
      if (passed && target && youAre(a)) w.s = { ...w.s, world: asked(w, a, target) };
      break;
    case 'heal':
      if (target) heal(w, a, target);
      break;
    case 'erase':
      if (passed && target) {
        const trace = strongestTrace(w.s.world, target.id, w.s.calendar.day);
        if (trace) apply(w, [{ do: 'state-break', id: trace.id, why: `${a.name} erased it` }]);
      }
      break;
    case 'lie':
      // A lie believed is known to nobody; one seen through is known to whoever saw through it.
      if (check?.read || (check && v === 'short' && target)) seenBy = target ? [target] : [];
      break;
    case 'bargain':
      if (target) w.s = { ...w.s, world: revealNature(w.s.world, target.id, ['hand']) };
      break;
    case 'report':
      // Believed, the report lands on the listener: the accused wronged them, you did them a service.
      if (passed && target && st.about) {
        apply(w, [
          { do: 'memory', who: target.id, about: st.about, row: 'wronged-us' },
          { do: 'memory', who: target.id, about: a.id, row: 'service' },
        ]);
      }
      break;
    case 'swear':
    case 'confess':
    case 'oath':
    case 'take-disciple':
      if (passed && target && info.makes) {
        apply(w, [{ do: 'tie', a: target.id, b: a.id, kind: info.makes }]);
      } else if (!passed && target && st.act === 'confess') {
        apply(w, [{ do: 'memory', who: a.id, about: target.id, row: 'spurned' }]);
      }
      break;
    case 'read-realm':
      if (target) {
        const read = readRealm(a, target);
        inspectInto(w, a.id, target.id);
        return { state: w.s, scene: w.scene, result: result({ read, ticks }) };
      }
      break;
    case 'hide':
      if (passed) setActor(w, a.id, (x) => ({ ...x, state: 'hidden' }));
      break;
    case 'watch':
    case 'track':
      if (passed && target?.state === 'hidden')
        setActor(w, target.id, (x) => ({ ...x, state: 'present' }));
      break;
    case 'search':
      if (passed) {
        const found = w.scene.features.filter((f) => f.hidden);
        w.scene = { ...w.scene, features: w.scene.features.map((f) => ({ ...f, hidden: false })) };
        if (youAre(a))
          apply(
            w,
            found.map((f) => ({ do: 'knowledge', kind: 'truth', id: f.id }) as Effect),
          );
        w.s = {
          ...w.s,
          world: discover(
            w.s.world,
            w.scene.place,
            { ...learner(a), techniques: Object.keys(a.techniques) },
            w.s.calendar.day,
          ),
        };
      }
      break;
    case 'look-around':
      if (youAre(a)) apply(w, [{ do: 'knowledge', kind: 'place', id: w.scene.place }]);
      break;
    case 'break':
    case 'open':
      if (passed && st.target) {
        w.scene = {
          ...w.scene,
          features: w.scene.features.map((f) => (f.id === st.target ? { ...f, broken: true } : f)),
        };
      }
      break;
    case 'item':
      if (st.target && (a.items[st.target] ?? 0) > 0) {
        apply(w, [{ do: 'item', who: a.id, id: st.target, n: -1, how: 'spent' }]);
      }
      break;
    case 'wait':
      // Waiting skips to the next arrival, when someone is on the way.
      if (w.scene.due !== null) ticks = Math.max(1, w.scene.due - w.scene.tick);
      break;
    case 'slip':
      if (passed && target && (a.items[thing] ?? 0) > 0) {
        apply(w, [
          { do: 'item', who: a.id, id: thing, n: -1, how: 'lost' },
          { do: 'item', who: target.id, id: thing, n: 1, how: 'gained' },
        ]);
      }
      break;
    case 'decoy': {
      const used = (st.uses ?? []).find((u) => (a.items[u] ?? 0) > 0);
      if (used) apply(w, [{ do: 'item', who: a.id, id: used, n: -1, how: 'spent' }]);
      // Believed, the decoy is a death those it fooled know of, and tell.
      if (passed && faced.length > 0) {
        const r = recordDeed(
          w.s.world,
          {
            kind: 'death',
            actor: a.id,
            victim: a.id,
            place: w.scene.place,
            witnesses: faced.map(learner),
            region: w.scene.region,
            staged: true,
          },
          w.s.calendar.day,
        );
        w.s = { ...w.s, world: r.world };
        w.deeds.push(r.id);
      }
      break;
    }
    case 'seize':
      if (passed && target) {
        apply(w, [
          {
            do: 'state-start',
            state: {
              holder: target.id,
              since: w.s.calendar.day,
              data: { kind: 'captive', held: target.id, by: a.id },
            },
          },
          { do: 'person', id: target.id, state: 'captured' },
        ]);
      }
      break;
    case 'flee':
      if (passed) setActor(w, a.id, (x) => ({ ...x, state: 'fled' }));
      break;
    case 'leave':
    case 'go-home':
      setActor(w, a.id, (x) => ({ ...x, state: 'gone' }));
      break;
    case 'step': {
      const p = projectById(w.s.world, st.target ?? '');
      if (p) w.s = { ...w.s, world: addProject(w.s.world, workProject(p, v)) };
      break;
    }
    case 'finish':
      if (target && target.state === 'down') {
        apply(w, [{ do: 'person', id: target.id, state: 'dead' }]);
        const id = deed(
          w,
          a,
          'killing',
          watchers(w.scene, a).filter((x) => x.id !== target.id),
          target,
          ['body'],
        );
        // A death talisman marks the killer's face for its power, as a lamp with a face does.
        const traced = !!talismanOf(target);
        if (traced) {
          w.s = { ...w.s, world: leaveTrace(w.s.world, a.id, target, w.s.calendar.day) };
          w.surprise ??= `${target.name}'s death talisman marks ${a.name}'s face`;
          note(w, `${target.name}'s death talisman flares: a trace sinks into ${a.name}'s soul.`);
        }
        if ((target.lamp || traced) && target.power) {
          const face = traced || target.lamp === 'face';
          w.s = { ...w.s, world: soulLamp(w.s.world, id, target.power, face, w.s.calendar.day) };
        }
      }
      break;
    default:
      break;
  }

  // Fights go to the engine whole: an ambush's check came first, and noticed it is a straight fight.
  let fight: StepResult['fight'];
  if (info.fight && target) {
    fight = runSceneFight(w, a, target);
    seenBy = watchers(w.scene, a).filter((x) => x.state === 'present' || x.state === 'down');
    ticks = 1;
    // A spar or a duel is a contest: the loser remembers it, and the proud make a rival of it.
    if ((st.act === 'spar' || st.act === 'duel') && fight.winner) {
      const [winner, loser] = fight.winner === a.side ? [a, target] : [target, a];
      w.s = { ...w.s, world: contest(w.s.world, winner.id, loser.id, w.s.calendar.day) };
      // Won in front of people, it carries their name.
      const crowd = w.scene.actors.filter((x) => x.id !== winner.id && x.state !== 'dead');
      deed(w, winner, 'victory', crowd, loser);
    }
  }

  // The deed the act makes: done in plain sight it is seen; done unseen, nobody knows but you.
  if (info.deed && st.act !== 'finish') {
    const plain = info.fight || st.act === 'rob' || st.act === 'threaten';
    if (passed || plain || seenBy.length > 0) {
      deed(w, a, info.deed, seenBy, target);
    }
  }

  if (info.loud && st.manner !== 'quiet') makeNoise(w, a);
  const hidden = (st.act === 'sneak' || st.act === 'hide' || st.act === 'steal') && passed;
  testCoverByAct(w, actorIn(w.scene, a.id) ?? a, st, check, hidden);
  if (passed && check) note(w, `${a.name}: ${info.name} · ${v}`);
  else if (check) note(w, `${a.name}: ${info.name} · short · ${short ? SHORTS[short] : ''}`);
  else note(w, `${a.name}: ${info.name}`);

  return { state: w.s, scene: w.scene, result: result({ cost, short, ticks, fight }) };
}

/**
 * A fight run whole on the combat engine: the two sides present, and the two who started it even
 * from hiding (an ambush), on the `combat` stream. Each fighter leaves it with the HP and qi it
 * ended on.
 */
function runSceneFight(
  w: Working,
  a: Actor,
  target: Actor,
): { winner: string | null; turns: number } {
  const sides = new Set([a.side, target.side]);
  const starts = (x: Actor) => x.id === a.id || x.id === target.id;
  const fighters = w.scene.actors.filter(
    (x) => sides.has(x.side) && (x.state === 'present' || (x.state === 'hidden' && starts(x))),
  );
  const combatants = fighters.map((x) => {
    const c =
      x.combatant ??
      combatant({ id: x.id, name: x.name, side: x.side, rungs: x.rungs, agility: x.agility });
    return { ...c, id: x.id, side: x.side };
  });
  const r = withStream(w.s, 'combat', (rng) => runFight(startFight(combatants), rng));
  w.s = r.state;
  // Blows struck from hiding give you away.
  for (const x of fighters)
    if (x.state === 'hidden') setActor(w, x.id, (y) => ({ ...y, state: 'present' }));
  const before = new Map(combatants.map((c) => [c.id, c]));
  for (const c of r.value.fight.combatants) {
    // The wounds and the spent qi stay for the next fight in the scene; the shield refills, as it
    // does at every fight's start, and nothing else of the fight (statuses, turns) carries.
    const was = before.get(c.id);
    if (was) setActor(w, c.id, (x) => ({ ...x, combatant: { ...was, hp: c.hp, qi: c.qi } }));
    // The armor you wore keeps the wear the fight left (P3.5).
    if (c.id === w.s.player.id) w.s = { ...w.s, player: wearFrom(w.s.player, c) };
    const state =
      c.state === 'down' ? 'down' : c.state === 'fled' || c.state === 'yielded' ? 'fled' : null;
    if (state) setActor(w, c.id, (x) => ({ ...x, state }));
  }
  const loudest = fighters.reduce((m, x) =>
    realmIndex(topRung(x).realm) > realmIndex(topRung(m).realm) ? x : m,
  );
  makeNoise(w, loudest);
  note(w, `The fight ends after ${r.value.turns} turns: ${r.value.winner ?? 'nobody'} stands.`);
  return { winner: r.value.winner, turns: r.value.turns };
}

// ── Rounds ───────────────────────────────────────────────────────────────────────────────────

export interface RoundResult {
  state: GameState;
  scene: Scene;
  results: StepResult[];
  /** Who arrived this round. */
  arrivals: string[];
  /** The law came. */
  law: boolean;
  /** Followers whose bond broke this round. */
  broke: BondBreak[];
  /** What an arrival or the law found out: a cover seen through, a face recognized. */
  surprise: string | null;
}

/** Agility order, the faster first, then by id so the order never wobbles. */
function order(actors: Actor[]): Actor[] {
  return [...actors].sort(
    (x, y) => y.agility - x.agility || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0),
  );
}

/**
 * One round: everyone present acts in Agility order (players by the steps given, everyone else by
 * their own plan's next step), then the clock runs on by the players' steps, someone arrives if
 * the noise or the open scene calls them, and the law comes when it is due.
 */
export function round(
  s: GameState,
  scene: Scene,
  steps: Readonly<Record<string, Step>>,
): RoundResult {
  // Everyone the players see shows them their outer leans and quirks.
  let state = meet(s, scene);
  // An open scene, or a noise still ringing, calls the next arrival before anyone acts, so a Wait
  // can skip to it.
  let sc = call(scene, scene.tick);
  const results: StepResult[] = [];
  let ticks = 0;
  for (const a of order(sc.actors.filter(active))) {
    const now = actorIn(sc, a.id)!;
    if (!active(now)) continue;
    const mine = steps[a.id];
    const own = !mine && now.plan?.length ? now.plan[0] : undefined;
    // Nobody telling them and no plan of their own: they act on their motives.
    const intent =
      !mine && !own && !sc.players.includes(a.id) && now.follows === undefined
        ? intentOf(state, sc, now)
        : null;
    if (intent && intent.why !== 'trace')
      state = { ...state, world: revealNature(state.world, a.id, [whyKey(intent.why)]) };
    if (intent?.law) {
      const law = LAW[sc.kind];
      if (law && sc.lawDue === null) sc = { ...sc, lawDue: sc.tick + law.ticks };
      sc = { ...sc, log: [...sc.log, `${now.name} ${intent.means}.`] };
      continue;
    }
    const st = mine ?? own ?? intent?.step;
    if (!st) continue;
    if (own)
      sc = {
        ...sc,
        actors: sc.actors.map((x) => (x.id === a.id ? { ...x, plan: x.plan!.slice(1) } : x)),
      };
    // A follower's order they won't carry out.
    const refused = own && now.follows !== undefined ? orderRefusal(state, sc, now, own) : null;
    if (refused) {
      sc = { ...sc, log: [...sc.log, `${now.name} refuses: ${refused}.`] };
      continue;
    }
    const r = doStep(state, sc, a.id, st);
    state = r.state;
    sc = r.scene;
    results.push(r.result);
    if (sc.players.includes(a.id)) ticks = Math.max(ticks, r.result.ticks);
  }
  // Every follower's bond, once a round: loyalty, fear and a shared goal.
  const bonds = checkBonds(state, sc);
  state = bonds.state;
  sc = bonds.scene;
  const before = sc.tick;
  sc = { ...sc, tick: sc.tick + Math.max(1, ticks) };
  const came = arrivals(state, sc, before);
  state = came.state;
  sc = came.scene;
  const law = lawArrives(state, sc);
  return {
    state: law.state,
    scene: law.scene,
    results,
    arrivals: came.ids,
    law: law.came,
    broke: bonds.broke,
    surprise: came.surprise ?? law.surprise,
  };
}

/** What acting on a motive or a lean shows of someone. */
function whyKey(why: string): string {
  return [
    'greed',
    'ambition',
    'fear',
    'loyalty',
    'family',
    'revenge',
    'duty',
    'pride',
    'curiosity',
  ].includes(why)
    ? `motive:${why}`
    : why;
}

/**
 * The players see everyone present: their outer leans and quirks show. Anyone who believed a
 * player dead, seeing them alive, knows the death was a lie.
 */
function meet(s: GameState, scene: Scene): GameState {
  let world = s.world;
  for (const x of scene.actors) {
    if (scene.players.includes(x.id) || x.state === 'hidden') continue;
    world = revealNature(world, x.id, meetingShows(actorNature(world, x)));
    for (const p of scene.players) {
      const me = actorIn(scene, p);
      if (me && !me.disguised && me.state === 'present' && believesDead(world, x.id, p)) {
        world = foundAlive(world, x.id, p, scene.place, s.calendar.day);
      }
    }
  }
  return world === s.world ? s : { ...s, world };
}

/** Calls the next arrival if nobody is on the way and the scene is open or a noise rings. */
function call(scene: Scene, at: number): Scene {
  if (scene.due !== null || scene.table.length === 0) return scene;
  const ringing = scene.open || (scene.noise !== null && scene.noise.until > at);
  return ringing ? { ...scene, due: at + TRAFFIC[scene.traffic] } : scene;
}

/**
 * Arrivals on the place's traffic (Jan's call in P3.3's talk, in place of a roll each tick): a
 * noise, or an open scene, calls someone, who arrives TRAFFIC ticks after the call (2 in a busy
 * town, 6 on a road, 12 in the wilds), and while it rings it calls the next. Who comes is drawn
 * from the table on the `scene` stream, as world content; a newcomer looks over anyone veiled.
 */
function arrivals(s: GameState, scene: Scene, before: number) {
  const called = call(scene, before);
  const none = { state: s, scene: called, ids: [] as string[], surprise: null as string | null };
  const due = called.due;
  if (due === null || due > scene.tick) return none;
  const picked = withStream(s, 'scene', (rng) => {
    const table = [...scene.table];
    const who = table.splice(rng.int(0, table.length - 1), 1)[0]!;
    return { who, table };
  });
  const who = picked.value.who;
  const w: Working = {
    s: picked.state,
    scene: {
      ...scene,
      due: null,
      table: picked.value.table,
      actors: [...scene.actors, who],
      log: [...scene.log, `${who.name} arrives.`],
    },
    deeds: [],

    surprise: null,
  };
  for (const p of scene.players) inspectInto(w, who.id, p);
  return { state: w.s, scene: w.scene, ids: [who.id], surprise: w.surprise };
}

/** The law of the place arrives when due, learns what its witnesses saw, and looks everyone over. */
function lawArrives(
  s: GameState,
  scene: Scene,
): { state: GameState; scene: Scene; came: boolean; surprise: string | null } {
  const law = LAW[scene.kind];
  if (!law || scene.lawDue === null || scene.tick < scene.lawDue)
    return { state: s, scene, came: false, surprise: null };
  const officer = plainActor({
    id: `law:${scene.place}`,
    name: law.who,
    side: 'law',
    realm: { realm: law.realm, stage: law.stage },
    power: scene.power,
  });
  let world = s.world;
  const day = s.calendar.day;
  for (const d of world.deeds) {
    if (d.place !== scene.place) continue;
    const told = Object.entries(d.knownBy).some(([id, k]) => {
      const x = scene.actors.find((a) => a.id === id);
      return k.who && x && x.state !== 'dead';
    });
    if (told) world = learn(world, d.id, learner(officer), true, day);
  }
  const w: Working = {
    s: { ...s, world },
    scene: {
      ...scene,
      actors: [...scene.actors, officer],
      lawDue: null,
      log: [...scene.log, `${law.who} arrive.`],
    },
    deeds: [],

    surprise: null,
  };
  for (const p of scene.players) inspectInto(w, officer.id, p);
  return { state: w.s, scene: w.scene, came: true, surprise: w.surprise };
}

// ── Plans ────────────────────────────────────────────────────────────────────────────────────

export interface PlanRun {
  state: GameState;
  scene: Scene;
  results: StepResult[];
  /** Why the plan handed back before its end, or null when every step ran. */
  stopped: string | null;
}

/**
 * Runs a plan a step a round, handing back at the first short verdict or surprise: a step that
 * went otherwise than you judged, a cover blown, an arrival, the law, someone acting on you.
 */
export function runPlan(s: GameState, scene: Scene, plan: Plan): PlanRun {
  let state = s;
  let sc = scene;
  const all: StepResult[] = [];
  for (const st of plan.steps) {
    const r = round(state, sc, { [plan.actor]: st });
    state = r.state;
    sc = r.scene;
    all.push(...r.results);
    const mine = r.results.find((x) => x.actor === plan.actor);
    if (mine?.refused) return { state, scene: sc, results: all, stopped: mine.refused };
    if (mine?.check?.verdict === 'short') {
      return { state, scene: sc, results: all, stopped: mine.short ? SHORTS[mine.short] : 'short' };
    }
    const surprise =
      r.results.find((x) => x.surprise)?.surprise ??
      r.surprise ??
      (r.arrivals.length ? `${r.arrivals.length} arrive` : null) ??
      (r.law ? 'the law arrives' : null) ??
      (r.broke.length
        ? `${actorIn(sc, r.broke[0]!.follower)?.name ?? 'a follower'} ${r.broke[0]!.how === 'turn' ? 'turns on you' : 'leaves you'}`
        : null) ??
      (r.results.some((x) => x.actor !== plan.actor && x.step.target === plan.actor)
        ? 'someone acts on you'
        : null);
    if (surprise) return { state, scene: sc, results: all, stopped: surprise };
  }
  return { state, scene: sc, results: all, stopped: null };
}

/**
 * Leaving a scene: its ticks join the world's clock and come off your wheel (the hours passed but
 * weren't cultivated), and healed wounds drop away.
 */
export function leaveScene(s: GameState, scene: Scene): GameState {
  const day = s.calendar.day + scene.tick / TICKS_PER_DAY;
  // Whoever the scene left a thread to you is kept; everyone else is thrown away (core/kept.ts).
  const world = keepThreaded(healWounds(s.world, day), scene, s.player.id, scene.place);
  return { ...s, calendar: { day }, world };
}

/** A generated NPC's ring, as their seed fills it (core/loot.ts), or null for anyone else. */
function ringHaul(x: Actor): Haul | null {
  return x.npc ? ringOf(npcFrom(x.npc.template, x.npc.seed, x.npc.realm, x.npc.stage)) : null;
}

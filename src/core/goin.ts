// Going in, the road (design § The world, Going in: doors and frames, Escape and death; § The
// resolver, The pipeline, Plain talk is free, Scenes and time; P3.9). A scene you go into opens from
// a door where you stand: an encounter's card (its Go in) or Go in here on open ground. It is the
// resolver's scene, kept in the save after every step with its last turns, and it holds the clock
// until you leave. A plan waits for Do it only when something is at stake; a fight that takes you
// in is played on the Combat screen and handed back into the scene's round. Leaving with someone
// set on stopping you is a flight; pinned by realm pressure you can't leave at all. Falling is not
// dying: whoever stands over you decides by their motives, and only here can a life end. Nothing
// here calls GLM: the narrator and the interpreter are src/ai's, and the screen's (ui/goin.ts).
import { ENCOUNTERS, encounterTemplate } from '../content/encounters/index.ts';
import { ROBBED_SHARE, SHORT_WOUND } from '../content/encounters/pace.ts';
import {
  COST_ACTS,
  GOIN_TURNS_KEPT,
  HERE_ARRIVALS,
  LEFT_FOR_DEAD,
  TERRAIN_FEATURES,
} from '../content/goin.ts';
import { hasItem, item } from '../content/items.ts';
import { MEMORIES } from '../content/memories.ts';
import type { MotiveId } from '../content/personality.ts';
import { ACTS, FIGHT_JOIN, LAW, TICKS_PER_DAY, type ActInfo } from '../content/resolver.ts';
import { template as rosterTemplate } from '../content/roster.ts';
import { combatant } from './combat/combatant.ts';
import { combatantIn, type Fight, type Join } from './combat/fight.ts';
import { faceGiven, projectionFighter } from './combat/joins.ts';
import { endLife } from './life.ts';
import { bandAt } from './map/depth.ts';
import {
  bandRealm,
  closeCard,
  eligible,
  exitViews,
  faced,
  inPeace,
  meet,
  onRoadAt,
  realmOfTop,
  roleActors,
  settle,
  tierOfRealm,
} from './map/encounters.ts';
import { terrainAt, type RegionMap } from './map/region.ts';
import { mapOf } from './map/travel.ts';
import type { Encounter } from './map/schema.ts';
import { asMember } from './orgs/membership.ts';
import { openFight, type FightEnd } from './played.ts';
import { stonesOf, takeShare, withStones, worthOf } from './purse.ts';
import { realmSizeOf, YOU, type Actor } from './resolver/actor.ts';
import { applyEffects } from './resolver/effects.ts';
import { intentOf } from './resolver/intent.ts';
import { lean, opinion, remember } from './resolver/opinion.ts';
import { step, type Plan, type Step } from './resolver/plan.ts';
import {
  actorIn,
  fighterOf,
  leaveScene,
  pinnedBy,
  previewStep,
  round,
  roundStop,
  sceneFight,
  startScene,
  type RoundResult,
  type Scene,
  type SceneFeature,
  type StepPreview,
  type StepResult,
} from './resolver/scene.ts';
import { actorNature, talkCheck } from './resolver/talk.ts';
import { heatOf, recordDeed } from './resolver/world.ts';
import { hashSeed, Rng } from './rng.ts';
import { hourOfDay } from './wheel.ts';
import { BRANCHES } from '../content/hours.ts';
import { TERRAIN_NAMES } from '../content/map/travel.ts';
import { seasonOf } from './chronicle.ts';
import { SPELL_DAYS, weatherOn } from './weather.ts';
import {
  addEvent,
  addItem,
  ageYears,
  itemCount,
  withPlayer,
  type GameState,
  type GoIn,
  type GoInFrom,
  type GoInTurn,
} from './state.ts';
import { actorFromCultivator } from './resolver/actor.ts';
import {
  afterRound,
  askToBeTaken,
  endPlace,
  enterSpot,
  hostileFace,
  matBuyer,
  moveTo,
  crowdHere,
  readyPlan,
  readyStep,
} from './goinPlace.ts';
import { foldDue, keepVoices } from './voices.ts';
import { NEW_SPOT } from '../content/goin.ts';

const FAVORS: Partial<Record<string, SceneFeature['favors']>> = {
  cover: ['stealth'],
  dark: ['stealth'],
  height: ['perception'],
};

// ── Opening a scene: the doors ───────────────────────────────────────────────────────────────

/** Why no scene can open now, or null. */
export function cannotOpen(s: GameState): string | null {
  if (s.ended) return 'This life is over.';
  if (s.goin) return 'You are already in a scene.';
  if (s.fight) return 'A fight holds you.';
  if (!s.map) return 'You are nowhere on the map.';
  return null;
}

function isBeast(a: Actor): boolean {
  if (!a.npc) return false;
  try {
    return rosterTemplate(a.npc.template).kind === 'beast';
  } catch {
    return false;
  }
}

/** A role's motives worn by the actors it made, so the scene's people act as the card wrote them. */
function withMotives(s: GameState, a: Actor, motives: readonly MotiveId[]): Actor {
  if (!motives.length) return a;
  const n = actorNature(s.world, a);
  return { ...a, nature: { ...n, motives: [...new Set([...motives, ...n.motives])] } };
}

function wentOf(s: GameState): GoIn['went'] {
  return {
    day: s.calendar.day,
    stones: worthOf(stonesOf(s.player)),
    items: { ...s.player.items },
    memories: s.world.memories.length,
    deeds: s.world.deeds.length,
  };
}

export function openScene(
  s: GameState,
  from: GoInFrom,
  title: string,
  scene: Scene,
  roles: GoIn['roles'],
): GameState {
  // An open scene, where nothing waits on you, has nothing to resolve.
  const resolved = scene.open && !scene.actors.some((a) => roles[a.id]);
  // Going in the first time is done the moment a door opens (core/firsts.ts).
  const firsts = s.lineage.firsts.includes('go-in')
    ? s.lineage.firsts
    : [...s.lineage.firsts, 'go-in' as const];
  return {
    ...s,
    lineage: { ...s.lineage, firsts },
    goin: {
      from,
      title,
      scene,
      turns: [],
      choices: [],
      summary: '',
      notes: {},
      since: 0,
      pending: null,
      banked: 0,
      cost: 0,
      roles,
      went: wentOf(s),
      resolved,
      down: false,
      ending: null,
    },
  };
}

/**
 * The people who drift into a scene on the road or in the wilds: the road's own encounters' people
 * where you stand, at the spot's band, one each; none come to harm you within a day of a town.
 * Seeded by the spot and the scene, so a reload makes the same people.
 */
function driftIns(
  s: GameState,
  map: RegionMap,
  at: readonly [number, number],
  key: string,
): { table: Actor[]; roles: GoIn['roles'] } {
  const hour = hourOfDay(s.calendar.day);
  const onRoad = onRoadAt(map, [at[0], at[1]]);
  const calm = inPeace(map, [at[0], at[1]]);
  const pool = eligible(s, map, [at[0], at[1]], hour, onRoad).filter(
    (t) =>
      (t.kind === 'cultivator' || t.kind === 'mortal') &&
      !t.goal &&
      !t.where.lawHall &&
      !t.where.needs &&
      !(calm && t.hostile) &&
      t.roles.length > 0,
  );
  const table: Actor[] = [];
  const roles: GoIn['roles'] = {};
  if (!pool.length) return { table, roles };
  const rng = new Rng(hashSeed(`goin/${s.lineage.id}/${key}`));
  const band = bandAt(map, [at[0], at[1]]);
  for (let i = 0; i < HERE_ARRIVALS; i++) {
    const t = rng.pick(pool);
    const role = t.roles[0]!;
    const enc: Encounter = {
      id: `${key}-a${i + 1}`,
      template: t.id,
      seed: hashSeed(`${key}/${i}/${s.lineage.id}`),
      band: Math.max(0, band + (role.band ?? 0)),
      at: [at[0], at[1]],
      meetAt: null,
      state: 'waiting',
      how: 'seen',
      tried: [],
      day: s.calendar.day,
      where: '',
    };
    const first = roleActors(s, enc, { ...role, count: [1, 1] }, {})[0];
    if (!first) continue;
    const side = `${key}-a${i + 1}`;
    const a = withMotives(s, asMember(s.world, { ...first, side }), role.motives ?? []);
    table.push(a);
    roles[a.id] = { motives: [...(role.motives ?? [])], beast: false, drift: true };
  }
  return { table, roles };
}

/**
 * Goes into an encounter's card (design § Going in, The doors): its people and features as the
 * card's template makes them, the exits you tried still spent, and the road's people drifting in.
 * The card waits on the map while you are inside, and the course with it.
 */
export function goInCard(s: GameState, encId: string): GameState | string {
  const why = cannotOpen(s);
  if (why) return why;
  const life = s.map!;
  const enc = life.encounters.find((e) => e.id === encId);
  const map = mapOf(s);
  if (!enc || !map) return 'There is nothing there to go into.';
  const m = meet(s, enc);
  const roles: GoIn['roles'] = {};
  for (const r of m.template.roles)
    for (const a of m.roles[r.id] ?? [])
      roles[a.id] = { motives: [...(r.motives ?? [])], beast: isBeast(a) };
  const actors = m.scene.actors.map((a) =>
    withMotives(s, a, (roles[a.id]?.motives ?? []) as MotiveId[]),
  );
  const drift = driftIns(s, map, enc.at, enc.id);
  const scene: Scene = {
    ...m.scene,
    actors,
    table: drift.table,
    // Nobody in it (a find, an omen): an open scene that waits on nothing.
    open: m.actors.length === 0,
  };
  const waits: GameState = {
    ...s,
    map: {
      ...life,
      encounters: life.encounters.map((e) =>
        e.id === encId ? { ...e, state: 'waiting', meetAt: null } : e,
      ),
    },
  };
  return openScene(waits, { kind: 'card', enc: encId }, m.template.title, scene, {
    ...roles,
    ...drift.roles,
  });
}

/** Where Go in here stands: the site you stand in, if any, within this many li. */
const SITE_LI = 40;

/**
 * Go in here (design § Going in, The doors): once you've stopped on open ground, the land where you
 * stand is the scene: its terrain's features, a site's own if you stand in one, and the road's
 * people arriving by its traffic. An open scene, with nothing at stake: you leave when you like.
 */
export function goInHere(s: GameState): GameState | string {
  const why = cannotOpen(s);
  if (why) return why;
  const life = s.map!;
  const map = mapOf(s);
  if (!map) return 'You are nowhere on the map.';
  if (life.course) return 'Stop first: Go in here is where you stand still.';
  if (life.inside) return 'A place’s own doors open from its streets.';
  const at: [number, number] = [life.at[0], life.at[1]];
  const terrain = terrainAt(map, at);
  const site = map.places.find(
    (p) => p.kind !== 'town' && Math.hypot(p.x - at[0], p.y - at[1]) < SITE_LI,
  );
  const land = [...(TERRAIN_FEATURES[terrain] ?? []), ...(site?.features ?? [])];
  const features: SceneFeature[] = land.map((f, i) => ({
    id: `f${i + 1}`,
    name: f.name,
    tags: [...f.tags],
    favors: [...new Set(f.tags.flatMap((t) => FAVORS[t] ?? []))],
  }));
  const key = `here-${Math.round(at[0])}-${Math.round(at[1])}-${Math.floor(s.calendar.day)}`;
  const drift = driftIns(s, map, at, key);
  const you = asMember(s.world, actorFromCultivator(s));
  const onRoad = onRoadAt(map, at);
  const scene = startScene({
    place: site?.id ?? key,
    region: life.region,
    kind: 'wilds',
    traffic: onRoad ? 'road' : 'wilds',
    danger: bandRealm(bandAt(map, at), new Rng(hashSeed(key))),
    open: true,
    features,
    actors: [you],
    players: [you.id],
    table: drift.table,
  });
  return openScene(s, { kind: 'here', at }, site?.name ?? '', scene, drift.roles);
}

/**
 * The dev console's door: an encounter of a template set down where you stand as a waiting card,
 * at your spot's band, and gone into. Tests and `goin <template>` use it.
 */
export function goInTemplate(s: GameState, templateId: string): GameState | string {
  const why = cannotOpen(s);
  if (why) return why;
  const t = ENCOUNTERS.find((x) => x.id === templateId);
  if (!t) return `No encounter template ${templateId}.`;
  const map = mapOf(s);
  if (!map) return 'You are nowhere on the map.';
  const life = s.map!;
  const id = `goin-${templateId}-${Math.floor(s.calendar.day * TICKS_PER_DAY)}`;
  const band = Math.min(t.bands[1], Math.max(t.bands[0], bandAt(map, life.at)));
  const enc: Encounter = {
    id,
    template: t.id,
    seed: hashSeed(`${id}/${s.lineage.id}`),
    band,
    at: [life.at[0], life.at[1]],
    meetAt: null,
    state: 'waiting',
    how: 'seen',
    tried: [],
    day: s.calendar.day,
    where: map.name,
  };
  const placed = { ...s, map: { ...life, encounters: [...life.encounters, enc] } };
  return goInCard(placed, id);
}

/**
 * Whether a card's roles would finish someone they downed (design § Escape and death, Only in
 * scenes): a beast that hunts, a grudge, or a cruel hand. Its door says "your life is at stake".
 */
export function lifeAtStake(s: GameState, enc: Encounter): boolean {
  const m = meet(s, enc);
  return m.template.roles.some((r) =>
    (m.roles[r.id] ?? []).some(
      (a) =>
        fateOf(s, withMotives(s, a, r.motives ?? []), r.motives ?? [], isBeast(a)) === 'killed',
    ),
  );
}

// ── The scene as it stands ───────────────────────────────────────────────────────────────────

export function you(s: GameState): Actor | undefined {
  return s.goin ? actorIn(s.goin.scene, s.player.id) : undefined;
}

function withScene(s: GameState, scene: Scene): GameState {
  return s.goin ? { ...s, goin: { ...s.goin, scene } } : s;
}

/** The encounter a card's scene stands on, while its card is on the map. */
export function sceneEncounter(s: GameState): Encounter | undefined {
  const f = s.goin?.from;
  return f?.kind === 'card' ? s.map?.encounters.find((e) => e.id === f.enc) : undefined;
}

/** Anyone left in the scene who stands against you: the card's roles still present or hiding. */
function standsAgainst(g: GoIn): Actor[] {
  const me = actorIn(g.scene, g.scene.players[0] ?? '');
  return g.scene.actors.filter(
    (a) =>
      g.roles[a.id] &&
      a.side !== me?.side &&
      a.follows === undefined &&
      !g.roles[a.id]!.drift &&
      (a.state === 'present' || a.state === 'hidden'),
  );
}

/** After a step: whether you are down, and whether nothing stands against you any more. */
function settleScene(s: GameState): GameState {
  const g = s.goin;
  if (!g) return s;
  const me = actorIn(g.scene, s.player.id);
  const down = me?.state === 'down';
  const resolved = g.resolved || (!g.scene.open && standsAgainst(g).length === 0);
  // A step of yours that took you out of the scene (leave, go home, a flight) ends it once told.
  const ending = g.ending ?? (me?.state === 'gone' ? 'left' : me?.state === 'fled' ? 'fled' : null);
  return { ...s, goin: { ...g, down, resolved, ending } };
}

// ── Turns: the plan, what is at stake, the rounds ────────────────────────────────────────────

export interface PlanCheck {
  previews: StepPreview[];
  /** Why the plan can't be tried at all: the first step refused. Nothing happens, no tick passes. */
  refused: string | null;
  /** Something is at stake: a verdict short of clear or unread, a cost, a deed. Do it waits. */
  stake: boolean;
}

/**
 * Whether a plan waits for Do it (design § The pipeline, Do it only when something is at stake):
 * a verdict that is close, short or "?", a cost paid, or a deed that moves karma, standing or heat.
 * A plan that can't go wrong (walk on, look round, chat) runs straight through.
 */
export function checkPlan(s: GameState, plan: Plan): PlanCheck {
  const g = s.goin;
  if (!g) return { previews: [], refused: 'You are in no scene.', stake: false };
  // Inside a place, the faces the plan aims at are made first and a way in read as such (P3.9b).
  const ready = readyPlan(s, plan);
  const sc = ready.state.goin!.scene;
  plan = ready.plan;
  const previews = plan.steps.map((st) => previewStep(ready.state, sc, plan.actor, st));
  const refused = previews.find((p) => p.refused)?.refused ?? null;
  const stake = plan.steps.some((st, i) => {
    const info: ActInfo = ACTS[st.act];
    const p = previews[i]!;
    if (p.check && p.judged !== 'clear') return true;
    if (COST_ACTS.includes(st.act)) return true;
    return !!info.deed || !!info.fight;
  });
  return { previews, refused, stake };
}

/** Sets the plan that waits for Do it, with your words, so a reload lands on the same step. */
export function setPending(s: GameState, words: string, label: string, plan: Plan): GameState {
  return s.goin ? { ...s, goin: { ...s.goin, pending: { words, label, plan } } } : s;
}

/** Change it: the plan is dropped, your words go back in the box. */
export function clearPending(s: GameState): GameState {
  return s.goin ? { ...s, goin: { ...s.goin, pending: null } } : s;
}

export interface TurnRun {
  state: GameState;
  /** The scene before the turn, for its outcome. */
  before: Scene;
  results: StepResult[];
  /** Why the plan handed back before its end. */
  stopped: string | null;
  /** A fight opened on the Combat screen; the turn is told when it comes back. */
  fight: boolean;
  arrivals: boolean;
}

/** Opens a fight that takes you in on the stage, from the scene as it stands. */
function openSceneFight(s: GameState, at: { actor: string; step: Step }): GameState | null {
  const from = { kind: 'scene', actor: at.actor, step: at.step } as const;
  return openFight(s, from, sceneFightStart(s, from));
}

/** A scene fight's start, rebuilt from the scene saved as it opened (core/playFight.ts). */
export function sceneFightStart(s: GameState, from: { actor: string; step: Step }): Fight | null {
  const g = s.goin;
  if (!g || !from.step.target) return null;
  const f = sceneFight(g.scene, from.actor, from.step.target);
  if (!f) return null;
  const joins = fightJoins(s, f, from.actor, from.step.target);
  return joins.length ? { ...f, joins } : f;
}

/**
 * Who joins a scene's fight under way (P3.9c, Jan's yes; design § A fight is a mode of the scene),
 * read from the scene as the fight opens: the place's law on its kind's turn and anyone of the
 * law's in your frame on the 2nd, both against whoever started it; someone in your frame who is
 * friendly or trusting to you on the 2nd, at your side; your followers left in another room of the
 * district on the 3rd and in another district on the 6th; and a backer's projection for every
 * fighter who has a backer, when their charge falls low.
 */
export function fightJoins(s: GameState, f: Fight, starter: string, target: string): Join[] {
  const g = s.goin!;
  const sc = g.scene;
  const me = s.player.id;
  const day = s.calendar.day;
  const fighting = (id: string) => f.combatants.some((c) => c.id === id);
  const started = combatantIn(f, starter)?.side;
  // The law fights whoever started it: on the side they struck at.
  const against = started === 'law' ? undefined : combatantIn(f, target)?.side;
  const mine = combatantIn(f, me)?.side;
  const out: Join[] = [];
  const law = LAW[sc.kind];
  const lawId = `law:${sc.place}`;
  if (law && against && !sc.actors.some((a) => a.id === lawId)) {
    const at = { realm: law.realm, stage: law.stage, grade: 0 };
    out.push({
      turn: law.turns,
      why: 'law',
      who: combatant({
        id: lawId,
        name: law.who,
        side: against,
        rungs: { qi: at, body: at, soul: at },
      }),
    });
  }
  for (const a of sc.actors) {
    if (fighting(a.id) || a.state !== 'present' || sc.players.includes(a.id)) continue;
    const side =
      a.side === 'law'
        ? against
        : mine && ['friendly', 'trusting'].includes(opinion(s.world, a.id, me, day).word)
          ? mine
          : undefined;
    if (side) out.push({ turn: FIGHT_JOIN.bystander, why: 'bystander', who: fighterOf(a, side) });
  }
  const place = g.place;
  const here = place?.frames.find((x) => x.id === place.at);
  if (place && here && mine) {
    for (const [frame, people] of Object.entries(place.left)) {
      const there = place.frames.find((x) => x.id === frame);
      for (const a of people) {
        if (a.follows !== me || a.state !== 'present') continue;
        const turn = there?.district === here.district ? FIGHT_JOIN.nearby : FIGHT_JOIN.call;
        out.push({ turn, why: 'follower', who: fighterOf(a, mine) });
      }
    }
  }
  for (const c of f.combatants) {
    const a = actorIn(sc, c.id);
    if (a?.backer && !sc.players.includes(a.id))
      out.push({
        turn: null,
        why: 'projection',
        charge: a.id,
        who: projectionFighter(a.backer, c.side),
      });
  }
  return out;
}

/**
 * Runs a plan a step a round, everyone present acting in each (design § The pipeline): it hands
 * back at the first short or surprise, and a fight that takes you in stops it and opens the Combat
 * screen, the scene saved as the fight began. The scene saves after every round.
 */
export function runTurn(s: GameState, plan: Plan): TurnRun {
  const before = s.goin!.scene;
  // Inside a place, a face aimed at is made before anyone acts, and one may come at you (P3.9b).
  const ready = readyPlan({ ...s, goin: { ...s.goin!, pending: null } }, plan);
  plan = ready.plan;
  let st: GameState = ready.state;
  if (st.goin?.place) st = hostileFace(st) ?? st;
  let sc = st.goin!.scene;
  const results: StepResult[] = [];
  let stopped: string | null = null;
  let arrivals = false;
  const memoriesBefore = st.world.memories.length;
  for (const step0 of plan.steps) {
    // Inside a place, each step aims at the scene as the last one left it (P3.9b).
    const x = readyStep(st, step0);
    // Moving inside a place is no round: the move's ticks pass and you stand somewhere else.
    if (x.act === 'enter' && st.goin?.place) {
      const m = x.target === NEW_SPOT && x.as ? enterSpot(st, x.as) : moveTo(st, x.target ?? '');
      if (typeof m === 'string') {
        stopped = m;
        break;
      }
      st = m.state;
      sc = st.goin!.scene;
      continue;
    }
    // Waiting at your mat on the market street brings someone to look (P3.9b).
    if (x.act === 'wait' && st.goin?.place) {
      const buyer = matBuyer(st);
      if (buyer) {
        st = buyer;
        sc = st.goin!.scene;
        arrivals = true;
        stopped = 'someone stops at your mat';
      }
    }
    const prior = sc;
    const r: RoundResult = round(st, sc, { [plan.actor]: x }, { stopAtFight: true });
    st = withScene(r.state, r.scene);
    if (st.goin?.place) st = afterRound(st, prior, r.results);
    st = disciple(st, r.results);
    sc = st.goin!.scene;
    results.push(...r.results);
    if (r.arrivals.length || r.law) arrivals = true;
    if (r.fightAt) {
      const opened = openSceneFight(st, r.fightAt);
      if (opened)
        return { state: opened, before, results, stopped: 'a fight', fight: true, arrivals };
    }
    stopped = stopped ?? roundStop(r, plan.actor);
    if (stopped) break;
  }
  st = foldDue(storied(st, memoriesBefore, results));
  return { state: settleScene(st), before, results, stopped, fight: false, arrivals };
}

/** An act in the past tense, for a memory's `what`: "bought", "asked". */
const PAST: Partial<Record<string, string>> = {
  buy: 'bought',
  sell: 'sold',
  pay: 'paid',
  gift: 'gave',
  ask: 'asked',
  chat: 'talked',
  persuade: 'persuaded',
  lie: 'lied',
  bargain: 'bargained',
  threaten: 'threatened',
  steal: 'stole',
  rob: 'robbed',
  attack: 'attacked',
  spar: 'sparred',
  bribe: 'bribed',
  recruit: 'recruited',
  beg: 'begged',
  report: 'reported',
  deliver: 'delivered',
  calm: 'calmed',
  heal: 'healed',
  burgle: 'broke into',
  finish: 'finished',
};

/**
 * Every memory a turn made keeps the engine's fact line (design § Memories carry their story): what
 * the step was, the thing, and where, so it is never invented.
 */
function storied(s: GameState, from: number, results: readonly StepResult[]): GameState {
  const fresh = s.world.memories.slice(from).filter((m) => !m.what);
  if (!fresh.length) return s;
  const g = s.goin;
  const where = g?.place
    ? (g.place.frames.find((f) => f.id === g.place!.at)?.name ?? g.place.name)
    : g?.title || 'the road';
  const line = (about: string, holder: string): string => {
    const r =
      [...results]
        .reverse()
        .find((x) => x.actor === about && (x.step.target === holder || !x.step.target)) ??
      [...results].reverse().find((x) => x.actor === about);
    if (!r) return `at ${where}`;
    const verb = PAST[r.step.act] ?? ACTS[r.step.act].name;
    const thing =
      r.step.thing && r.step.thing !== 'stones' && hasItem(r.step.thing)
        ? ` ${item(r.step.thing).name}`
        : '';
    const n = r.step.n && r.step.n > 1 ? ` ×${r.step.n}` : '';
    return `${verb}${thing}${n} at ${where}`;
  };
  const ids = new Set(fresh.map((m) => m.id));
  return {
    ...s,
    world: {
      ...s.world,
      memories: s.world.memories.map((m) =>
        ids.has(m.id) ? { ...m, what: line(m.about, m.holder) } : m,
      ),
    },
  };
}

/**
 * An elder taking you as a disciple (P3.9b, riding along): a persuasion of a lecturing elder about
 * yourself that passes, at friendly or better and a realm above you.
 */
function disciple(s: GameState, results: readonly StepResult[]): GameState {
  for (const r of results) {
    if (r.actor !== s.player.id || r.refused) continue;
    if (r.step.act !== 'persuade' || r.step.about !== s.player.id) continue;
    if (!r.step.target?.startsWith('elder:')) continue;
    const t = askToBeTaken(s, r.step.target, r.check?.verdict !== 'short');
    if (typeof t !== 'string') return t;
  }
  return s;
}

/** Wait: skips to the next arrival, when someone is on the way, else a tick. */
export function waitTurn(s: GameState): TurnRun {
  return runTurn(s, { actor: s.player.id, steps: [step('wait')] });
}

/** Keeps a turn for the screen, its last twenty; the chronicler's count goes up by one. */
export function addTurn(s: GameState, turn: GoInTurn): GameState {
  const g = s.goin;
  if (!g) return s;
  const turns = [...g.turns, turn].slice(-GOIN_TURNS_KEPT);
  return { ...s, goin: { ...g, turns, since: g.since + (turn.said === null ? 0 : 1) } };
}

/** Replaces the last turn: its telling arrived (Tell it), or the fight it opened came back. */
export function retell(s: GameState, turn: GoInTurn): GameState {
  const g = s.goin;
  if (!g || !g.turns.length) return s;
  return { ...s, goin: { ...g, turns: [...g.turns.slice(0, -1), turn] } };
}

/** What the narrator and chronicler leave: next choices, notes on people (six each), a summary. */
export function keepTelling(
  s: GameState,
  t: {
    choices?: string[];
    notes?: readonly { about: string; note: string }[];
    summary?: string;
    cost?: number;
  },
): GameState {
  const g = s.goin;
  if (!g) return s;
  const notes = { ...g.notes };
  for (const n of t.notes ?? []) notes[n.about] = [...(notes[n.about] ?? []), n.note].slice(-6);
  return {
    ...s,
    goin: {
      ...g,
      notes,
      choices: t.choices ?? g.choices,
      summary: t.summary ?? g.summary,
      since: t.summary !== undefined ? 0 : g.since,
      cost: g.cost + (t.cost ?? 0),
    },
  };
}

// ── A card's own exits, clicked inside the scene ─────────────────────────────────────────────

export interface ExitRun {
  state: GameState;
  /** What the card says happened, for the narrator. */
  text: string;
  /** The exit opened the Combat screen. */
  fight: boolean;
  /** You are away (slipped past, fled): the scene ends once it is told. */
  away: boolean;
}

/**
 * A card's exit clicked inside its scene (design § The pipeline: a card's exits skip the
 * interpreter): a fight opens the Combat screen with everyone in the frame on their sides; any
 * other exit settles as the card always has, its stakes landing and the card closing, or staying
 * with that exit spent when a talk fell short (No retries).
 */
export function sceneExit(s: GameState, i: number): ExitRun | string {
  const g = s.goin;
  const enc = sceneEncounter(s);
  if (!g || !enc) return 'The card is settled.';
  const m = meet(s, enc);
  const view = exitViews(s, m)[i];
  if (!view) return 'No such way out.';
  if (view.refused) return view.refused;
  const pinned = pinnedBy(g.scene, you(s)!);
  if (pinned && ['fight', 'slip'].includes(view.exit.road)) {
    return `Pinned by ${pinned.name}'s realm pressure: you can only talk, beg or burn a talisman.`;
  }
  if (view.exit.road === 'fight') {
    const target = faced(m, view.exit).find((a) => actorIn(g.scene, a.id)?.state === 'present');
    if (!target) return 'Nobody there to fight.';
    const opened = openSceneFight(s, {
      actor: s.player.id,
      step: step('attack', { target: target.id }),
    });
    return opened
      ? { state: opened, text: '', fight: true, away: false }
      : 'The fight can’t open now.';
  }
  const r = settle(s, enc.id, i, 'you');
  if (!r) return 'It can’t be done now.';
  const away =
    !r.stays && (view.exit.road === 'slip' || view.exit.road === 'pass') && r.verdict !== 'short';
  let state: GameState = r.state.goin
    ? { ...r.state, goin: { ...r.state.goin, resolved: r.stays ? r.state.goin.resolved : true } }
    : r.state;
  if (away) state = ending(state, 'left');
  return { state, text: r.text, fight: false, away };
}

// ── A fight played on the stage, handed back ─────────────────────────────────────────────────

export interface SceneFightBack {
  state: GameState;
  before: Scene;
  results: StepResult[];
  text: string;
}

/**
 * The scene as a fight hands back, with who joined it in it: a follower moves from the room they
 * were left in into your frame, and the law that joined is due as the round ends.
 */
function joinedScene(
  g: NonNullable<GameState['goin']>,
  end: Fight,
): NonNullable<GameState['goin']> {
  const joined = new Set(end.combatants.map((c) => c.id));
  let scene = g.scene;
  let place = g.place;
  if (place) {
    const moved = Object.values(place.left)
      .flat()
      .filter((a) => joined.has(a.id) && !scene.actors.some((x) => x.id === a.id));
    if (moved.length) {
      const left = Object.fromEntries(
        Object.entries(place.left).map(([k, v]) => [k, v.filter((a) => !joined.has(a.id))]),
      );
      place = { ...place, left };
      scene = { ...scene, actors: [...scene.actors, ...moved] };
    }
  }
  if (joined.has(`law:${scene.place}`) && !scene.actors.some((a) => a.id === `law:${scene.place}`))
    scene = { ...scene, lawDue: scene.tick };
  return { ...g, scene, ...(place ? { place } : {}) };
}

const FIGHT_WORDS: Record<FightEnd, string> = {
  won: 'The fight is yours.',
  lost: 'You go down.',
  fled: 'You break away.',
  yielded: 'You yield.',
  talked: 'You talk them down.',
  draw: 'Both sides draw off.',
};

/**
 * A scene's fight handed back into the round that started it (design § A fight is a mode of the
 * scene): the after-fight of every fight (the arts seen, the HP and qi kept for the next, the down
 * and the fled), the deed and the noise its step makes; everything else in the scene waits for the
 * next round, so whoever the noise called comes after it. Yielding resolves at once by the motives
 * of whoever you yield to; falling leaves you down for one last act.
 */
export function sceneFightBack(
  s: GameState,
  from: { actor: string; step: Step },
  start: Fight,
  end: Fight,
  how: FightEnd,
  used: readonly string[],
): SceneFightBack | null {
  const g0 = s.goin;
  if (!g0) return null;
  const before = g0.scene;
  // Who joined comes into the scene: followers from the rooms they were left in, and the law, due
  // now, arriving as the round ends (P3.9c).
  const g = joinedScene(g0, end);
  s = { ...s, goin: g };
  const r = round(
    s,
    g.scene,
    { [from.actor]: from.step },
    { played: { start, end, used: { [s.player.id]: used } }, only: true },
  );
  let st = withScene(r.state, r.scene);
  // Inside a place, the place answers the fight: its noise, its witnesses (P3.9b).
  if (st.goin?.place) st = afterRound(st, g.scene, r.results);
  // Fled, you are away: the scene ends once the turn is told.
  if (how === 'fled') st = ending(st, 'fled');
  let text = FIGHT_WORDS[how];
  // You gave face: the projection took its charge away, and its backer remembers it.
  const faced = faceGiven(end);
  const backer = faced ? actorIn(g.scene, faced)?.backer : undefined;
  if (faced && backer) {
    const charge = actorIn(g.scene, faced)!;
    st = {
      ...st,
      world: remember(
        st.world,
        { holder: backer.id, about: s.player.id, row: 'gave-face', what: `let ${charge.name} go` },
        st.calendar.day,
      ),
    };
    // Named by what they are, since the narrator names people as your context does (P3.9c's GLM run).
    text = 'You gave face, and the projection took its charge away.';
  }
  if (how === 'yielded') {
    const y = surrender(st);
    st = y.state;
    text = y.text;
  }
  return { state: settleScene(st), before, results: r.results, text };
}

// ── Falling, yielding and dying ──────────────────────────────────────────────────────────────

/** What whoever stands over you does with you. */
export type Fate = 'killed' | 'robbed' | 'wounded' | 'humbled';

/**
 * Their motives decide (design § Escape and death, Falling isn't dying): a beast that hunts, a
 * grudge or a cruel hand finishes you; greed takes everything and leaves you for dead; the law,
 * duty and pride let you wake with the short wound and their contempt; anyone else, the wound.
 */
export function fateOf(s: GameState, a: Actor, motives: readonly string[], beast: boolean): Fate {
  const n = actorNature(s.world, a);
  const all = new Set<string>([...motives, ...n.motives]);
  if (beast) return all.has('greed') ? 'killed' : 'wounded';
  if (all.has('revenge') || lean(n, 'heart') <= -1) return 'killed';
  if (all.has('greed')) return 'robbed';
  if (a.side === 'law' || all.has('duty') || all.has('pride')) return 'humbled';
  return 'wounded';
}

/** Who stands over you: the strongest still standing against you, or nobody. */
export function overYou(s: GameState): Actor | undefined {
  const g = s.goin;
  const me = you(s);
  if (!g || !me) return undefined;
  return g.scene.actors
    .filter((a) => a.side !== me.side && a.state === 'present')
    .sort((x, y) => realmSizeOf(y) - realmSizeOf(x))[0];
}

/** Their fate for you, as the down screen shows it before your last act. */
export function fallFate(s: GameState): { by: Actor | undefined; fate: Fate } {
  const by = overYou(s);
  if (!by) return { by, fate: 'wounded' };
  const role = s.goin?.roles[by.id];
  return { by, fate: fateOf(s, by, role?.motives ?? [], role?.beast ?? isBeast(by)) };
}

/** The scene will end once its last turn is told: how, and who killed you if it was that. */
function ending(s: GameState, how: SceneEnd | 'dead', killer?: string): GameState {
  return s.goin
    ? { ...s, goin: { ...s.goin, ending: how, ...(killer ? { killer } : {}), pending: null } }
    : s;
}

export interface Fallen {
  state: GameState;
  text: string;
  fate: Fate | 'spared';
}

function wound(s: GameState, share: number, days: number): GameState {
  return applyEffects(s, null, [{ do: 'wound', who: s.player.id, share, days }]).state;
}

/** Everything you carry, gone: the Bag, the purse and what you wear; your dwelling's store never. */
function strip(s: GameState): GameState {
  const p = s.player;
  return withPlayer(s, {
    ...withStones(p, takeShare(stonesOf(p), 1)),
    items: {},
    gear: { weapon: null, armor: null, ring: null, pouch: null, treasures: [] },
    wear: {},
  });
}

function deedOn(s: GameState, kind: 'killing' | 'robbery', by: Actor): GameState {
  const g = s.goin!;
  const witnesses = g.scene.actors
    .filter((a) => a.id !== by.id && a.id !== s.player.id && a.state === 'present')
    .map((a) => ({ id: a.id, power: a.power ?? null }));
  const r = recordDeed(
    s.world,
    {
      kind,
      actor: by.id,
      victim: s.player.id,
      place: g.scene.place,
      power: by.power ?? g.scene.power,
      witnesses,
      region: g.scene.region,
    },
    s.calendar.day,
  );
  return { ...s, world: r.world };
}

function contempt(s: GameState, by: Actor | undefined, note: string): GameState {
  if (!by) return s;
  return {
    ...s,
    world: remember(
      s.world,
      { holder: by.id, about: s.player.id, row: 'bad-turn', value: -5, note, known: [s.player.id] },
      s.calendar.day,
    ),
  };
}

/** The fate lands; the scene ends once it is told, a death through `endLife` with the killer named. */
function landFate(s: GameState, by: Actor | undefined, fate: Fate): Fallen {
  const name = by?.name ?? 'someone';
  switch (fate) {
    case 'killed':
      return {
        state: ending(deedOn(s, 'killing', by!), 'dead', name),
        text: `${name} finishes you where you lie.`,
        fate,
      };
    case 'robbed':
      return {
        state: ending(
          wound(strip(deedOn(s, 'robbery', by!)), LEFT_FOR_DEAD.share, LEFT_FOR_DEAD.days),
          'down',
        ),
        text: `${name} strips you of everything you carry and leaves you for dead. You wake in the dirt with nothing.`,
        fate,
      };
    case 'humbled':
      return {
        state: ending(
          contempt(wound(s, SHORT_WOUND.share, SHORT_WOUND.days), by, 'Lay in the dirt at my feet'),
          'down',
        ),
        text: `${name} looks down at you and lets you get up. They will remember you on the ground.`,
        fate,
      };
    case 'wounded':
      return {
        state: ending(wound(s, SHORT_WOUND.share, SHORT_WOUND.days), 'down'),
        text: by
          ? `${name} leaves you where you fell. You get up hurt, a long time later.`
          : 'You come to alone, hurt, a long time later.',
        fate,
      };
  }
}

/**
 * Down, your last act (design § Escape and death): a plea, a beg against whoever stands over you,
 * which spares you the worst and leaves you with the short wound; or nothing, and their motives
 * decide. (From Nascent Soul the soul fleeing its body stays a stub.)
 */
export function lastAct(s: GameState, plea: boolean): Fallen {
  const g = s.goin;
  if (!g || !g.down) return { state: s, text: '', fate: 'wounded' };
  const { by, fate } = fallFate(s);
  if (plea && by && fate !== 'wounded') {
    const me = you(s)!;
    const check = talkCheck(s, me, by, step('beg', { target: by.id }), g.scene.region);
    if (check.verdict !== 'short') {
      return {
        state: ending(wound(s, SHORT_WOUND.share, SHORT_WOUND.days), 'down'),
        text: `You beg, and ${by.name} lets you crawl away with the short wound and your life.`,
        fate: 'spared',
      };
    }
  }
  return landFate(s, by, fate);
}

/**
 * A surrender accepted resolves at once by motive (until captivity is built): greed robs you and
 * lets you go, a grudge or a killer's hand kills you, anyone else lets you go thinking worse of you.
 */
function surrender(s: GameState): { state: GameState; text: string } {
  const { by, fate } = fallFate(s);
  const name = by?.name ?? 'They';
  if (fate === 'killed') {
    const f = landFate(s, by, 'killed');
    return { state: f.state, text: `You yield. ${name} kills you anyway.` };
  }
  if (fate === 'robbed') {
    const p = s.player;
    let st = withPlayer(s, withStones(p, takeShare(stonesOf(p), ROBBED_SHARE)));
    const held = Object.keys(st.player.items)
      .filter((id) => itemCount(st.player, id) > 0)
      .sort();
    if (held.length) st = withPlayer(st, addItem(st.player, held[0]!, -1));
    return {
      state: ending(st, 'left'),
      text: `You yield. ${name} takes half your stones and what they like from your bag, and lets you go.`,
    };
  }
  return {
    state: ending(contempt(s, by, 'Yielded to me'), 'left'),
    text: `You yield, and ${name} lets you go.`,
  };
}

// ── Leaving ──────────────────────────────────────────────────────────────────────────────────

/** Acts that mean to stop you leaving: whoever means one of these on you won't let you walk. */
const STOPPING = new Set(['attack', 'ambush', 'rob', 'seize', 'threaten', 'steal', 'finish']);

/** Who means to stop you leaving: anyone present whose next act is aimed at you to that end. */
export function stoppers(s: GameState): Actor[] {
  const g = s.goin;
  if (!g || g.resolved) return [];
  const me = you(s);
  const enc = sceneEncounter(s);
  const hostile = !!enc && encounterTemplate(enc.template).hostile === true;
  return g.scene.actors.filter((a) => {
    if (!me || a.side === me.side || a.state !== 'present' || g.scene.players.includes(a.id))
      return false;
    const i = intentOf(s, g.scene, a);
    if (i?.step && STOPPING.has(i.step.act) && i.step.target === me.id) return true;
    // A card that came to harm you hasn't let you go just because no blow has landed yet.
    return hostile && !!g.roles[a.id] && !g.roles[a.id]!.drift;
  });
}

/** The escape talisman a flight burns by rule (K5): the lowest that reaches every stopper's tier. */
export function escapeTalisman(s: GameState, from: readonly Actor[]): string | null {
  const top = Math.max(1, ...from.map((a) => tierOfRealm(realmOfTop(a))));
  return (
    Object.keys(s.player.items)
      .filter(
        (id) =>
          itemCount(s.player, id) > 0 &&
          hasItem(id) &&
          !!item(id).uses.escape &&
          item(id).tier >= top,
      )
      .sort((a, b) => item(a).tier - item(b).tier)[0] ?? null
  );
}

export type LeaveView =
  | { kind: 'free' }
  | { kind: 'pinned'; by: string }
  | { kind: 'flee'; from: string[]; preview: StepPreview; burns: string | null };

/** What Leave would be now: a walk out, a flight from whoever means to stop you, or refused. */
export function leaveView(s: GameState): LeaveView {
  const g = s.goin;
  const me = you(s);
  if (!g || !me) return { kind: 'free' };
  const pin = pinnedBy(g.scene, me);
  if (pin && !g.resolved) return { kind: 'pinned', by: pin.name };
  const from = stoppers(s);
  if (!from.length) return { kind: 'free' };
  const preview = previewStep(s, g.scene, me.id, step('flee'));
  const burns = preview.check?.verdict === 'clear' ? null : escapeTalisman(s, from);
  return { kind: 'flee', from: from.map((a) => a.id), preview, burns };
}

export interface LeaveRun {
  state: GameState;
  /** You are out: the scene ends once this is told. */
  out: boolean;
  /** The flight's round, when Leave was one: told as a turn. */
  turn?: TurnRun;
  text: string;
}

/**
 * Leave (design § Escape and death): back to where you went in from. With someone present who
 * means to stop you it is a flight, and an escape talisman that reaches them wins it by rule; a
 * flight that falls short leaves you in the scene, and they act on you. Pinned, you can't.
 */
export function leave(s: GameState): LeaveRun {
  const v = leaveView(s);
  if (v.kind === 'pinned')
    return { state: s, out: false, text: `${v.by}'s realm pressure pins you where you stand.` };
  if (v.kind === 'free') return { state: ending(s, 'left'), out: true, text: 'You leave.' };
  if (v.burns) {
    const tal = item(v.burns);
    const st = withPlayer(s, addItem(s.player, v.burns, -1));
    return {
      state: ending(st, 'fled'),
      out: true,
      text: `You burn the ${tal.name} and go through the ${tal.uses.escape!.through}.`,
    };
  }
  const turn = runTurn(s, { actor: s.player.id, steps: [step('flee')] });
  const me = turn.state.goin ? actorIn(turn.state.goin.scene, s.player.id) : undefined;
  if (me?.state === 'fled' && !turn.fight)
    return { state: ending(turn.state, 'fled'), out: true, turn, text: 'You get away.' };
  return { state: turn.state, out: false, turn, text: 'They don’t let you go.' };
}

/** How a scene ended, for the card it stood on and the leaving card. */
export type SceneEnd = 'left' | 'fled' | 'down';

/**
 * The scene ends: its ticks join the world's clock and come off your wheel, whoever it left a
 * thread to is kept, and a card's scene closes its card with a road line and a chronicle line. A
 * death ends the life through `endLife`, the killer named.
 */
export function endScene(
  s: GameState,
  how: SceneEnd | 'dead' = s.goin?.ending ?? 'left',
): GameState {
  if (!s.goin) return s;
  // A place's scene: bodies where they lie, an evening kept with everyone, its frames kept (P3.9b).
  const placed = s.goin.place ? endPlace(s) : s;
  const g = placed.goin!;
  const everyone = g.place
    ? [...g.scene.actors, ...Object.values(g.place.left).flat()]
    : g.scene.actors;
  let st = leaveScene(keepVoices(placed), { ...g.scene, actors: everyone });
  if (how === 'dead') return { ...endLife(st, 'killed', { killer: g.killer }), goin: null };
  const enc = sceneEncounter(st);
  if (enc) {
    const m = meet(st, enc);
    const title = m.template.title;
    const lower = title.charAt(0).toLowerCase() + title.slice(1);
    const text =
      how === 'fled'
        ? `You got away from ${lower}.`
        : how === 'down'
          ? `You went down to ${lower}.`
          : `You went in on ${lower}.`;
    const line =
      how === 'fled'
        ? `gets away from ${lower}`
        : how === 'down'
          ? `falls to ${lower}`
          : `goes in on ${lower}`;
    const fought = g.scene.log.some((l) => l.startsWith('The fight ends'));
    st = closeCard(st, m, -1, { text, line }, [], {
      stays: false,
      met: g.resolved && how !== 'down',
      kind: how === 'down' ? 'hurt' : fought ? 'fight' : 'choice',
      verdict: how === 'down' ? 'short' : 'clear',
    }).state;
  }
  return { ...st, goin: null };
}

// ── The leaving card ─────────────────────────────────────────────────────────────────────────

export interface LeavingCard {
  title: string;
  /** "2½ hours". */
  spent: string;
  ticks: number;
  gained: string[];
  lost: string[];
  /** "Auntie Wen · Paid me fairly · friendly". */
  remember: { who: string; why: string; word: string }[];
  /** "a robbery · seen by 2". */
  seen: string[];
  heat: number;
  /** The chronicler's line, or the templated one. */
  line: string;
}

const nameOf = (id: string) => (hasItem(id) ? item(id).name : id);

/** Ticks as the screen says them: "½ hour", "2 hours", "a day and 3 hours". */
export function tickWords(ticks: number): string {
  const hours = ticks / 2;
  if (hours < 1) return '½ hour';
  if (hours < 24) {
    const whole = Math.floor(hours);
    const half = hours - whole >= 0.5 ? '½' : '';
    return `${whole}${half} hour${whole === 1 && !half ? '' : 's'}`;
  }
  const days = Math.floor(hours / 24);
  return `${days} day${days > 1 ? 's' : ''}`;
}

/**
 * The leaving card, read before the scene ends (design § UI and screens, The go-in screen): the
 * time, what you gained and lost against what you carried going in, who will remember you, the
 * deeds seen, the heat, and the chronicler's line.
 */
export function leavingCard(
  s: GameState,
  after: GameState,
  line: string,
  words: { name: (id: string) => string; word: (id: string) => string },
): LeavingCard {
  const g = s.goin!;
  const went = g.went;
  const p = after.player;
  const gained: string[] = [];
  const lost: string[] = [];
  for (const id of new Set([...Object.keys(went.items), ...Object.keys(p.items)])) {
    const d = (p.items[id] ?? 0) - (went.items[id] ?? 0);
    if (d > 0) gained.push(`${nameOf(id)}${d > 1 ? ` ×${d}` : ''}`);
    if (d < 0) lost.push(`${nameOf(id)}${d < -1 ? ` ×${-d}` : ''}`);
  }
  const stones = Math.round(worthOf(stonesOf(p)) - went.stones);
  if (stones > 0) gained.push(`${stones} low-grade stones’ worth`);
  if (stones < 0) lost.push(`${-stones} low-grade stones’ worth`);
  const wounds = after.world.states.filter(
    (x) => x.holder === s.player.id && x.data.kind === 'wound' && x.since >= went.day,
  );
  for (const w of wounds)
    if (w.data.kind === 'wound' && w.data.share > 0)
      lost.push(
        `a wound, ${Math.round(w.data.share * 100)}% off your lines for ${Math.round(w.data.until - w.since)} days`,
      );
  const remember = after.world.memories
    .slice(went.memories)
    .filter((m) => m.about === s.player.id && m.holder !== s.player.id)
    .map((m) => ({
      who: words.name(m.holder),
      why: m.note ?? MEMORIES[m.row].reason,
      word: words.word(m.holder),
    }));
  const seen = after.world.deeds
    .slice(went.deeds)
    .filter((d) => d.actor === s.player.id)
    .map((d) => {
      const n = Object.keys(d.knownBy).length;
      return n ? `${d.kind} · seen by ${n}` : `${d.kind} · unseen`;
    });
  return {
    title: g.title,
    spent: tickWords(g.scene.tick),
    ticks: g.scene.tick,
    gained,
    lost,
    remember,
    seen,
    heat: heatOf(after.world, g.scene.place, after.calendar.day),
    line,
  };
}

/** A chronicle line for a scene with no chronicler: what the scene was, in the history's voice. */
export function templatedLine(s: GameState): string {
  const g = s.goin;
  if (!g) return '';
  // A place's frame keeps its names' capitals; a card's title is a phrase.
  if (g.place) return `${s.player.name} went into ${g.title}.`;
  return g.title
    ? `${s.player.name} went in on ${g.title.toLowerCase()}.`
    : `${s.player.name} stopped a while in the open.`;
}

/** The chronicler's line goes into the Chronicle when the scene ends. */
export function chronicleScene(s: GameState, line: string): GameState {
  return line ? addEvent(s, 'scene', { text: line }) : s;
}

// ── What the narrator stands on ──────────────────────────────────────────────────────────────

/**
 * Where you stand, as the narrator gets it under the opening line (P3.9's talk: what keeps a
 * one-line opening from reading thin once told): the double-hour, the season and the weather, the
 * land underfoot, the road or not, where your course was headed, and the card's title and line.
 */
export interface Setting {
  hour: string;
  season: string;
  weather: string;
  land: string;
  road: boolean;
  headed: string | null;
  title: string;
  opening: string | null;
  /** Nobody is in it: told shorter (content/goin.ts, `quiet`). */
  quiet: boolean;
  /** Inside a place, where the road doesn't come into it. */
  inside: boolean;
}

export function sceneSetting(s: GameState): Setting | null {
  const g = s.goin;
  const life = s.map;
  const map = mapOf(s);
  if (!g || !life || !map) return null;
  const at: [number, number] =
    g.from.kind === 'here' ? [g.from.at[0], g.from.at[1]] : (sceneEncounter(s)?.at ?? life.at);
  const b = BRANCHES[hourOfDay(s.calendar.day)]!;
  const enc = sceneEncounter(s);
  const target = life.course?.target ? map.places.find((p) => p.id === life.course!.target) : null;
  return {
    hour: `${b.hanzi} ${b.time}`,
    season: seasonOf(s.calendar.day),
    weather: weatherOn(s.glass.seed, Math.floor(s.calendar.day / SPELL_DAYS) * SPELL_DAYS),
    land: g.place
      ? `${g.place.frames.find((f) => f.id === g.place!.at)?.name ?? 'the streets'} of ${g.place.name}`
      : (TERRAIN_NAMES[terrainAt(map, at)] ?? terrainAt(map, at)),
    road: onRoadAt(map, at),
    headed: target?.name ?? null,
    title: g.title,
    opening: enc ? encounterTemplate(enc.template).opening : (g.place?.opening ?? null),
    // Nobody here: no one else present but drift-ins from the road, and no crowd where you stand
    // (talk first: a keeper behind his desk is someone).
    quiet:
      !g.scene.actors.some(
        (a) =>
          a.id !== s.player.id && a.side !== YOU && a.state === 'present' && !g.roles[a.id]?.drift,
      ) && !(g.place && crowdHere(s).count > 0),
    inside: !!g.place,
  };
}

/**
 * Mature mode's flag goes out only while everyone in the frame is 18 or older by age (P3.9), so a
 * life under 18 never has it. Only your life keeps an age today: the people written and generated
 * are grown, and a younger one will carry its age when the cast does.
 */
export function everyoneAdult(s: GameState): boolean {
  return ageYears(s.player, s.calendar.day) >= ADULT_AGE;
}

const ADULT_AGE = 18;

export { YOU };

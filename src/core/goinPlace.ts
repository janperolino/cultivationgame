// Going in: places and people (P3.9b; design § The world, Going in: doors and frames, Who is there,
// A place's air and crowd; § The resolver, What lasts). A place's streets and each of its doors open a
// scene in that frame: the place's power and law, the frame's features and the rooms off it, its
// keeper, the kept who live there, a house's owner when home, the elder when a lecture is on, and the
// crowd as faces you can engage. You move frame to frame by the moving rule, a frame GLM names is made
// by the engine, and a guarded room opens by its way in or by sneaking or forcing it. After each round
// the place answers: a crowd that saw makes a witness, a room broken into is robbed and found by
// morning, a fight loud enough is heard across the whole place, a body goes where you put it. When
// the scene ends everyone you spent it with keeps an evening with you, and a frame where something
// happened stays on its door.
import { BODY_FOUND, PLACE_LI } from '../content/goin.ts';
import { HOSTILE_FACE } from '../content/crowd.ts';
import { DOOR_KINDS, RUMOR_TAELS } from '../content/doorKinds.ts';
import { HOUSEHOLDS } from '../content/households.ts';
import { LECTURE, LECTURE_PAYS, LECTURERS } from '../content/happenings.ts';
import { INSIGHT_PER_STUDY_DAY } from '../content/cultivation.ts';
import { DAYS_PER_MONTH } from '../content/calendar.ts';
import { hasItem, item } from '../content/items.ts';
import { PLACE_AIR } from '../content/placeAir.ts';
import { realm as realmInfo, realmIndex, REALMS, type RealmId } from '../content/realms.ts';
import type { PlaceKind } from '../content/resolver.ts';
import type { PlaceKindId } from '../content/map/places.ts';
import {
  branchOf,
  crowdCount,
  crowdRealm,
  facesAt,
  makeFace,
  placeFacts,
  type Face,
  type PlaceFacts,
} from './crowd.ts';
import {
  barredBy,
  makeFrame,
  moveTicks,
  ownerHome,
  placeFrames,
  powerStore,
  storeOf,
  type DoorRef,
  type Frame,
} from './frames.ts';
import { cannotOpen, openScene } from './goin.ts';
import { insightMultiplier, gainInsight } from './insight.ts';
import { placeKindOf } from './map/gate.ts';
import { rumorToday } from './map/place.ts';
import type { MapPlace } from './map/region.ts';
import { prosperityOf } from './markets.ts';
import { asMember, membership } from './orgs/membership.ts';
import { houseOf } from './orgs/identity.ts';
import { takeAsDisciple } from './orgs/seats.ts';
import { actorFromCultivator, plainActor, rosterActor, type Actor } from './resolver/actor.ts';
import { capability, verdict } from './resolver/check.ts';
import { keptNpc } from './kept.ts';
import { actorFromNpc } from './resolver/actor.ts';
import { addTie, remember } from './resolver/opinion.ts';
import {
  actorIn,
  startScene,
  type Scene,
  type SceneFeature,
  type StepResult,
} from './resolver/scene.ts';
import { talkCheck } from './resolver/talk.ts';
import { learn, type RealmStage } from './resolver/world.ts';
import { hashSeed, Rng } from './rng.ts';
import { realmOf, withPlayer, type GameState, type GoIn } from './state.ts';
import { step, type Plan, type Step } from './resolver/plan.ts';
import { rollNature } from './resolver/nature.ts';

type PlaceIn = NonNullable<GoIn['place']>;

const FAVORS: Partial<Record<string, SceneFeature['favors']>> = {
  cover: ['stealth'],
  dark: ['stealth'],
  height: ['perception'],
  crowd: ['stealth'],
};

/** The law a place answers to, by its kind on the place screen. */
function lawKind(kind: PlaceKindId | null): PlaceKind {
  if (kind === 'city' || kind === 'town' || kind === 'village') return kind;
  if (kind === 'hall' || kind === 'gate') return 'sect';
  return 'wilds';
}

const isRealm = (r: string | null): r is RealmId => !!r && REALMS.some((x) => x.id === r);

/**
 * What a power's own rooms are warded at: its elders' realm, two below the strongest it has, and
 * Foundation at the least, so a disciple can try their own sect's treasury (the playbook's theft).
 */
function wardRealm(p: MapPlace): RealmStage | null {
  if (!isRealm(p.top)) return null;
  const i = Math.max(realmIndex('foundation-establishment'), realmIndex(p.top) - 2);
  return { realm: REALMS[i]!.id, stage: 1 };
}

const MORTAL: RealmStage = { realm: 'qi-condensation', stage: 1 };

function frameOf(g: GoIn, id = g.place?.at): Frame | undefined {
  return g.place?.frames.find((f) => f.id === id);
}

// ── Who is there ─────────────────────────────────────────────────────────────────────────────

/** A door's keeper: the same person every time, by the place and the door (their memories keep). */
function keeperOf(placeId: string, f: Frame, facts: PlaceFacts): Actor | null {
  if (!f.keeper || !f.door || f.ground === 'resident') return null;
  const id = `keeper:${placeId}:${f.door}`;
  const nature = rollNature(id);
  // A craft's master stands at a realm by the crowd's rule, a fifth layer at the least.
  if (f.kind === 'craft') {
    const r = crowdRealm(new Rng(hashSeed(`master/${id}`)), facts);
    const low = r.realm === 'qi-condensation';
    return rosterActor(
      'rogue-cultivator',
      r.realm,
      low ? Math.max(5, r.stage) : r.stage,
      id,
      'keepers',
      {
        name: f.keeper,
        nature,
      },
    );
  }
  if (f.kind === 'hall' && facts.power) {
    return rosterActor('sect-disciple', 'qi-condensation', 7, id, 'keepers', {
      name: f.keeper,
      nature,
      power: facts.power,
    });
  }
  return plainActor({ id, name: f.keeper, side: 'keepers', realm: MORTAL, nature });
}

/** Someone the world keeps, as an actor again: rebuilt from their seed, or as a face's mortal. */
export function keptActor(s: GameState, id: string): Actor | null {
  const k = s.world.kept[id];
  if (!k) return null;
  const npc = keptNpc(s.world, id);
  if (npc) return actorFromNpc(npc, { name: k.name, nature: k.nature, side: `kept:${id}` });
  return plainActor({
    id,
    name: k.name,
    side: `kept:${id}`,
    realm: k.realm ?? MORTAL,
    nature: k.nature,
    ...(k.face
      ? { face: { key: k.face, born: k.born ?? 0, ...(k.mortal ? { mortal: k.mortal } : {}) } }
      : {}),
  });
}

/** Whether a door is open at an hour: it has people by its hours, or it never shuts. */
function opensAt(f: Frame, day: number): boolean {
  if (f.kind === 'street' || f.kind === 'alley') return true;
  return DOOR_KINDS[f.kind].hours[branchOf(day)]! > 0;
}

/**
 * The happening under way at a frame, if any (design § Four layers): the elder's lecture at your
 * own power's seat, in its hall, on the 1st and 15th at 辰 for two hours.
 */
export function happeningAt(
  s: GameState,
  placeId: string,
  f: Frame | undefined,
  day = s.calendar.day,
  who = s.player.id,
) {
  const facts = placeFacts(placeId);
  const power = facts.power;
  if (!power || !LECTURERS[power]) return null;
  const dom = Math.floor(day % DAYS_PER_MONTH) + 1;
  const h = branchOf(day);
  const on =
    LECTURE.days.includes(dom) && h >= LECTURE.branch && h < LECTURE.branch + LECTURE.hours / 2;
  const here = !f || f.kind === LECTURE.door;
  const member = !!membership(s.world, who, houseOf(power));
  const next = LECTURE.days.find((d) => d > dom) ?? LECTURE.days[0]!;
  return { template: LECTURE, lecturer: LECTURERS[power]!, power, on: on && here, member, next };
}

function lecturerActor(power: string): Actor {
  const l = LECTURERS[power]!;
  const id = `elder:${power}`;
  return rosterActor('sect-disciple', l.realm, 2, id, 'keepers', {
    name: l.elder,
    nature: rollNature(id),
    power,
  });
}

/** The people at a frame now (the cast plugs in here at N3, ahead of the faces). */
function presentAt(s: GameState, placeId: string, f: Frame, day: number): Actor[] {
  const facts = placeFacts(placeId);
  const out: Actor[] = [];
  const keeper = opensAt(f, day) ? keeperOf(placeId, f, facts) : null;
  if (keeper) out.push(keeper);
  // The kept whose home is the place stand in its streets.
  if (f.kind === 'street') {
    for (const id of Object.keys(s.world.kept)) {
      const k = s.world.kept[id]!;
      if (k.home !== placeId || s.world.people[id] === 'dead') continue;
      const rng = new Rng(hashSeed(`about/${id}/${Math.floor(day)}/${branchOf(day)}`));
      if (!rng.chance(0.5)) continue;
      const a = keptActor(s, id);
      if (a) out.push(a);
    }
  }
  // A house's owner, awake at home: someone met at their own door.
  if (f.resident && f.ground === 'resident' && f.open) {
    const home = ownerHome(f.resident, day);
    if (home.home && !home.asleep) out.push(ownerActor(placeId, f));
  }
  const h = happeningAt(s, placeId, f, day);
  if (h?.on) out.push(lecturerActor(h.power));
  return out;
}

/** A resident's owner as an actor: a mortal family's head, or the cultivator of the courtyard. */
function ownerActor(placeId: string, f: Frame): Actor {
  const r = f.resident!;
  const id = r.made ?? `owner:${placeId}:${r.seed}`;
  const nature = rollNature(id);
  if (HOUSEHOLDS[r.owner].cultivates) {
    return rosterActor('rogue-cultivator', r.realm.realm, r.realm.stage, id, `owner:${r.seed}`, {
      name: r.name.replace(/^the (\w+) household$/, 'the master of the $1 house'),
      nature,
    });
  }
  return plainActor({
    id,
    name: r.name.replace(/^the (\w+) household$/, 'old $1'),
    side: `owner:${r.seed}`,
    realm: MORTAL,
    nature,
    taels: 0,
    face: { key: `owner/${r.seed}`, mortal: 'farmer', born: r.born },
  });
}

// ── A frame's scene ──────────────────────────────────────────────────────────────────────────

/** The way into each guarded room off a frame, as a feature: a door with a lock, or a ward. */
function waysFrom(frames: readonly Frame[], f: Frame): Frame[] {
  return frames.filter((x) => x.off === f.id && x.way !== 'open' && !x.open);
}

const wayId = (f: Frame) => `way:${f.id}`;

/** The store a room holds, filled from its table the first time it is reached. */
function stocked(s: GameState, placeId: string, f: Frame): Frame {
  if (f.store || (!f.stocked && !f.resident)) return f;
  const day = s.calendar.day;
  if (f.ground === 'power') {
    const power = placeFacts(placeId).power;
    return power ? { ...f, store: powerStore(s.world, placeId, power, day) } : f;
  }
  if (f.resident)
    return { ...f, store: storeOf(s.world, placeId, f.resident.owner, f.resident.seed, day) };
  return {
    ...f,
    store: storeOf(
      s.world,
      placeId,
      f.kind === 'craft' ? 'workshop' : 'merchant',
      hashSeed(`${placeId}/${f.id}`),
      day,
    ),
  };
}

function frameFeatures(frames: readonly Frame[], f: Frame): SceneFeature[] {
  const kind =
    f.kind === 'street' ? DOOR_KINDS.market : f.kind === 'alley' ? null : DOOR_KINDS[f.kind];
  const own = (
    kind?.features ?? [{ name: 'a narrow way between walls', tags: ['narrow', 'cover'] }]
  ).map((x, i) => ({
    id: `f${i + 1}`,
    name: x.name,
    tags: [...x.tags],
    favors: [...new Set(x.tags.flatMap((t) => FAVORS[t] ?? []))],
  }));
  const ways = waysFrom(frames, f).map((r) => ({
    id: wayId(r),
    name: `the way into ${r.name}`,
    tags: ['narrow', r.warded ? 'warded' : 'locked'],
    realm: r.warded ?? MORTAL,
  }));
  return [...own, ...ways];
}

/** The scene's parts that follow the frame you stand in: its features, its rooms' stores, its rule. */
function framed(
  s: GameState,
  place: PlaceIn,
  sc: Scene,
  f: Frame,
): { scene: Scene; place: PlaceIn } {
  let frames = place.frames;
  const stores: NonNullable<Scene['stores']> = {};
  for (const r of waysFrom(frames, f)) {
    const full = stocked(s, place.id, r);
    if (full !== r) frames = frames.map((x) => (x.id === r.id ? full : x));
    if (full.store) stores[wayId(r)] = full.store;
  }
  // Standing in a room with a store: what is kept there, to take (a burglary of it).
  const own = stocked(s, place.id, f);
  if (own !== f) frames = frames.map((x) => (x.id === f.id ? own : x));
  const features = frameFeatures(frames, f);
  if (own.store) {
    stores[`store:${f.id}`] = own.store;
    features.push({ id: `store:${f.id}`, name: `what is kept in ${f.name}`, tags: ['store'] });
  }
  const special =
    f.kind === 'street' || f.kind === 'alley' ? undefined : DOOR_KINDS[f.kind].special;
  return {
    scene: {
      ...sc,
      features,
      stores,
      ...(special ? { special } : {}),
      danger: f.warded ?? sc.danger,
    },
    place: { ...place, frames },
  };
}

export interface PlaceDoor {
  place: MapPlace;
  /** The place screen's doors, as it lays them out. */
  doors: readonly DoorRef[];
  /** A door's counter key, or null for the streets. */
  door: string | null;
  /** A person's door (People): go in where they stand. */
  person?: string;
  /** What you saw that brought you in: an Around you line, the narrator's seed. */
  opening?: string;
}

/**
 * A place's streets or one of its doors (design § Going in, The doors): the scene in that frame,
 * the kept frames of the place with it. Only while you are inside the place.
 */
export function goInPlace(s: GameState, d: PlaceDoor): GameState | string {
  const why = cannotOpen(s);
  if (why) return why;
  if (s.map?.inside !== d.place.id) return 'Enter the place first.';
  const kind = placeKindOf(d.place);
  const facts = placeFacts(d.place.id);
  const written = placeFrames(kind === 'city', d.doors, facts.power, wardRealm(d.place));
  const kept = s.world.frames[d.place.id] ?? [];
  const frames = [
    ...written.map((f) => kept.find((k) => k.id === f.id) ?? f),
    ...kept.filter((k) => !written.some((f) => f.id === k.id)),
  ];
  const at = d.door
    ? frames.find((f) => f.id === `door:${d.door}`)
    : frames.find((f) => f.kind === 'street');
  if (!at) return 'There is no such door here.';
  const day = s.calendar.day;
  const you = asMember(s.world, actorFromCultivator(s));
  const others = presentAt(s, d.place.id, at, day);
  if (d.person && !others.some((a) => a.id === d.person)) {
    const p = keptActor(s, d.person);
    if (p) others.push(p);
  }
  const base = startScene({
    place: d.place.id,
    power: facts.power,
    region: s.map!.region,
    kind: lawKind(kind),
    traffic: kind === 'village' ? 'road' : 'busy',
    danger: MORTAL,
    open: true,
    actors: [you, ...others],
    players: [you.id],
  });
  const place: PlaceIn = {
    id: d.place.id,
    name: d.place.name,
    city: kind === 'city',
    frames,
    at: at.id,
    faces: {},
    left: {},
    ...(d.opening ? { opening: d.opening } : {}),
  };
  const f = framed(s, place, base, at);
  const title =
    at.kind === 'street' ? `${d.place.name}, ${at.name}` : `${at.name}, ${d.place.name}`;
  const opened = openScene(
    s,
    { kind: 'place', place: d.place.id, door: d.door, ...(d.person ? { person: d.person } : {}) },
    title,
    f.scene,
    {},
  );
  return { ...opened, goin: { ...opened.goin!, place: f.place } };
}

// ── The crowd ────────────────────────────────────────────────────────────────────────────────

export interface CrowdView {
  count: number;
  faces: (Face & { made: string | null })[];
}

/** The crowd where you stand: its count and the faces you can see, each already made or not. */
export function crowdHere(s: GameState): CrowdView {
  const g = s.goin;
  const f = g && frameOf(g);
  if (!g?.place || !f) return { count: 0, faces: [] };
  const facts = placeFacts(g.place.id);
  const day = s.calendar.day + g.scene.tick / 48;
  const kind = f.kind === 'alley' ? null : f.kind;
  if (!kind || f.ground === 'resident' || f.eyes === 'none') return { count: 0, faces: [] };
  const count = crowdCount(facts, kind, day, prosperityOf(s.world, g.place.id, day));
  const crowd = PLACE_AIR[g.place.id]?.crowd ?? facts.crowd;
  return {
    count,
    faces: facesAt(facts, f.id, day, count, crowd).map((x) => ({
      ...x,
      made: g.place!.faces[x.key] ?? null,
    })),
  };
}

/**
 * Engages a face (Jan's call in P3.9b's talk): they are made from their tag at a realm by the rule
 * and stand in the scene, the same person for the same face. Already made, nothing changes.
 */
export function engageFace(s: GameState, key: string): GameState {
  const g = s.goin;
  if (!g?.place || g.place.faces[key]) return s;
  const face = crowdHere(s).faces.find((x) => x.key === key);
  if (!face) return s;
  const made = makeFace(
    s.world,
    face,
    placeFacts(g.place.id),
    s.calendar.day,
    `crowd:${key}`,
    s.lineage.id,
  );
  const a = { ...made.actor, nature: made.actor.nature ?? rollNature(made.actor.id) };
  return {
    ...s,
    goin: {
      ...g,
      scene: { ...g.scene, actors: [...g.scene.actors, a] },
      place: { ...g.place, faces: { ...g.place.faces, [key]: a.id } },
    },
  };
}

/**
 * A plan made ready for a place (P3.9b): the faces it aims at made, and an act that gets you through
 * a way in (burgle, sneak, break, open) aimed at the room itself turned to its way in, as GLM reads
 * "force the lock of the house" at the house.
 */
export function readyPlan(s: GameState, plan: Plan): { state: GameState; plan: Plan } {
  const g = s.goin;
  if (!g?.place) return { state: s, plan };
  const steps = plan.steps.map((st) => {
    const t = st.target;
    if (!t || !OPENS.has(st.act) || t.startsWith('way:') || t.startsWith('store:')) return st;
    if (g.scene.features.some((f) => f.id === `way:${t}`)) return { ...st, target: `way:${t}` };
    // Burgling the room you stand in is taking from what is kept there.
    if (st.act === 'burgle' && g.scene.features.some((f) => f.id === `store:${t}`))
      return { ...st, target: `store:${t}` };
    return st;
  });
  const ready = { ...plan, steps };
  const state = engageAimed(
    s,
    steps.flatMap((x) => [x.target, ...(x.helpers ?? []), x.about]),
  );
  return { state, plan: ready };
}

/**
 * A step re-aimed at the scene as it now stands (P3.9b): once a way in has put you inside, a step
 * still aimed at that way takes from the store where you stand, and the way leaves its uses.
 */
export function readyStep(s: GameState, st: Step): Step {
  const g = s.goin;
  if (!g?.place) return st;
  const here = g.place.at;
  const gone = (id: string) => id === `way:${here}`;
  const uses = st.uses?.filter((u) => !gone(u));
  const target = st.target && gone(st.target) && st.act === 'burgle' ? `store:${here}` : st.target;
  return {
    ...st,
    ...(target ? { target } : {}),
    ...(st.uses ? { uses: uses ?? [] } : {}),
  };
}

/**
 * The market street's mat (the door kind's special): waiting there with something to sell brings
 * a face to look over your wares, made as anyone engaged is.
 */
export function matBuyer(s: GameState): GameState | null {
  const g = s.goin;
  const f = g && frameOf(g);
  if (!g?.place || !f || f.kind === 'street' || f.kind === 'alley') return null;
  if (DOOR_KINDS[f.kind].special !== 'mat') return null;
  if (!Object.values(s.player.items).some((n) => n > 0)) return null;
  const face = crowdHere(s).faces.find((x) => !x.made);
  if (!face) return null;
  const st = engageFace(s, face.key);
  const who = st.goin!.scene.actors.at(-1)!;
  const line = `${capital(who.looks ?? who.name)} stops at your mat and looks over your wares.`;
  return {
    ...st,
    goin: { ...st.goin!, scene: { ...st.goin!.scene, log: [...st.goin!.scene.log, told(line)] } },
  };
}

/** The face a ref is about: "face:…" ids the context gave out, made the first time they are aimed at. */
export function engageAimed(s: GameState, ids: readonly (string | undefined)[]): GameState {
  let st = s;
  for (const id of ids) {
    if (id?.startsWith('face:') && st.goin && !actorIn(st.goin.scene, id))
      st = engageFace(st, id.slice(5));
  }
  return st;
}

// ── Moving ───────────────────────────────────────────────────────────────────────────────────

export interface MoveView {
  frame: Frame;
  ticks: number;
  barred: string | null;
}

/** Whether you could walk in: your power's rooms by rank, a crafter in a craft's workshop. */
function barOf(s: GameState, f: Frame): string | null {
  const power = s.goin?.scene.power;
  const member = !!power && !!membership(s.world, s.player.id, houseOf(power));
  const craft = Object.values(s.player.crafts?.grades ?? {}).some((x) => (x?.grade ?? 0) > 0);
  return barredBy(f, { member, taels: s.player.silver, craft });
}

/** The moves from where you stand (design § The go-in screen): the doors here, other districts, rooms. */
export function movesHere(s: GameState): MoveView[] {
  const g = s.goin;
  const here = g && frameOf(g);
  if (!g?.place || !here) return [];
  const frames = g.place.frames;
  return frames
    .filter((f) => f.id !== here.id)
    .filter((f) => {
      // A district's own doors and rooms; another district's street and doors, not its rooms.
      if (f.district !== here.district) return f.kind === 'street' || f.id.startsWith('door:');
      return f.off === here.id || f.id === here.off || f.off === here.off || f.kind === 'street';
    })
    .map((f) => ({ frame: f, ticks: moveTicks(frames, here, f), barred: barOf(s, f) }));
}

export interface MoveRun {
  state: GameState;
  text: string;
  ticks: number;
}

/**
 * Moves you to a frame (design § Moving): within a door free, door to door a tick, district to
 * district four. Anyone who follows you comes along; everyone else stays where they were, found
 * there if you come back. A guarded room refuses you its way in.
 */
export function moveTo(s: GameState, to: string, force = false): MoveRun | string {
  const g = s.goin;
  const place = g?.place;
  const here = g && frameOf(g);
  const there = place?.frames.find((f) => f.id === to);
  if (!g || !place || !here || !there) return 'There is no such place here.';
  if (!force) {
    const bar = barOf(s, there);
    if (bar) return bar;
  }
  const ticks = moveTicks(place.frames, here, there);
  const me = s.player.id;
  const comes = (a: Actor) => a.id === me || a.follows === me || g.scene.players.includes(a.id);
  const stay = g.scene.actors.filter((a) => !comes(a));
  const left = { ...place.left, [here.id]: stay };
  const back = left[there.id] ?? [];
  delete left[there.id];
  const day = s.calendar.day + (g.scene.tick + ticks) / 48;
  const fresh = presentAt(s, place.id, { ...there, open: true }, day).filter(
    (a) => !back.some((b) => b.id === a.id) && !stay.some((b) => b.id === a.id),
  );
  // Paying a paid room's way is paying for it.
  let st = s;
  if (there.way === 'paid' && !there.open && !force && there.taels) {
    st = withPlayer(st, { ...st.player, silver: st.player.silver - there.taels });
  }
  const frames = place.frames.map((f) =>
    f.id === there.id && there.way !== 'open' ? { ...f, open: true } : f,
  );
  const moved: PlaceIn = { ...place, frames, at: there.id, left };
  const sc: Scene = {
    ...g.scene,
    actors: [...g.scene.actors.filter(comes), ...back, ...fresh],
    tick: g.scene.tick + ticks,
    log: [...g.scene.log, told(`You go to ${there.name}.`)],
  };
  const f = framed(st, moved, sc, there);
  return {
    state: {
      ...st,
      goin: { ...g, scene: f.scene, place: f.place, title: titleOf(place.name, there) },
    },
    text: ticks ? `You go to ${there.name}.` : `You step into ${there.name}.`,
    ticks,
  };
}

function titleOf(placeName: string, f: Frame): string {
  return f.kind === 'street' ? `${placeName}, ${f.name}` : `${f.name}, ${placeName}`;
}

/**
 * A spot GLM named (design § Frames, not floor plans): made by the engine off where you stand, and
 * walked to; a stranger's house is shut until you knock, sneak or force it.
 */
export function enterSpot(s: GameState, name: string): MoveRun | string {
  const g = s.goin;
  const here = g && frameOf(g);
  if (!g?.place || !here) return 'There is nowhere else here.';
  const made = makeFrame(
    s.world,
    g.place.id,
    g.place.frames,
    here,
    name,
    s.calendar.day,
    s.lineage.id,
  );
  if (typeof made === 'string') return made;
  const known = g.place.frames.some((f) => f.id === made.id);
  const frames = known ? g.place.frames : [...g.place.frames, made];
  const st: GameState = { ...s, goin: { ...g, place: { ...g.place, frames } } };
  if (made.way !== 'open' && !made.open) {
    const f = framed(st, st.goin!.place!, st.goin!.scene, here);
    return {
      state: { ...st, goin: { ...st.goin!, scene: f.scene, place: f.place } },
      text: `${capital(made.name)} is shut: ${made.keeper ?? 'its owner'} keeps it. Knock, or sneak or force your way in.`,
      ticks: 0,
    };
  }
  return moveTo(st, made.id);
}

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** A log line the narrator is told (ai/outcome.ts reads them); the rest is the engine's own. */
const told = (line: string) => `» ${line}`;

// ── After each round: the place answers ──────────────────────────────────────────────────────

/** Acts that get you through a guarded room's way, passed. */
const OPENS = new Set(['burgle', 'sneak', 'break', 'open']);
/** Deeds a crowd can't miss even when nobody stood against you: done to someone's face, or loud. */
const OPEN_DEEDS = new Set(['robbery', 'assault', 'killing', 'massacre', 'kidnapping']);

/**
 * The place answers a round (P3.9b): a room got into opens and a store taken is robbed, found by
 * morning; a short at a ward wakes the owner; a crowd that saw makes one witness (Jan: make him);
 * a fight loud enough is heard across the whole place; a body goes where you put it.
 */
export function afterRound(s: GameState, before: Scene, results: readonly StepResult[]): GameState {
  const g = s.goin;
  if (!g?.place) return s;
  let st = s;
  let place = g.place;
  let sc = g.scene;
  const day = s.calendar.day + sc.tick / 48;
  const here = frameOf(g)!;
  let into: string | null = null;
  for (const r of results) {
    if (!g.scene.players.includes(r.actor) || r.refused) continue;
    const short = r.check?.verdict === 'short';
    const target = r.step.target ?? '';
    // A store taken where you stand: it keeps what is left, and is found robbed by morning.
    if (target.startsWith('store:') && r.step.act === 'burgle' && !short) {
      const fid = target.slice(6);
      const store = sc.stores?.[target];
      place = {
        ...place,
        frames: place.frames.map((f) =>
          f.id === fid
            ? { ...f, ...(store ? { store } : {}), robbed: { day, found: Math.floor(day) + 1.25 } }
            : f,
        ),
      };
    }
    // The teahouse's rumor (its special): five taels to its keeper buys the word going round.
    if (
      (r.step.act === 'pay' || r.step.act === 'buy') &&
      r.step.thing === 'taels' &&
      (r.step.n ?? 1) >= RUMOR_TAELS &&
      r.step.target?.startsWith('keeper:') &&
      sc.special === 'rumor'
    ) {
      const word = wordOfPlace(st, place.id)[0] ?? rumorOf(st, place.id);
      sc = { ...sc, log: [...sc.log, told(`The keeper leans in: ${word}.`)] };
    }
    // A guarded room's way.
    if (target.startsWith('way:') && OPENS.has(r.step.act)) {
      const fid = target.slice(4);
      const room = place.frames.find((f) => f.id === fid);
      if (!room) continue;
      if (!short) {
        const store = sc.stores?.[target];
        const took = r.step.act === 'burgle';
        place = {
          ...place,
          frames: place.frames.map((f) =>
            f.id === fid
              ? {
                  ...f,
                  open: true,
                  ...(store ? { store } : {}),
                  ...(took ? { robbed: { day, found: Math.floor(day) + 1 + 0.25 } } : {}),
                }
              : f,
          ),
        };
        // Sneaked, opened or forced, you are through it and inside.
        if (!took) into = fid;
      } else if (room.resident) {
        // Tripping a ward or the dog wakes whoever is home.
        const home = ownerHome(room.resident, day);
        if (home.home) {
          const owner = ownerActor(place.id, room);
          if (!actorIn(sc, owner.id)) {
            sc = {
              ...sc,
              actors: [...sc.actors, owner],
              log: [...sc.log, told(`${capital(owner.name)} wakes.`)],
            };
          }
        }
      }
    }
    // A body got rid of.
    if (r.step.act === 'dispose' && target) {
      const body = actorIn(before, target);
      if (body && (body.state === 'dead' || body.state === 'down')) {
        const fire = (r.step.uses ?? []).some((u) => burns(s, u));
        const v = r.check?.verdict ?? 'clear';
        const found = fire ? null : Math.floor(day) + BODY_FOUND[v];
        const deed = st.world.deeds.findLast?.((d) => d.kind === 'killing' && d.victim === body.id);
        const trace = !!deed && Object.values(deed.knownBy).some((k) => k.who);
        const rec = {
          id: body.id,
          name: body.name,
          how: fire ? ('destroyed' as const) : ('hidden' as const),
          found,
          deed: deed?.id ?? null,
          trace,
        };
        place = {
          ...place,
          frames: place.frames.map((f) =>
            f.id === here.id
              ? { ...f, bodies: [...(f.bodies ?? []).filter((b) => b.id !== body.id), rec] }
              : f,
          ),
        };
        sc = {
          ...sc,
          actors: sc.actors.map((a) => (a.id === body.id ? { ...a, state: 'gone' as const } : a)),
        };
      }
    }
  }
  // A crowd that saw: one face made, who saw it done.
  const fresh = st.world.deeds.filter(
    (d) =>
      g.scene.players.includes(d.actor) &&
      !before.log.includes(`deed:${d.id}`) &&
      d.place === place.id,
  );
  const seen = new Set(sc.log.filter((l) => l.startsWith('deed:')));
  for (const d of fresh) {
    if (seen.has(`deed:${d.id}`)) continue;
    sc = { ...sc, log: [...sc.log, `deed:${d.id}`] };
    const witnessed = Object.values(d.knownBy).some((k) => k.who);
    if (witnessed || here.eyes === 'none') continue;
    const mine = results.find((r) => r.actor === d.actor && r.deeds.includes(d.id));
    const loud = OPEN_DEEDS.has(d.kind);
    if (!loud && mine?.check?.verdict === 'clear') continue;
    if (here.eyes === 'few' && !loud) continue;
    const face = crowdHere({ ...st, goin: { ...g, scene: sc, place } }).faces[0];
    if (!face) continue;
    const engaged = engageFace({ ...st, goin: { ...g, scene: sc, place } }, face.key);
    const witness = engaged.goin!.scene.actors.at(-1)!;
    st = {
      ...engaged,
      world: learn(
        engaged.world,
        d.id,
        { id: witness.id, power: witness.power ?? null },
        true,
        Math.floor(day),
        true,
      ),
    };
    sc = {
      ...engaged.goin!.scene,
      log: [...engaged.goin!.scene.log, told(`${capital(witness.looks ?? witness.name)} saw it.`)],
    };
    place = engaged.goin!.place!;
  }
  // A noise heard across the whole place.
  const size = placeFacts(place.id).at;
  if (
    sc.noise &&
    // A noise made this round, or one still ringing.
    (sc.noise !== before.noise || sc.noise.until > sc.tick) &&
    sc.noise.li >= PLACE_LI[size] &&
    !sc.log.includes('heard:place')
  ) {
    sc = {
      ...sc,
      log: [...sc.log, 'heard:place', told(`The whole of ${place.name} hears it.`)],
      lawDue: sc.lawDue ?? sc.tick + 1,
    };
  }
  const out: GameState = { ...st, goin: { ...st.goin!, scene: sc, place } };
  if (!into) return out;
  const m = moveTo(out, into, true);
  return typeof m === 'string' ? out : m.state;
}

/** The word going round a place for the teahouse's rumor: a place not far off you haven't seen. */
function rumorOf(s: GameState, placeId: string): string {
  const r = rumorToday(s, placeId);
  return r.ok
    ? `they say there is somewhere called ${r.place.name} not far off, that few here have seen`
    : 'nothing worth five taels today, and they say so';
}

/** Whether a thing burns a body to nothing: a fire art or a fire talisman. */
function burns(s: GameState, id: string): boolean {
  if (hasItem(id)) return /fire|ember|flame|blaze/i.test(item(id).name);
  return /fire|ember|flame|blaze/i.test(id) && id in (s.player.techniques ?? {});
}

/**
 * The face that comes at you where no watch keeps the frame (design § Who is there: a hostile one
 * only there): once a double-hour at its chance, a cutpurse made from the crowd with greed in them
 * and your purse in their plan. Null when none comes, or one already came this double-hour.
 */
export function hostileFace(s: GameState): GameState | null {
  const g = s.goin;
  const f = g && frameOf(g);
  if (!g?.place || !f) return null;
  const unwatched = g.scene.kind === 'wilds' || unwatchedPlace(g.place.id) || f.kind === 'alley';
  if (!unwatched || f.eyes === 'none') return null;
  const day = s.calendar.day + g.scene.tick / 48;
  const stamp = `${Math.floor(day)}/${branchOf(day)}`;
  if (g.scene.log.includes(`hostile:${stamp}`)) return null;
  const rng = new Rng(hashSeed(`hostile/${s.lineage.id}/${g.place.id}/${f.id}/${stamp}`));
  const marked = {
    ...s,
    goin: { ...g, scene: { ...g.scene, log: [...g.scene.log, `hostile:${stamp}`] } },
  };
  if (!rng.chance(HOSTILE_FACE)) return marked;
  const face = crowdHere(marked).faces.find((x) => !x.made);
  if (!face) return marked;
  const st = engageFace(marked, face.key);
  const a = st.goin!.scene.actors.at(-1)!;
  const n = a.nature ?? rollNature(a.id);
  const thief: Actor = {
    ...a,
    nature: { ...n, motives: [...new Set(['greed' as const, ...n.motives])].slice(0, 3) },
    plan: [step('steal', { target: s.player.id, thing: 'stones', n: 5 })],
  };
  return {
    ...st,
    goin: {
      ...st.goin!,
      scene: {
        ...st.goin!.scene,
        actors: st.goin!.scene.actors.map((x) => (x.id === a.id ? thief : x)),
      },
    },
  };
}

/** Places no watch keeps: the Night Bridge's crossing, whatever its kind says. */
const UNWATCHED: readonly string[] = ['qm-yeqiao-hui'];
function unwatchedPlace(id: string): boolean {
  return UNWATCHED.includes(id);
}

// ── The lecture ──────────────────────────────────────────────────────────────────────────────

export interface LectureRun {
  state: GameState;
  text: string;
  insight: number;
}

/**
 * Sitting the elder's lecture (design § Happenings): its two hours pass, and you take in two study
 * days' insight, all of it when your soul reads clear against its tier, less when close or short. A
 * question asked is an ask of the elder: passed, they notice you (a memory). Members only.
 */
export function sitLecture(s: GameState, question = false, who = s.player.id): LectureRun | string {
  const g = s.goin;
  const f = g && frameOf(g);
  if (!g?.place || !f) return 'There is no lecture here.';
  const h = happeningAt(s, g.place.id, f, s.calendar.day + g.scene.tick / 48);
  if (!h?.on) return 'No lecture is on now.';
  if (!h.member) return 'Only the power’s own sit its lectures.';
  const me = actorIn(g.scene, who)!;
  const tierRealm = REALMS[Math.min(REALMS.length - 1, h.lecturer.tier)]!.id;
  const theirs = capability(
    plainActor({ id: 'tier', name: 'tier', side: 'x', realm: { realm: tierRealm, stage: 1 } }),
    'perception',
  );
  const v = verdict(capability(me, 'perception'), theirs);
  const share = v === 'clear' ? 1 : v === 'close' ? LECTURE_PAYS.close : LECTURE_PAYS.short;
  const insight =
    INSIGHT_PER_STUDY_DAY *
    realmInfo(realmOf(s.player)).insightRate *
    insightMultiplier(s.player) *
    LECTURE_PAYS.studyDays *
    share;
  let st = withPlayer(s, gainInsight(s.player, insight));
  const ticks = LECTURE.hours * 2;
  st = {
    ...st,
    goin: { ...st.goin!, scene: { ...st.goin!.scene, tick: st.goin!.scene.tick + ticks } },
  };
  let text = `You sit through ${h.lecturer.elder}’s lecture on ${h.lecturer.subject}.`;
  if (question) {
    const elder = actorIn(st.goin!.scene, `elder:${h.power}`) ?? lecturerActor(h.power);
    const c = talkCheck(st, me, elder, step('ask', { target: elder.id }), g.scene.region);
    if (c.verdict !== 'short') {
      st = {
        ...st,
        world: remember(
          st.world,
          {
            holder: elder.id,
            about: who,
            row: 'good-question',
            known: [who],
            what: `asked a good question at my lecture on ${h.lecturer.subject}`,
          },
          s.calendar.day,
        ),
      };
      text += ` Your question makes ${h.lecturer.elder} stop and look at you.`;
    } else text += ' Your question goes unanswered.';
  }
  return { state: st, text, insight };
}

/**
 * The elder taking you as a disciple (Open questions, For the AI half; `takeAsDisciple`): asked of
 * the lecturing elder at friendly or better, a realm above you, a persuasion that passes makes them
 * your master and you a true disciple.
 */
export function askToBeTaken(
  s: GameState,
  elderId: string,
  passed: boolean,
  who = s.player.id,
): GameState | string {
  if (!passed) return s;
  const power = elderId.startsWith('elder:') ? elderId.slice(6) : null;
  if (!power) return 'Only an elder takes disciples.';
  let w = s.world;
  if (!w.members.some((m) => m.who === elderId)) {
    w = {
      ...w,
      members: [
        ...w.members,
        { who: elderId, power: houseOf(power), since: 0, seat: 'elder', balance: 0 },
      ],
    };
  }
  const taken = takeAsDisciple(w, elderId, who, power);
  if (!taken) return 'You aren’t one of theirs.';
  return { ...s, world: addTie(taken, { a: elderId, b: who, kind: 'master' }) };
}

// ── When the scene ends ──────────────────────────────────────────────────────────────────────

/**
 * A place's scene ends (P3.9b): the dead you left where they fell lie there, found by morning
 * where the place keeps a watch; everyone you spent the scene with keeps an evening with you
 * (design § Memories carry their story, `company`) if it made no other memory; the narrator's notes
 * go to what each keeps of you; and a frame where something happened stays on its door.
 */
export function endPlace(s: GameState): GameState {
  const g = s.goin;
  if (!g?.place) return s;
  const place = g.place;
  const day = s.calendar.day + g.scene.tick / 48;
  const here = frameOf(g)!;
  const watched = g.scene.kind !== 'wilds' && !unwatchedPlace(place.id);
  let frames = place.frames.map((f) => {
    const people = f.id === here.id ? g.scene.actors : (place.left[f.id] ?? []);
    const dead = people.filter(
      (a) => a.state === 'dead' && !(f.bodies ?? []).some((b) => b.id === a.id),
    );
    if (!dead.length) return f;
    const bodies = dead.map((a) => {
      const deed = [...s.world.deeds]
        .reverse()
        .find((d) => d.kind === 'killing' && d.victim === a.id);
      return {
        id: a.id,
        name: a.name,
        how: 'left' as const,
        found: watched ? Math.floor(day) + 1 + BODY_FOUND.short : null,
        deed: deed?.id ?? null,
        trace: !!deed && Object.values(deed.knownBy).some((k) => k.who),
      };
    });
    return { ...f, bodies: [...(f.bodies ?? []), ...bodies] };
  });
  frames = frames.map((f) => (f.made ? { ...f, kept: [...(f.kept ?? [])] } : f));
  const worth = frames.filter(
    (f) => (f.bodies?.length ?? 0) > 0 || f.robbed || (f.kept?.length ?? 0) > 0,
  );
  const keptFrames = [
    ...(s.world.frames[place.id] ?? []).filter((x) => !worth.some((f) => f.id === x.id)),
    ...worth.map((f) => ({ ...f, open: false })),
  ];
  let world = { ...s.world, frames: { ...s.world.frames, [place.id]: keptFrames } };
  // An evening with you, for everyone present who made no other memory of you this scene.
  // A first impression lands on meeting anyone, so it doesn't count as something made between you.
  const met = new Set(
    world.memories
      .slice(g.went.memories)
      .filter((m) => m.about === s.player.id && m.row !== 'first-look')
      .map((m) => m.holder),
  );
  const everyone = [...g.scene.actors, ...Object.values(place.left).flat()];
  for (const a of everyone) {
    if (a.id === s.player.id || met.has(a.id) || a.state === 'dead' || a.side === 'law') continue;
    if (!g.scene.actors.some((x) => x.id === a.id)) continue;
    world = remember(
      world,
      {
        holder: a.id,
        about: s.player.id,
        row: 'company',
        what: `an evening at ${here.name}, ${place.name}`,
        known: [s.player.id],
      },
      s.calendar.day,
    );
  }
  return { ...s, world };
}

/**
 * What a place's kept frames turn up by today (Jan's call): a body or a robbery found, its deed
 * learned by the place's law with who did it only where a trace points to you, else only that it
 * happened, which is word of the place. Each is told once.
 */
export function findings(s: GameState, placeId: string): { state: GameState; words: string[] } {
  const frames = s.world.frames[placeId] ?? [];
  const day = s.calendar.day;
  const words: string[] = [];
  let world = s.world;
  const law = { id: `law:${placeId}`, power: placeFacts(placeId).power };
  const next = frames.map((f) => {
    let out = f;
    const bodies = (f.bodies ?? []).map((b) => {
      if (b.found === null || b.found > day || b.found < 0) return b;
      words.push(`${capital(b.name)} was found dead in ${f.name}.`);
      if (b.deed !== null) world = learn(world, b.deed, law, b.trace, Math.floor(day));
      return { ...b, found: -1 };
    });
    out = { ...out, bodies };
    if (f.robbed && f.robbed.found <= day && f.robbed.found >= 0) {
      words.push(`${capital(f.name)} was found robbed.`);
      out = { ...out, robbed: { ...f.robbed, found: -1 } };
    }
    return out;
  });
  if (!words.length) return { state: s, words };
  return {
    state: { ...s, world: { ...world, frames: { ...world.frames, [placeId]: next } } },
    words,
  };
}

/** Word of the place (the teahouse's rumor): the last things found there, newest first. */
export function wordOfPlace(s: GameState, placeId: string): string[] {
  const out: string[] = [];
  for (const f of s.world.frames[placeId] ?? []) {
    for (const b of f.bodies ?? [])
      if (b.found === -1) out.push(`a body was found in ${f.name}: ${b.name}`);
    if (f.robbed?.found === -1) out.push(`${f.name} was robbed`);
  }
  return out.reverse();
}

// Encounters on the map (design § The world, Encounters on the map, Scene templates; § The
// resolver, Away and the idle half; P3.7's talk). The road's notice fills as you move and an
// encounter comes when it is full: a template picked by the kind's shares, where you stand and the
// band, its people regenerated from its seed. It shows at the edge of your sight ahead on your
// course, or springs on you when your Perception falls short of its Stealth, or has found you first
// when its Perception is a realm beyond your Stealth. Your stance settles it on the engine by the
// resolver's verdicts, with no dice; anything the stance can't settle waits as a card and stops the
// course. Nobody dies on the map.
import { ENCOUNTERS, encounterTemplate } from '../../content/encounters/index.ts';
import { MORTALS } from '../../content/encounters/mortals.ts';
import {
  COVER_HELP,
  CONTACT_LI,
  GO_ROUND_LI,
  HIDING_DAYS,
  KIND_SHARES,
  MAX_AHEAD,
  NIGHT_HOURS,
  NIGHT_SHIFT,
  NOTICE_CAMP,
  NOTICE_FLYING,
  NOTICE_GROUP,
  NOTICE_HEAT,
  NOTICE_NIGHT,
  NOTICE_OFF,
  NOTICE_ROAD,
  NOTICE_THRESHOLD,
  ROAD_PEOPLE_SPREAD,
  ROBBED_SHARE,
  SHORT_WOUND,
  RECENT_LINES,
  TOWN_PEACE_LI,
  RECENT_WEIGHT,
  WEAK_LOOKING,
} from '../../content/encounters/pace.ts';
import {
  ENCOUNTER_KINDS,
  type EncounterKind,
  type Exit,
  type ExitOutcome,
  type Role,
  type Stake,
  type Template,
} from '../../content/encounters/schema.ts';
import { hasItem, item, rarityRange, variantId } from '../../content/items.ts';
import {
  BANDS,
  CLOSED_TERRAINS,
  ON_ROAD_LI,
  SIGHT_CLOSED,
  SIGHT_OPEN,
} from '../../content/map/travel.ts';
import { RARITY_IDS, type RarityId } from '../../content/rarity.ts';
import { realm as realmInfo, realmIndex, REALMS, type RealmId } from '../../content/realms.ts';
import { CLOSE_WOUND } from '../../content/resolver.ts';
import { template as rosterTemplate } from '../../content/roster.ts';
import { hasCopy } from '../../content/copies.ts';
import { startFight, preview, type Fight } from '../combat/fight.ts';
import type { Combatant } from '../combat/combatant.ts';
import { generateBeast, generateCultivator, generatePack } from '../combat/generate.ts';
import type { Npc } from '../combat/generate.ts';
import { kitOf } from '../loot.ts';
import { nameOf, personSlots } from '../people.ts';
import { hashSeed, Rng } from '../rng.ts';
import {
  actorFromCultivator,
  actorFromNpc,
  lowestShown,
  plainActor,
  sizeAt,
  YOU,
  type Actor,
} from '../resolver/actor.ts';
import { capability, isBeyond, readRealm, verdict, type Verdict } from '../resolver/check.ts';
import { applyEffects } from '../resolver/effects.ts';
import { grudges } from '../resolver/opinion.ts';
import { step } from '../resolver/plan.ts';
import { checkFor, startScene, type Scene, type SceneFeature } from '../resolver/scene.ts';
import { endState, heatOf, startState, statesOf, type RealmStage } from '../resolver/world.ts';
import { addEvent, addItem, itemCount, withPlayer, withStream, type GameState } from '../state.ts';
import { seasonOf } from '../chronicle.ts';
import { bandAt, edgeBand } from './depth.ts';
import type { Pt } from './geometry.ts';
import { lineDist } from './geometry.ts';
import { known, raise } from './fog.ts';
import { areaAt, terrainAt, type RegionMap } from './region.ts';
import type { Encounter, MapLife, Stance } from './schema.ts';

// ---------------------------------------------------------------- hooks

let copyGain: (s: GameState, id: string) => GameState = (s) => s;

/** How a copy in the loot comes home: life.ts registers `gainCopy`, so a copy never goes in the Bag. */
export function setCopyGain(f: (s: GameState, id: string) => GameState): void {
  copyGain = f;
}

// ---------------------------------------------------------------- bands and people

/** The realm and stage a band's people stand at, seeded within its third. */
export function bandRealm(band: number, rng: Rng): { realm: RealmId; stage: number } {
  const b = BANDS[Math.max(0, Math.min(BANDS.length - 1, band))]!;
  const stages = realmInfo(b.realm).stages;
  if (b.third === null) return { realm: b.realm, stage: rng.int(1, stages) };
  const inThird: number[] = [];
  for (let s = 1; s <= stages; s++)
    if (Math.min(3, Math.max(1, Math.ceil((s * 3) / stages))) === b.third) inThird.push(s);
  return { realm: b.realm, stage: rng.pick(inThird.length ? inThird : [1]) };
}

export interface Met {
  enc: Encounter;
  template: Template;
  you: Actor;
  /** Everyone the template's roles brought, on the encounter's side. */
  actors: Actor[];
  /** By actor id: the NPC behind a generated actor, for their kit. */
  npcs: Record<string, Npc>;
  /** By role id: its actors. */
  roles: Record<string, Actor[]>;
  scene: Scene;
}

const THEM = 'them';

function roleActors(s: GameState, enc: Encounter, role: Role, npcs: Record<string, Npc>): Actor[] {
  const rng = new Rng(hashSeed(`${enc.id}/${enc.seed}/${role.id}`));
  const at = bandRealm(Math.max(0, enc.band + (role.band ?? 0)), rng);
  const who = role.who;
  const idOf = (i: number) => `${enc.id}:${role.id}:${i + 1}`;
  if ('roster' in who) {
    const t = rosterTemplate(who.roster);
    if (t.kind === 'beast') {
      const pack = role.count
        ? Array.from({ length: rng.int(role.count[0], role.count[1]) }, (_, i) =>
            generateBeast(t, at.realm, at.stage, rng, { id: idOf(i), side: THEM }),
          )
        : generatePack(t, at.realm, at.stage, rng, THEM).map((n, i) => ({
            ...n,
            combatant: { ...n.combatant, id: idOf(i) },
          }));
      return pack.map((n) => {
        npcs[n.combatant.id] = n;
        return actorFromNpc(n, { name: role.name });
      });
    }
    const n = role.count ? rng.int(role.count[0], role.count[1]) : 1;
    return Array.from({ length: n }, (_, i) => {
      const npc = generateCultivator(t, at.realm, at.stage, rng, { id: idOf(i), side: THEM });
      npcs[idOf(i)] = npc;
      return actorFromNpc(npc, { name: role.name });
    });
  }
  if ('mortal' in who) {
    const n = role.count ? rng.int(role.count[0], role.count[1]) : 1;
    return Array.from({ length: n }, (_, i) =>
      plainActor({ id: idOf(i), name: role.name, side: THEM }),
    );
  }
  // A person the world keeps: the one with a grudge, or someone from home.
  const person = plotPerson(s, who.person);
  const t = rosterTemplate(who.person === 'grudge' ? 'garrison-deserter' : 'march-conscript');
  if (t.kind !== 'cultivator') return [];
  const npc = generateCultivator(t, at.realm, at.stage, rng, { id: idOf(0), side: THEM });
  npcs[idOf(0)] = npc;
  return [actorFromNpc(npc, { name: person ? nameOf(s, person) : role.name })];
}

/** Who a plot's role is: the first who holds a grudge, or the first of your origin's people. */
export function plotPerson(s: GameState, needs: 'grudge' | 'home'): string | null {
  if (needs === 'grudge') return grudges(s.world, s.player.id, s.calendar.day)[0]?.who ?? null;
  return Object.values(personSlots(s.player))[0] ?? null;
}

const FAVORS: Partial<Record<string, SceneFeature['favors']>> = {
  cover: ['stealth'],
  dark: ['stealth'],
  height: ['perception'],
};

/** The encounter's people and its scene, regenerated from its seed. */
export function meet(s: GameState, enc: Encounter): Met {
  const template = encounterTemplate(enc.template);
  const npcs: Record<string, Npc> = {};
  const roles: Record<string, Actor[]> = {};
  const actors: Actor[] = [];
  for (const r of template.roles) {
    const a = roleActors(s, enc, r, npcs);
    roles[r.id] = a;
    actors.push(...a);
  }
  const you = actorFromCultivator(s);
  const features: SceneFeature[] = template.place.features.map((f, i) => ({
    id: `f${i + 1}`,
    name: f.name,
    tags: [...f.tags],
    favors: [...new Set(f.tags.flatMap((t) => FAVORS[t] ?? []))],
  }));
  const scene = startScene({
    place: enc.id,
    region: s.map?.region,
    kind: 'wilds',
    traffic: template.place.traffic,
    danger: bandRealm(Math.max(0, enc.band), new Rng(enc.seed)),
    features,
    actors: [you, ...actors],
    players: [you.id],
  });
  return { enc, template, you, actors, npcs, roles, scene };
}

// ---------------------------------------------------------------- the fight's edge

/** The best a combatant lands on another in one exchange, by its strike or a technique, unrolled. */
function bestBlow(f: Fight, a: Combatant, target: Combatant): number {
  let best = 0;
  const strike = preview(f, a.id, { type: 'strike', target: target.id });
  if (strike) best = strike.chance * strike.damage;
  for (const id of Object.keys(a.techniques)) {
    const p = preview(f, a.id, { type: 'technique', id, target: target.id });
    if (p) best = Math.max(best, p.chance * p.damage);
  }
  return best;
}

function pool(c: Combatant): number {
  return c.hp + c.shield + (c.armor?.hp ?? 0);
}

export interface FightEdge {
  /** Exchanges you need to fell them all, quickest first. */
  yours: number;
  /** Exchanges they'd need to fell you, at the rate they hit you while you do. */
  theirs: number;
  /** Your strength over what you'd lose felling them: theirs over yours. */
  ratio: number;
  /** The share of your strength the fight would cost you. */
  costs: number;
  verdict: Verdict;
}

/**
 * A fight's edge with no dice (P3.7's talk), from both sheets' expected blows: you fell them one by
 * one, the quickest first, and each of them still standing strikes you every exchange. The ratio is
 * your strength (HP, shield and armor) over what that race takes from it: clear at ×1.25, close at ×1.
 */
export function fightEdge(you: Combatant, foes: readonly Combatant[]): FightEdge {
  if (!foes.length)
    return { yours: 0, theirs: Infinity, ratio: Infinity, costs: 0, verdict: 'clear' };
  const me = { ...you, side: YOU };
  const them = foes.map((c) => ({ ...c, side: THEM }));
  const f = startFight([me, ...them]);
  const order = them
    .map((t) => {
      const blow = bestBlow(f, me, t);
      return { need: blow > 0 ? pool(t) / blow : Infinity, hits: bestBlow(f, t, me) };
    })
    .sort((a, b) => a.need - b.need);
  let yours = 0;
  let taken = 0;
  let standing = order.reduce((n, o) => n + o.hits, 0);
  for (const o of order) {
    yours += o.need;
    taken += o.need * standing;
    standing -= o.hits;
  }
  const mine = pool(me);
  const ratio = taken > 0 ? mine / taken : Infinity;
  const theirs = Number.isFinite(ratio) ? yours * ratio : Infinity;
  return { yours, theirs, ratio, costs: Math.min(1, taken / mine), verdict: verdict(ratio, 1) };
}

// ---------------------------------------------------------------- what you can judge

export interface ExitView {
  i: number;
  exit: Exit;
  /** The true verdict, which decides. */
  verdict: Verdict;
  /** What your character can judge: "?" against what you can't read. */
  judged: Verdict | '?';
  /** "you'd need 4 exchanges, they need 7"; "Stealth against their noses". */
  why: string;
  /** Why it can't be chosen now. */
  refused: string | null;
  tried: boolean;
}

function faced(m: Met, e: Exit): Actor[] {
  const id = e.against ?? m.template.roles[0]?.id;
  if (!id) return [];
  return e.road === 'fight' ? m.actors : (m.roles[id] ?? []);
}

/** Whether you can read every one of them: a fight against what you can't read is "?". */
function readsAll(you: Actor, them: readonly Actor[]): boolean {
  return them.every((t) => readRealm(you, t).kind !== 'beyond');
}

const round = (n: number) => (Number.isFinite(n) ? Math.max(1, Math.round(n)) : '∞');

export function exitViews(s: GameState, m: Met): ExitView[] {
  return m.template.exits.map((exit, i) => {
    const tried = m.enc.tried.includes(i);
    let refused: string | null = tried ? 'Tried, and it fell short: nothing has changed.' : null;
    if (exit.cost?.stones && s.player.stones < exit.cost.stones)
      refused = `It costs ${exit.cost.stones} low-grade stones.`;
    if (exit.cost?.item && itemCount(s.player, exit.cost.item) <= 0)
      refused = `You have no ${hasItem(exit.cost.item) ? item(exit.cost.item).name : exit.cost.item}.`;
    const them = faced(m, exit);
    if (exit.road === 'fight') {
      const edge = fightEdge(m.you.combatant!, them.map((a) => a.combatant!).filter(Boolean));
      const judged = readsAll(m.you, them) ? edge.verdict : '?';
      const why =
        judged === '?'
          ? 'fight · you can’t read them'
          : edge.costs >= 1
            ? `fight · you’d fall before they do: ${round(edge.yours)} exchanges to fell them, ${round(edge.theirs)} to fell you`
            : `fight · you’d fell them in ${round(edge.yours)} exchanges, at about ${Math.round(edge.costs * 100)}% of your strength (×${edge.ratio >= 10 ? '10+' : edge.ratio.toFixed(2)})`;
      return { i, exit, verdict: edge.verdict, judged, why, refused, tried };
    }
    if (exit.road === 'take' || exit.road === 'pass' || exit.road === 'deal') {
      const why =
        exit.road === 'deal'
          ? exit.cost?.stones
            ? `${exit.cost.stones} low-grade stones`
            : exit.cost?.item
              ? `one ${hasItem(exit.cost.item) ? item(exit.cost.item).name : exit.cost.item}`
              : 'a deal'
          : exit.road === 'take'
            ? 'an hour off your road'
            : 'walk on';
      return { i, exit, verdict: 'clear', judged: 'clear', why, refused, tried };
    }
    const target = them[0];
    const check = checkFor(
      s,
      m.scene,
      m.you,
      step(exit.act, target && exit.road === 'talk' ? { target: target.id } : {}),
    );
    if (!check)
      return {
        i,
        exit,
        verdict: 'clear',
        judged: 'clear',
        why: 'nothing stands against it',
        refused,
        tried,
      };
    const words: Record<string, string> = {
      sneak: 'Stealth against their senses',
      hide: 'Stealth with the cover against their senses',
      flee: 'Speed against theirs',
      threaten: 'your presence against their nerve',
    };
    const why =
      words[exit.act] ??
      (exit.road === 'talk' ? 'a talk: what you bring against what stands against it' : '');
    return { i, exit, verdict: check.verdict, judged: check.judged, why, refused, tried };
  });
}

// ---------------------------------------------------------------- the stance

/** Whether the encounter must wait for you whatever your stance: a kept person, a plot. */
export function isBig(t: Template): boolean {
  return t.kind === 'plot' || t.roles.some((r) => r.big);
}

/**
 * The exit your stance takes, or null when it can't settle it (P3.7's talk). Avoid slips away,
 * takes finds and walks on; Careful hunts the sure kills too; Bold takes clear or close. No stance
 * talks or spends, and the big things always wait.
 */
export function stancePick(t: Template, views: readonly ExitView[], stance: Stance): number | null {
  if (isBig(t)) return null;
  const ok = (v: Verdict | '?') => v === 'clear' || (stance === 'bold' && v === 'close');
  const roads = stance === 'avoid' ? ['slip', 'take', 'pass'] : ['fight', 'slip', 'take', 'pass'];
  for (const v of views) {
    if (v.refused || v.exit.big || !roads.includes(v.exit.road)) continue;
    if (ok(v.judged)) return v.i;
  }
  return null;
}

// ---------------------------------------------------------------- settling

/** A rarity from the band's finds: "green and blue" at layers 7 to 9. */
function rarityOfBand(band: number, rng: Rng): RarityId {
  const words = BANDS[Math.max(0, Math.min(BANDS.length - 1, band))]!.finds.split(/ and |, /);
  const ids = words
    .map((w) => w.trim())
    .filter((w): w is RarityId => (RARITY_IDS as readonly string[]).includes(w));
  return ids.length ? rng.pick(ids) : 'white';
}

/** A find from a written thing at the band's rarity, held in its range. */
function findId(id: string, band: number, rng: Rng): string {
  if (!hasItem(id)) return id;
  const it = item(id);
  const range = rarityRange(it);
  let r = rarityOfBand(band, rng);
  if (!range.includes(r))
    r =
      RARITY_IDS.indexOf(r) < RARITY_IDS.indexOf(range[0]!) ? range[0]! : range[range.length - 1]!;
  const tier = Math.max(
    it.tier,
    realmIndex(BANDS[Math.max(0, Math.min(BANDS.length - 1, band))]!.realm) + 1,
  );
  return variantId(
    id,
    r,
    it.kind === 'herb' || it.kind === 'material'
      ? {}
      : { tier: tier === it.tier ? undefined : tier },
  );
}

function gain(s: GameState, id: string, n: number): GameState {
  if (hasCopy(id)) return copyGain(s, id);
  return withPlayer(s, addItem(s.player, id, n));
}

export interface Settled {
  state: GameState;
  /** What the card says happened, second person. */
  text: string;
  /** Still on the card: a talk that fell short. */
  stays: boolean;
  verdict: Verdict;
}

function applyStakes(s: GameState, m: Met, stakes: readonly Stake[], rng: Rng): GameState {
  let st = s;
  const pid = st.player.id;
  for (const k of stakes) {
    switch (k.do) {
      case 'wound':
        st = applyEffects(st, null, [
          { do: 'wound', who: pid, share: k.share, days: k.days },
        ]).state;
        break;
      case 'stones':
        st = withPlayer(st, { ...st.player, stones: Math.max(0, st.player.stones + k.n) });
        break;
      case 'robbed': {
        const lost = Math.floor(st.player.stones * k.share);
        st = withPlayer(st, { ...st.player, stones: st.player.stones - lost });
        if (k.item) {
          const held = Object.entries(st.player.items)
            .filter(([, n]) => n > 0)
            .map(([id]) => id)
            .sort();
          if (held.length) st = withPlayer(st, addItem(st.player, rng.pick(held), -1));
        }
        break;
      }
      case 'item':
        st = k.n >= 0 ? gain(st, k.id, k.n) : withPlayer(st, addItem(st.player, k.id, k.n));
        break;
      case 'loot': {
        const from = k.role ? (m.roles[k.role] ?? []) : m.actors;
        for (const a of from) {
          const npc = m.npcs[a.id];
          if (!npc) continue;
          const h = kitOf(npc);
          for (const [id, n] of Object.entries(h.items)) st = gain(st, id, n);
          st = withPlayer(st, { ...st.player, stones: st.player.stones + h.stones });
        }
        break;
      }
      case 'find': {
        const id = rng.pick(k.things);
        st = gain(st, findId(id, m.enc.band, rng), rng.int(k.n[0], k.n[1]));
        break;
      }
      case 'fuel': {
        const l = st.player.qi;
        st = withPlayer(st, {
          ...st.player,
          qi: { ...l, bar: Math.max(0, l.bar + k.share * Math.max(1, l.bar || 100)) },
        });
        break;
      }
      case 'hours':
        if (st.map) st = { ...st, map: { ...st.map, detour: st.map.detour + k.n * 40 } };
        break;
      case 'site':
        st = findNearestHidden(st, m.enc.at);
        break;
      case 'memory': {
        const who = m.roles[k.role]?.[0];
        if (who)
          st = applyEffects(st, null, [
            { do: 'memory', who: who.id, about: pid, row: k.row },
          ]).state;
        break;
      }
      case 'standing':
        st = applyEffects(st, null, [
          { do: 'standing', power: k.power, about: pid, row: k.row },
        ]).state;
        break;
      case 'heat':
        st = applyEffects(st, null, [
          { do: 'heat', holder: st.map?.region ?? 'qm-bianhuang', n: k.n },
        ]).state;
        break;
      case 'karma':
        st = applyEffects(st, null, [{ do: 'karma', who: pid, n: k.n }]).state;
        break;
      case 'place':
        break;
    }
  }
  return st;
}

/** The nearest hidden site that isn't Seen turns Seen: a lead followed. */
function findNearestHidden(s: GameState, at: Pt): GameState {
  const life = s.map;
  const map = mapHook(s);
  if (!life || !map) return s;
  const site = map.places
    .filter((p) => p.hidden && known(life, p.id) !== 'seen')
    .sort((a, b) => Math.hypot(a.x - at[0], a.y - at[1]) - Math.hypot(b.x - at[0], b.y - at[1]))[0];
  if (!site) return s;
  return addEvent({ ...s, map: raise(life, site.id, 'seen') }, 'found', { place: site.name });
}

let mapHook: (s: GameState) => RegionMap | null = () => null;
/** How the region's map is found from a state: travel.ts registers its mapOf, since travel.ts imports this file. */
export function setMapOf(f: (s: GameState) => RegionMap | null): void {
  mapHook = f;
}

/** The outcome an exit gives at a verdict, with the act's own when the template leaves it out. */
function outcomeOf(
  m: Met,
  e: Exit,
  v: Verdict,
): { o: ExitOutcome; extra: Stake[]; stays: boolean } {
  if (v === 'clear') return { o: e.pass, extra: [], stays: false };
  if (v === 'close') {
    if (e.close) return { o: e.close, extra: [], stays: false };
    const wound: Stake[] =
      e.road === 'fight' || e.road === 'slip'
        ? [{ do: 'wound', share: CLOSE_WOUND.share, days: CLOSE_WOUND.days }]
        : [];
    return { o: e.pass, extra: wound, stays: false };
  }
  if (e.short) return { o: e.short, extra: [], stays: false };
  if (e.road === 'talk')
    return {
      o: { text: 'It doesn’t land. They hear you out and don’t move.', line: 'is not heard out' },
      extra: [],
      stays: true,
    };
  // A slip or a fight fallen short: they have you, and the fight goes as the fight would.
  const greedy = m.template.roles.some(
    (r) =>
      r.motives?.includes('greed') &&
      !('roster' in r.who && rosterTemplate(r.who.roster).kind === 'beast'),
  );
  const lost: Stake[] = [{ do: 'wound', share: SHORT_WOUND.share, days: SHORT_WOUND.days }];
  if (greedy) lost.push({ do: 'robbed', share: ROBBED_SHARE, item: true });
  return {
    o: {
      text:
        e.road === 'slip'
          ? 'They see you, and it comes to blows you don’t win. You limp on.'
          : 'It goes against you. You limp away hurt.',
      line: `comes off worst against ${m.template.roles[0]?.name ?? 'the road'}`,
    },
    extra: lost,
    stays: false,
  };
}

/**
 * Settles an encounter by an exit at its true verdict: the stakes land, the road gets a line and the
 * chronicle one, and the card leaves, unless a talk fell short and it stays with that exit spent.
 */
export function settle(
  s: GameState,
  encId: string,
  i: number,
  by: 'you' | 'stance',
): Settled | null {
  const life = s.map;
  const enc = life?.encounters.find((e) => e.id === encId);
  if (!life || !enc) return null;
  const m = meet(s, enc);
  const view = exitViews(s, m)[i];
  if (!view || view.refused) return null;
  const e = view.exit;
  let st = s;
  if (e.cost?.stones)
    st = withPlayer(st, { ...st.player, stones: st.player.stones - e.cost.stones });
  if (e.cost?.item) st = withPlayer(st, addItem(st.player, e.cost.item, -1));
  const rng = new Rng(hashSeed(`${enc.id}/settle/${i}`));
  const { o, extra, stays } = outcomeOf(m, e, view.verdict);
  st = applyStakes(st, m, [...(o.stakes ?? []), ...extra], rng);
  const l = st.map!;
  if (stays) {
    return {
      state: {
        ...st,
        map: {
          ...l,
          encounters: l.encounters.map((x) =>
            x.id === enc.id ? { ...x, tried: [...x.tried, i] } : x,
          ),
        },
      },
      text: o.text,
      stays: true,
      verdict: view.verdict,
    };
  }
  const hurt = [...(o.stakes ?? []), ...extra].some((k) => k.do === 'wound');
  const kind =
    by === 'stance' ? 'settled' : hurt ? 'hurt' : e.road === 'fight' ? 'fight' : 'choice';
  const postings =
    enc.posting && view.verdict !== 'short'
      ? l.postings.map((p) => (p.id === enc.posting ? { ...p, done: true } : p))
      : l.postings;
  st = {
    ...st,
    map: {
      ...l,
      postings,
      encounters: l.encounters.filter((x) => x.id !== enc.id),
      road: [
        ...l.road,
        { day: st.calendar.day, kind: m.template.kind, text: o.text, template: m.template.id },
      ].slice(-40),
    },
  };
  st = addEvent(st, 'encounter', { line: o.line, where: enc.where, kind });
  return { state: st, text: o.text, stays: false, verdict: view.verdict };
}

/** Goes round a sensed encounter that hasn't found you: 60 li more cross-country. */
export function goRound(s: GameState, encId: string, by: 'you' | 'stance' = 'you'): GameState {
  const life = s.map;
  const enc = life?.encounters.find((e) => e.id === encId);
  if (!life || !enc || !canGoRound(enc)) return s;
  const t = encounterTemplate(enc.template);
  const text = `You went round ${t.title.charAt(0).toLowerCase()}${t.title.slice(1)}.`;
  const next: GameState = {
    ...s,
    map: {
      ...life,
      detour: life.detour + GO_ROUND_LI,
      encounters: life.encounters.filter((e) => e.id !== encId),
      road: [...life.road, { day: s.calendar.day, kind: t.kind, text, template: t.id }].slice(-40),
    },
  };
  return by === 'stance'
    ? next
    : addEvent(next, 'encounter', {
        line: `goes round ${t.title.toLowerCase()}`,
        where: enc.where,
        kind: 'choice',
      });
}

export function canGoRound(enc: Encounter): boolean {
  return enc.state === 'sensed' && enc.how === 'seen';
}

/** Lets a stance settle what it can when you reach it; the rest waits and stops the course. */
export function contact(s: GameState, encId: string): GameState {
  const life = s.map;
  const enc = life?.encounters.find((e) => e.id === encId);
  if (!life || !enc) return s;
  const m = meet(s, enc);
  const pick = stancePick(m.template, exitViews(s, m), life.stance);
  if (pick !== null) {
    const r = settle(s, encId, pick, 'stance');
    if (r && !r.stays) return r.state;
  }
  return {
    ...s,
    map: {
      ...life,
      encounters: life.encounters.map((e) =>
        e.id === encId ? { ...e, state: 'waiting', meetAt: null } : e,
      ),
    },
  };
}

/** You answer a card yourself: an exit, or going round. */
export function chooseExit(s: GameState, encId: string, i: number): Settled | null {
  return settle(s, encId, i, 'you');
}

export function waiting(life: MapLife | null): Encounter[] {
  return life?.encounters.filter((e) => e.state === 'waiting') ?? [];
}

// ---------------------------------------------------------------- the stance, the veil and talismans

/** Sets the stance; what waits on the road is tried again by it, so a bolder stance can settle it. */
export function setStance(s: GameState, stance: Stance): GameState {
  if (!s.map) return s;
  let st: GameState = { ...s, map: { ...s.map, stance } };
  for (const e of waiting(st.map)) st = contact(st, e.id);
  return st;
}

/** How far down you can show your realm: none without concealment (Veiled Aura, Hidden Realm). */
export function veilReach(s: GameState): { shown: RealmStage; stages: number } | null {
  const you = actorFromCultivator(s);
  const stages = you.stats.concealment ?? 0;
  if (stages < 1) return null;
  return { shown: lowestShown(you), stages };
}

/**
 * Travelling veiled (P3.7): a cover showing your concealment's lowest realm, which the watch and the
 * road's cultivators read; acting above it blows it, as any cover. Off, the cover ends.
 */
export type VeilCheck = { ok: true; state: GameState } | { ok: false; reason: string };
export function setVeil(s: GameState, on: boolean): VeilCheck {
  const life = s.map;
  if (!life) return { ok: false, reason: 'The map isn’t ready.' };
  const day = s.calendar.day;
  let world = s.world;
  for (const c of statesOf(world, s.player.id, 'cover', day)) world = endState(world, c.id);
  if (on) {
    const v = veilReach(s);
    if (!v)
      return {
        ok: false,
        reason: 'You have no concealment to veil your realm with (Veiled Aura, on the Qi tree).',
      };
    world = startState(
      world,
      s.player.id,
      { kind: 'cover', shown: v.shown, fooled: [] },
      day,
    ).world;
  }
  return { ok: true, state: { ...s, world, map: { ...life, veiled: on } } };
}

// ---------------------------------------------------------------- sensing

export function onRoadAt(map: RegionMap, p: Pt): boolean {
  return map.roads.some((r) => lineDist(p, r.pts) < ON_ROAD_LI);
}

/** How far you see on the map where you stand, or sense, whichever is farther. */
export function senseReach(map: RegionMap, p: Pt, sense: number): number {
  const sight = CLOSED_TERRAINS.includes(terrainAt(map, p)) ? SIGHT_CLOSED : SIGHT_OPEN;
  return Math.max(sight, sense);
}

function tierOfRealm(r: RealmId): number {
  return realmIndex(r) + 1;
}

/** Your Stealth against someone's perception: a burned talisman holds it at its tier's size against those up to its tier. */
function stealthAgainst(s: GameState, you: Actor, them: Actor): number {
  const own = capability(you, 'stealth');
  const h = s.map?.hidden;
  if (!h || h.until <= s.calendar.day) return own;
  const theirTier = tierOfRealm(realmOfTop(them));
  if (theirTier > h.tier) return own;
  const r = REALMS[Math.min(REALMS.length - 1, h.tier - 1)]!.id;
  return Math.max(own, sizeAt({ realm: r, stage: realmInfo(r).stages }));
}

function realmOfTop(a: Actor): RealmId {
  const rs = [a.rungs.qi, a.rungs.body, a.rungs.soul];
  return rs.reduce((best, r) => (realmIndex(r.realm) > realmIndex(best.realm) ? r : best)).realm;
}

export interface Sensed {
  how: Encounter['how'];
  /** A talisman was burned to keep from being found. */
  burned: string | null;
}

/** How an encounter meets you: seen at your sight's edge, sprung from hiding, or found you first. */
export function senseHow(s: GameState, m: Met, closed: boolean): Sensed {
  const t = m.template;
  if (!m.actors.length || t.kind === 'place' || t.kind === 'omen')
    return { how: 'seen', burned: null };
  const you = m.you;
  // It notices you: its Perception against your Stealth, a realm beyond and it found you first.
  const foundBy = (st: GameState) =>
    m.actors.some((a) => isBeyond(stealthAgainst(st, you, a), capability(a, 'perception')));
  let burned: string | null = null;
  if (foundBy(s)) {
    const top = Math.max(...m.actors.map((a) => tierOfRealm(realmOfTop(a))));
    const tal = Object.keys(s.player.items)
      .filter(
        (id) =>
          itemCount(s.player, id) > 0 && hasItem(id) && (item(id).uses.hide?.tier ?? 0) >= top,
      )
      .sort((a, b) => item(a).uses.hide!.tier - item(b).uses.hide!.tier)[0];
    if (!tal) return { how: 'found', burned: null };
    burned = tal;
  }
  if (t.lurks) {
    const help = closed ? COVER_HELP : 0;
    const theirs = Math.max(
      ...m.actors.map((a) => {
        const mortal =
          MORTALS[
            (t.roles.find((r) => a.id.includes(`:${r.id}:`))?.who as { mortal?: string })?.mortal ??
              ''
          ];
        return capability(a, 'stealth', { uses: help + (mortal?.hides ?? 0) });
      }),
    );
    if (verdict(capability(you, 'perception'), theirs) === 'short')
      return { how: 'sprung', burned };
  }
  return { how: 'seen', burned };
}

// ---------------------------------------------------------------- what comes

function hourIsNight(hour: number): boolean {
  return NIGHT_HOURS.includes(hour);
}

/** What the road can bring here: the templates whose where holds, by kind. */
function eligible(s: GameState, map: RegionMap, p: Pt, hour: number, onRoad: boolean): Template[] {
  const terrain = terrainAt(map, p);
  const night = hourIsNight(hour);
  const season = seasonOf(s.calendar.day);
  return ENCOUNTERS.filter((t) => {
    const w = t.where;
    if (t.goal) return false;
    if (w.terrain && !w.terrain.includes(terrain)) return false;
    if (w.road === 'on' && !onRoad) return false;
    if (w.road === 'off' && onRoad) return false;
    if (w.hours === 'night' && !night) return false;
    if (w.hours === 'day' && night) return false;
    if (w.season && !w.season.includes(season)) return false;
    if (
      w.site &&
      !map.places.some(
        (q) => w.site!.includes(q.sub as never) && Math.hypot(q.x - p[0], q.y - p[1]) < 1500,
      )
    )
      return false;
    if (w.needs && !plotPerson(s, w.needs)) return false;
    return true;
  });
}

/** The band an encounter of a kind comes at: the spot's off the road, people at yours ±1 on it. */
function bandFor(
  map: RegionMap,
  p: Pt,
  kind: EncounterKind,
  onRoad: boolean,
  yourBand: number,
  rng: Rng,
): number {
  const here = bandAt(map, p);
  if (!onRoad || kind === 'beast' || kind === 'place' || kind === 'omen') return here;
  const lo = edgeBand(map, p);
  const hi = Math.max(here, lo + 3);
  const b = yourBand + rng.int(-ROAD_PEOPLE_SPREAD, ROAD_PEOPLE_SPREAD);
  return Math.max(lo, Math.min(hi, b));
}

export interface Draw {
  template: Template;
  band: number;
}

/** Picks what comes: a kind by its shares, then a template at the band by weight. */
/** Whether a spot lies within a day's walk of a town or city (TOWN_PEACE_LI), where the watch keeps the road. */
export function inPeace(map: RegionMap, p: Pt): boolean {
  return map.places.some(
    (q) =>
      (q.sub === 'town' || q.sub === 'city') &&
      Math.hypot(q.x - p[0], q.y - p[1]) < TOWN_PEACE_LI,
  );
}

export function draw(
  s: GameState,
  map: RegionMap,
  p: Pt,
  hour: number,
  yourBand: number,
  rng: Rng,
): Draw | null {
  const onRoad = onRoadAt(map, p);
  // The watch keeps the road a day's walk round a town or city: nothing hostile comes there, by
  // the spot it would come at or where you stand.
  const calm = inPeace(map, p) || (!!s.map && inPeace(map, s.map.at));
  const pool = eligible(s, map, p, hour, onRoad).filter((t) => !(calm && t.hostile));
  const shares = { ...KIND_SHARES[onRoad ? 'road' : 'off'] };
  if (hourIsNight(hour))
    for (const [k, n] of Object.entries(NIGHT_SHIFT))
      shares[k as EncounterKind] = Math.max(0, shares[k as EncounterKind] + n!);
  const kinds = ENCOUNTER_KINDS.filter((k) => shares[k] > 0 && pool.some((t) => t.kind === k));
  if (!kinds.length) return null;
  const total = kinds.reduce((n, k) => n + shares[k], 0);
  let u = rng.next() * total;
  const kind = kinds.find((k) => (u -= shares[k]) < 0) ?? kinds[kinds.length - 1]!;
  const band = bandFor(map, p, kind, onRoad, yourBand, rng);
  const ofKind = pool.filter((t) => t.kind === kind);
  const dist = (t: Template) =>
    band < t.bands[0] ? t.bands[0] - band : band > t.bands[1] ? band - t.bands[1] : 0;
  const near = Math.min(...ofKind.map(dist));
  const fits = ofKind.filter((t) => dist(t) === near);
  const looksWeak = s.map?.veiled ?? false;
  // What the road brought lately comes less, so a crossing isn't the same post rider ten times.
  const recent = new Set([
    ...(s.map?.road ?? []).slice(-RECENT_LINES).map((l) => l.template),
    ...(s.map?.encounters ?? []).map((x) => x.template),
  ]);
  const weight = (t: Template) =>
    (t.weight ?? 1) *
    (recent.has(t.id) ? RECENT_WEIGHT : 1) *
    (looksWeak && t.roles.some((r) => r.motives?.includes('greed')) && t.kind === 'cultivator'
      ? WEAK_LOOKING
      : 1);
  const wTotal = fits.reduce((n, t) => n + weight(t), 0);
  let v = rng.next() * wTotal;
  const template = fits.find((t) => (v -= weight(t)) < 0) ?? fits[fits.length - 1]!;
  return { template, band: Math.max(0, band) };
}

/** The point on the course a reach of li ahead, and its index. */
function aheadOn(life: MapLife, li: number): { at: Pt; i: number } {
  const c = life.course!;
  let at: Pt = life.at;
  let left = li;
  for (let i = c.at; i < c.pts.length; i++) {
    const q = c.pts[i]!;
    const d = Math.hypot(q[0] - at[0], q[1] - at[1]);
    if (d >= left)
      return { at: [at[0] + ((q[0] - at[0]) * left) / d, at[1] + ((q[1] - at[1]) * left) / d], i };
    left -= d;
    at = q;
  }
  return { at, i: c.pts.length - 1 };
}

function whereWords(map: RegionMap, p: Pt): string {
  return areaAt(map, p)?.name ?? map.name;
}

/**
 * An encounter comes: drawn, its people made, sensed. Seen ones stand ahead on the course at the
 * edge of your sight or sense (Avoid goes round them at once); sprung ones and those that found you
 * meet you where you stand.
 */
export function arrive(
  s: GameState,
  map: RegionMap,
  hour: number,
  yourBand: number,
  sense: number,
  rng: Rng,
): GameState {
  const life = s.map!;
  if (!life.course || life.encounters.filter((e) => e.state === 'sensed').length >= MAX_AHEAD)
    return s;
  const reach = senseReach(map, life.at, sense);
  const ahead = aheadOn(life, reach);
  const d = draw(s, map, ahead.at, hour, yourBand, rng);
  if (!d) return s;
  const id = `e${Math.floor(s.calendar.day)}-${rng.int(0, 1e9)}`;
  const enc: Encounter = {
    id,
    template: d.template.id,
    seed: rng.int(0, 2 ** 31 - 1),
    band: d.band,
    at: [ahead.at[0], ahead.at[1]],
    meetAt: ahead.i,
    state: 'sensed',
    how: 'seen',
    tried: [],
    day: s.calendar.day,
    where: whereWords(map, ahead.at),
  };
  const closed = CLOSED_TERRAINS.includes(terrainAt(map, life.at));
  const m = meet(s, enc);
  const sensed = senseHow(s, m, closed);
  let st = s;
  if (sensed.burned) {
    st = withPlayer(st, addItem(st.player, sensed.burned, -1));
    st = {
      ...st,
      map: {
        ...st.map!,
        hidden: { until: st.calendar.day + HIDING_DAYS, tier: item(sensed.burned).uses.hide!.tier },
      },
    };
  }
  const met = sensed.how !== 'seen';
  const placed: Encounter = met
    ? {
        ...enc,
        how: sensed.how,
        at: [life.at[0], life.at[1]],
        meetAt: null,
        where: whereWords(map, life.at),
      }
    : enc;
  st = { ...st, map: { ...st.map!, encounters: [...st.map!.encounters, placed] } };
  if (met) return contact(st, placed.id);
  if (
    st.map!.stance === 'avoid' &&
    placed.how === 'seen' &&
    d.template.kind !== 'place' &&
    d.template.kind !== 'omen'
  )
    return goRound(st, placed.id, 'stance');
  return st;
}

/** The road's notice an hour adds: on a road or off it, by night, heat, flying and a group. */
export function noticeRate(
  s: GameState,
  map: RegionMap,
  hour: number,
  moving: boolean,
  flying: boolean,
): number {
  const life = s.map!;
  const onRoad = onRoadAt(map, life.at);
  let n = moving ? (onRoad ? NOTICE_ROAD : NOTICE_OFF) : NOTICE_CAMP;
  if (moving && hourIsNight(hour)) n *= NOTICE_NIGHT;
  n *= 1 + heatOf(s.world, s.player.id, s.calendar.day) / NOTICE_HEAT;
  if (flying) n *= NOTICE_FLYING;
  if (life.group) n *= NOTICE_GROUP;
  return n;
}

/**
 * One hour of the road: the notice fills, and when it is full an encounter comes; then anything
 * sensed that you have reached is met. Nothing fills while a card waits, since you are camped.
 */
export function roadHour(
  s: GameState,
  map: RegionMap,
  hour: number,
  share: number,
  moving: boolean,
  flying: boolean,
  yourBand: number,
  sense: number,
): GameState {
  let st = s;
  const life = st.map!;
  if (!life.course || waiting(life).length) return st;
  // Inns and found shelters are safe: only a camp in the open or a moving hour fills it.
  const sheltered =
    !moving &&
    map.places.some(
      (p) =>
        (p.kind === 'town' || p.sub === 'city') &&
        Math.hypot(p.x - life.at[0], p.y - life.at[1]) < 250,
    );
  if (!sheltered) {
    const n = life.notice.n + noticeRate(st, map, hour, moving, flying) * share;
    if (n >= life.notice.next) {
      const { value, state } = withStream(st, 'road', (rng) => {
        const next = NOTICE_THRESHOLD[0] + rng.next() * (NOTICE_THRESHOLD[1] - NOTICE_THRESHOLD[0]);
        return {
          next,
          after: arrive(
            { ...st, map: { ...st.map!, notice: { n: 0, next } } },
            map,
            hour,
            yourBand,
            sense,
            rng,
          ),
        };
      });
      st = { ...value.after, rng: state.rng };
    } else st = { ...st, map: { ...life, notice: { ...life.notice, n } } };
  }
  return meetReached(st);
}

/** Meets every sensed encounter the course has reached. */
export function meetReached(s: GameState): GameState {
  let st = s;
  const life = st.map;
  if (!life?.course) return st;
  for (const e of life.encounters) {
    if (e.state !== 'sensed' || e.meetAt === null) continue;
    const near = Math.hypot(e.at[0] - life.at[0], e.at[1] - life.at[1]) < CONTACT_LI;
    if (life.course.at >= e.meetAt || near) st = contact(st, e.id);
    if (waiting(st.map).length) break;
  }
  return st;
}

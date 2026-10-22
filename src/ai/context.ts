// The context builder (design § How GLM fits in, Context; § The resolver, What GLM sees). Every
// call sends, in this order: the fixed text (rules, world bible, voice, the acts), identical every
// call so hosts cache it; the region as you know it; your sheet; the scene; the recent turns and
// the chronicle's summary; then the role's task. Only what your character knows goes in: the
// places your fog has revealed or someone told you of, the powers you know of, the names you have
// learned, the scene's visible features and the people in it as you know them, and a truth only
// once a scene has shown it. Someone whose name you don't know goes in as "a stranger" under a ref
// of the scene's own (stranger-1), so even their id can't leak, and the interpreter's refs map back
// through the view. A person is told as behaviour, never adjectives: what you have learned of their
// leans, motives and quirks (content/behaviour.ts), their voice, which you hear, and the memories
// of you that you know they hold. Two or more people in a scene are told their voices differ.
import { leanBehaviour, MOTIVE_BEHAVIOUR, QUIRK_BEHAVIOUR } from '../content/behaviour.ts';
import { MASTERY } from '../content/mastery.ts';
import { MEMORIES } from '../content/memories.ts';
import { TIES } from '../content/people.ts';
import { template } from '../content/roster.ts';
import { realm as realmInfo, stageName } from '../content/realms.ts';
import { hasItem, item } from '../content/items.ts';
import { hasTechnique, technique } from '../content/techniques.ts';
import type { AxisId, Lean } from '../content/personality.ts';
import { realmOfActor, YOU, type Actor } from '../core/resolver/actor.ts';
import { readRealm } from '../core/resolver/check.ts';
import { knowsNature } from '../core/resolver/nature.ts';
import { knowsTie, memoriesOf, natureOf, tieOf } from '../core/resolver/opinion.ts';
import type { Scene } from '../core/resolver/scene.ts';
import type { RealmStage } from '../core/resolver/world.ts';
import { stonesOf, stonesWords } from '../core/purse.ts';
import type { GameState } from '../core/state.ts';
import type { ChatMessage } from './openrouter.ts';
import { FIXED_TEXT } from './prompts.ts';

// ── The atlas, as the context reads it ───────────────────────────────────────────────────────

export interface AtlasEntry {
  id: string;
  name: string;
  kind: string;
  type?: string;
  parent?: string | null;
  summary?: string;
  lore?: string;
  truth?: string;
  hidden?: boolean | string;
}

export interface Atlas {
  get(id: string): AtlasEntry | undefined;
  /** Every entry under a region, at any depth. */
  inRegion(region: string): AtlasEntry[];
}

/** The atlas handed in, as core's places are (core/resolver/knows.ts): tests and the app build it. */
export function atlasOf(entries: readonly AtlasEntry[]): Atlas {
  const byId = new Map(entries.map((e) => [e.id, e]));
  const regionOf = (e: AtlasEntry): string | null => {
    let at: AtlasEntry | undefined = e;
    for (let i = 0; at && i < 12; i++) {
      if (at.kind === 'region') return at.id;
      at = at.parent ? byId.get(at.parent) : undefined;
    }
    return null;
  };
  const byRegion = new Map<string, AtlasEntry[]>();
  for (const e of entries) {
    const r = regionOf(e);
    if (!r || r === e.id) continue;
    const list = byRegion.get(r);
    if (list) list.push(e);
    else byRegion.set(r, [e]);
  }
  return { get: (id) => byId.get(id), inRegion: (r) => byRegion.get(r) ?? [] };
}

// ── What you know ────────────────────────────────────────────────────────────────────────────

export type PlaceKnown = 'seen' | 'sketched' | 'told' | 'heard';

/** What you know of a place: seen or sketched on your map, told and known, or only heard of. */
export function placeKnown(s: GameState, id: string): PlaceKnown | null {
  const fog = s.map?.know[id];
  if (fog === 'seen' || fog === 'sketched') return fog;
  if (s.world.known.includes(`place:${id}`)) return 'told';
  if (fog === 'rumored' || s.world.heard.some((h) => h.fact === `place:${id}`)) return 'heard';
  return null;
}

/**
 * Whether you know of a power: its name learned or told, your own, the scene's, or an open power
 * of the region you stand in, since everyone there knows its sects and clans by name.
 */
export function powerKnown(s: GameState, scene: Scene, atlas: Atlas, viewer: string, id: string) {
  const e = atlas.get(id);
  if (!e) return false;
  if (s.world.known.includes(`name:${id}`) || s.world.known.includes(`place:${id}`)) return true;
  if (s.world.members.some((m) => m.who === viewer && m.power === id)) return true;
  if (scene.power === id) return true;
  return !e.hidden && e.parent === scene.region;
}

export function truthKnown(s: GameState, id: string): boolean {
  return s.world.known.includes(`truth:${id}`);
}

/** Whether you know someone's name: on your side, met, the name learned, or the law, named for what it is. */
export function nameKnown(s: GameState, viewer: string, a: Actor): boolean {
  if (a.id === viewer || a.side === YOU || a.side === 'law') return true;
  if (s.player.id === viewer && a.id in s.player.people) return true;
  return s.world.known.includes(`name:${a.id}`);
}

/** What a beast is, by its roster template's name, lowercased; null for anyone not a beast. */
function beastKind(a: Actor): string | null {
  if (!a.npc) return null;
  const t = template(a.npc.template);
  if (t.kind !== 'beast') return null;
  // One of a pack: "Ridge wolves" is a ridge wolf, "Stone apes" a stone ape.
  const name = t.name.toLowerCase();
  return name.endsWith('wolves')
    ? `${name.slice(0, -6)}wolf`
    : name.endsWith('s') && !name.endsWith('ss')
      ? name.slice(0, -1)
      : name;
}

/** What a stranger looks like: a roster template's name, as the road's encounters show it. */
function looksLike(a: Actor): string | null {
  if (!a.npc) return null;
  const t = template(a.npc.template);
  return t.name.toLowerCase();
}

// ── The view: what the context holds, and how its refs map back ─────────────────────────────

export interface Turn {
  /** Your words, or the clicked choice. */
  said: string;
  /** What the narrator told. */
  told: string;
}

export interface ContextInput {
  state: GameState;
  scene: Scene;
  atlas: Atlas;
  /** Whose eyes: a player actor's id; the scene's first player when absent. */
  viewer?: string;
  /** The last turns, oldest first; only the last six go in. */
  recent?: readonly Turn[];
  /** The chronicler's summary of the scene so far. */
  summary?: string;
  /** Notes the narrator and chronicler left, by the real id they are about. */
  notes?: Readonly<Record<string, readonly string[]>>;
}

export interface View {
  viewer: string;
  /** Ref in the context → the real id. */
  refs: Record<string, string>;
  /** Real id → the ref and how the context names it. */
  people: Record<string, { ref: string; label: string }>;
  /** Refs the interpreter may name beyond people: features, items, techniques, places, projects. */
  things: Set<string>;
  region: string;
  sheet: string;
  scene: string;
  recent: string;
}

/** The last turns that go in word for word. */
export const RECENT_TURNS = 6;

const clean = (s = '') => s.replace(/\[\[([^\]]+)\]\]/g, '$1').trim();

export function realmWords(r: RealmStage): string {
  return `${realmInfo(r.realm).name}, ${stageName(r.realm, r.stage)}`;
}

function regionText(s: GameState, scene: Scene, atlas: Atlas, viewer: string, things: Set<string>) {
  const region = atlas.get(scene.region);
  const lines = [`# Where you are: ${region?.name ?? 'the wilds'}`];
  if (region) {
    lines.push(clean(region.summary), clean(region.lore));
    if (truthKnown(s, region.id)) lines.push(`What you have learned: ${region.truth}`);
  }
  const places: string[] = [];
  const powers: string[] = [];
  for (const e of atlas.inRegion(scene.region)) {
    if (e.kind === 'power') {
      if (!powerKnown(s, scene, atlas, viewer, e.id)) continue;
      things.add(e.id);
      let line = `- ${e.name} (${e.type ?? 'power'}, id ${e.id}): ${clean(e.summary)}`;
      if (truthKnown(s, e.id)) line += ` What you have learned: ${e.truth}`;
      powers.push(line);
      continue;
    }
    const k = placeKnown(s, e.id) ?? (e.id === scene.place ? 'seen' : null);
    if (!k) continue;
    things.add(e.id);
    let line = `- ${e.name} (${e.kind}, id ${e.id})`;
    // Heard of is a name and a rough where, no more: what it is like waits for seeing it.
    if (k === 'heard') line += ': heard of, never seen';
    else line += `: ${clean(e.summary)}`;
    if (truthKnown(s, e.id)) line += ` What you have learned: ${e.truth}`;
    places.push(line);
  }
  if (places.length) lines.push('', 'Places you know of here:', ...places);
  if (powers.length) lines.push('', 'Powers you know of here:', ...powers);
  return lines.filter((l, i) => l !== '' || i > 0).join('\n');
}

function sheetText(s: GameState, me: Actor, things: Set<string>): string {
  const pronouns = me.id === s.player.id ? s.player.pronouns : undefined;
  const r = realmOfActor(me);
  const lines = [`# You: ${me.name}${pronouns ? ` (${pronouns})` : ''}`];
  lines.push(
    `Realm: ${realmWords(r)}; qi ${realmWords(me.rungs.qi)}, body ${realmWords(me.rungs.body)}, soul ${realmWords(me.rungs.soul)}.`,
  );
  if (me.shown) lines.push(`Showing others: ${realmWords(me.shown)} (your realm is veiled).`);
  if (me.disguised) lines.push('You wear another face.');
  if (me.wound > 0) lines.push(`Wounded: ${Math.round(me.wound * 100)}% off every line.`);
  const stones =
    me.id === s.player.id ? stonesWords(stonesOf(s.player)) : `${me.stones} low-grade stones`;
  lines.push(`Spirit stones: ${stones}.`);
  const techs = Object.entries(me.techniques).map(([id, lvl]) => {
    things.add(id);
    const name = hasTechnique(id) ? technique(id).name : id;
    return `${name} (${id}, ${MASTERY[Math.min(lvl, MASTERY.length - 1)]!.name})`;
  });
  if (techs.length) lines.push(`Techniques: ${techs.join('; ')}.`);
  const held = Object.entries(me.items)
    .filter(([, n]) => n > 0)
    .map(([id, n]) => {
      things.add(id);
      const name = hasItem(id) ? item(id).name : id;
      return `${name} (${id})${n > 1 ? ` ×${n}` : ''}`;
    });
  if (held.length) lines.push(`Carrying: ${held.join('; ')}.`);
  if (me.weapon !== 'none')
    lines.push(`A weapon to draw: ${me.weapon === 'gold' ? 'a fine one' : 'yes'}.`);
  const projects = s.world.projects
    .filter((p) => p.owner === me.id)
    .map((p) => {
      things.add(p.id);
      return `${p.name} (${p.id}), ${p.progress} of ${p.size} steps${p.hidden ? ', hidden' : ''}`;
    });
  if (projects.length) lines.push(`Your projects: ${projects.join('; ')}.`);
  return lines.join('\n');
}

/** What you know of someone's nature, told as what they do. */
function behaviourOf(s: GameState, a: Actor): string[] {
  const n = a.nature ?? natureOf(s.world, a.id);
  const out: string[] = [];
  for (const [axis, l] of Object.entries(n.axes) as [AxisId, Lean][]) {
    if (knowsNature(s.world, a.id, axis)) out.push(leanBehaviour(axis, l));
  }
  for (const q of n.quirks)
    if (knowsNature(s.world, a.id, `quirk:${q}`)) out.push(QUIRK_BEHAVIOUR[q]);
  for (const m of n.motives) {
    if (knowsNature(s.world, a.id, `motive:${m}`)) out.push(MOTIVE_BEHAVIOUR[m]);
  }
  return out;
}

function voiceOf(s: GameState, a: Actor): string {
  const v = (a.nature ?? natureOf(s.world, a.id)).voice;
  const parts = [`${v.register} speech`];
  if (v.habit) parts.push(v.habit);
  if (v.topic) parts.push(`talks of ${v.topic}`);
  return parts.join('; ');
}

const SIDE_WORDS = (a: Actor, me: Actor) =>
  a.side === me.side ? 'with you' : a.side === 'law' ? 'the law' : 'not with you';

function readWords(me: Actor, a: Actor): string {
  if (a.side === me.side) return realmWords(realmOfActor(a));
  const read = readRealm(me, a);
  if (read.kind === 'beyond') return "you can't see through their cultivation";
  return realmWords(read.realm);
}

function sceneText(
  s: GameState,
  scene: Scene,
  atlas: Atlas,
  me: Actor,
  view: Pick<View, 'people' | 'things'>,
  notes: ContextInput['notes'],
): string {
  const place = atlas.get(scene.place);
  const placeName =
    place && (placeKnown(s, place.id) || scene.place === place.id) ? place.name : null;
  const lines = [
    `# The scene: ${placeName ?? 'an unnamed spot'} (${scene.kind}${scene.open ? ', open' : ''}), ${scene.tick} ticks in`,
  ];
  if (scene.power) {
    const p = atlas.get(scene.power);
    if (p) lines.push(`It answers to ${p.name} (${scene.power}).`);
  }
  const features = scene.features.filter((f) => !f.hidden);
  if (features.length) {
    lines.push('Features:');
    for (const f of features) {
      view.things.add(f.id);
      const tags = f.tags.length ? ` [${f.tags.join(', ')}]` : '';
      const realm = f.realm ? `, ${realmWords(f.realm)}` : '';
      lines.push(`- ${f.id}: ${f.name}${tags}${realm}${f.broken ? ' (broken)' : ''}`);
    }
  }
  const others = scene.actors.filter((a) => a.id !== me.id && view.people[a.id]);
  if (others.length) lines.push('People here:');
  const voiced: string[] = [];
  for (const a of others) {
    const p = view.people[a.id]!;
    const where = a.state === 'present' ? '' : ` (${a.state})`;
    lines.push(
      `- ${p.ref}: ${p.label}${where}, ${SIDE_WORDS(a, me)}; realm as you read it: ${readWords(me, a)}.`,
    );
    const does = behaviourOf(s, a);
    if (does.length) lines.push(`  What you have seen of them: ${does.join('; ')}.`);
    if (a.state === 'present' || a.state === 'hidden') {
      lines.push(`  Voice: ${voiceOf(s, a)}.`);
      voiced.push(`${p.label} (${voiceOf(s, a)})`);
    }
    const tie = tieOf(s.world, me.id, a.id);
    const t =
      tie && s.world.ties.find((x) => [x.a, x.b].includes(a.id) && [x.a, x.b].includes(me.id));
    if (tie && t && knowsTie(t, me.id)) lines.push(`  To you they are: ${TIES[tie]}.`);
    const mem = memoriesOf(s.world, a.id, me.id, s.calendar.day)
      .filter((l) => l.memory.known.includes(me.id))
      .map((l) => {
        const v = Math.round(l.now);
        return `${l.memory.note ?? MEMORIES[l.memory.row].reason} ${v >= 0 ? '+' : ''}${v}${l.fading ? ' (fading)' : ''}`;
      });
    if (mem.length) lines.push(`  They remember of you: ${mem.join('; ')}.`);
    for (const note of notes?.[a.id] ?? []) lines.push(`  Note: ${note}`);
  }
  if (voiced.length >= 2)
    lines.push(`Their voices differ: ${voiced.join('; ')}. Never let them sound alike.`);
  if (scene.noise && scene.noise.until > scene.tick) {
    lines.push(`A noise rings out ${scene.noise.li} li.`);
  }
  for (const note of notes?.[scene.place] ?? []) lines.push(`Note on this place: ${note}`);
  return lines.join('\n');
}

function recentText(input: ContextInput): string {
  const lines = ['# Recent'];
  if (input.summary) lines.push(`So far: ${input.summary}`);
  const turns = (input.recent ?? []).slice(-RECENT_TURNS);
  for (const t of turns) lines.push(`You: ${t.said}`, `Told: ${t.told}`);
  if (lines.length === 1) lines.push('The scene has just begun.');
  return lines.join('\n');
}

/** Everything the context holds for one viewer, and its refs. */
export function buildView(input: ContextInput): View {
  const { state: s, scene, atlas } = input;
  const viewer = input.viewer ?? scene.players[0] ?? s.player.id;
  const me = scene.actors.find((a) => a.id === viewer);
  if (!me) throw new RangeError(`${viewer} is not in the scene`);
  const things = new Set<string>();
  const refs: Record<string, string> = {};
  const people: View['people'] = {};
  let strangers = 0;
  let beasts = 0;
  for (const a of scene.actors) {
    if (a.id === viewer) continue;
    // Someone hiding from you isn't there to you; the gone and the fled have left.
    if (a.state === 'gone' || a.state === 'fled') continue;
    if (a.state === 'hidden' && a.side !== me.side) continue;
    // A beast is no stranger: it goes by what it is, "a ridge wolf" (P3.9).
    const kind = beastKind(a);
    if (kind) {
      const ref = `${kind.replace(/\W+/g, '-')}-${++beasts}`;
      refs[ref] = a.id;
      people[a.id] = { ref, label: `${/^[aeiou]/.test(kind) ? 'an' : 'a'} ${kind}` };
      continue;
    }
    const known = nameKnown(s, viewer, a);
    const ref = known ? a.id : `stranger-${++strangers}`;
    refs[ref] = a.id;
    const looks = known ? null : looksLike(a);
    const an = looks && /^[aeiou]/.test(looks) ? 'an' : 'a';
    const label = known ? a.name : looks ? `a stranger, ${an} ${looks} by the look` : 'a stranger';
    people[a.id] = { ref, label };
  }
  refs[viewer] = viewer;
  people[viewer] = { ref: viewer, label: 'you' };
  const region = regionText(s, scene, atlas, viewer, things);
  const sheet = sheetText(s, me, things);
  const sceneOut = sceneText(s, scene, atlas, me, { people, things }, input.notes);
  return {
    viewer,
    refs,
    people,
    things,
    region,
    sheet,
    scene: sceneOut,
    recent: recentText(input),
  };
}

/** The context's messages for a role: the fixed text and region, the role's job, then the rest. */
export function contextMessages(view: View, roleTask: string, task: string): ChatMessage[] {
  return [
    { role: 'system', content: [FIXED_TEXT, view.region, roleTask].join('\n\n') },
    { role: 'user', content: [view.sheet, view.scene, view.recent, task].join('\n\n') },
  ];
}

/** How the context names someone: their label, or "someone" for anyone it leaves out. */
export function labelOf(view: View, id: string): string {
  return view.people[id]?.label ?? 'someone';
}

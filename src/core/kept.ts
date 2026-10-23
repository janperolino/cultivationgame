// Who stays (design § Enemies, beasts and the people you meet, Who stays): the kept rule. A
// generated person is thrown away when their scene ends, unless it ends with a thread: they
// remember you, they are tied to you, they follow you, or you took something from them. Then the
// world keeps them as a seed plus pins (`world.kept`): the template and seed regenerate their kit
// and rolls on demand, and the pins are what changed, their nature, where they belong, the realm
// they reached and what you took. Named atlas people are kept from the start in content.
import { hasPerson } from '../content/people.ts';
import { template as rosterTemplate } from '../content/roster.ts';
import { generateBeast, generateCultivator, type Npc } from './combat/generate.ts';
import { kitOf, ringOf, type Haul } from './loot.ts';
import type { Actor } from './resolver/actor.ts';
import { rollNature } from './resolver/nature.ts';
import type { Kept } from './resolver/opinion.ts';
import type { Scene } from './resolver/scene.ts';
import type { World } from './resolver/world.ts';
import { Rng } from './rng.ts';

/** Whether someone's scene ended with a thread to `you`: memory, tie, bond or something taken. */
export function threaded(w: World, id: string, you: string): boolean {
  if (w.memories.some((m) => m.holder === id && m.about === you)) return true;
  if (w.ties.some((t) => (t.a === id && t.b === you) || (t.b === id && t.a === you))) return true;
  if (w.bonds.some((b) => b.follower === id && b.leader === you)) return true;
  const k = w.kept[id];
  return !!k && (Object.keys(k.took ?? {}).length > 0 || (k.tookStones ?? 0) > 0);
}

/** Keeps a generated actor as a seed plus pins; anyone named or already kept stays as they are. */
export function keep(w: World, a: Actor, home: string | null): World {
  // A crowd's face made someone, or a door's keeper (P3.9b), is kept as a generated person is.
  const keeper = a.id.startsWith('keeper:');
  if (hasPerson(a.id) || w.kept[a.id] || (!a.npc && !a.face && !keeper)) return w;
  const kept: Kept = {
    name: a.name,
    nature: a.nature ?? rollNature(a.id),
    power: a.power ?? null,
    home,
    ...(a.npc
      ? {
          template: a.npc.template,
          seed: a.npc.seed,
          realm: { realm: a.npc.realm, stage: a.npc.stage },
        }
      : {}),
    ...(a.face
      ? {
          face: a.face.key,
          born: a.face.born,
          ...(a.face.mortal ? { mortal: a.face.mortal } : {}),
        }
      : {}),
  };
  return { ...w, kept: { ...w.kept, [a.id]: kept } };
}

/** At a scene's end: everyone generated whose scene left a thread to `you` is kept. */
export function keepThreaded(w: World, scene: Scene, you: string, home: string | null): World {
  let out = w;
  for (const a of scene.actors) {
    if (a.id !== you && (a.npc || a.face || a.id.startsWith('keeper:')) && threaded(out, a.id, you))
      out = keep(out, a, home);
  }
  return out;
}

/**
 * What you took from someone: they are kept from then on (taking is a thread), it is pinned on
 * them, and an item taken from someone of a power is that power's stolen goods.
 */
export function noteTaken(
  w: World,
  from: Actor,
  items: Record<string, number>,
  stones: number,
  home: string | null,
): World {
  let out = keep(w, from, home);
  const k = out.kept[from.id];
  if (k) {
    const took = { ...(k.took ?? {}) };
    for (const [id, n] of Object.entries(items)) took[id] = (took[id] ?? 0) + n;
    out = {
      ...out,
      kept: { ...out.kept, [from.id]: { ...k, took, tookStones: (k.tookStones ?? 0) + stones } },
    };
  }
  if (from.power) {
    const taken = { ...out.taken };
    for (const id of Object.keys(items)) taken[id] = from.power;
    out = { ...out, taken };
  }
  return out;
}

/** A generated NPC from their template and seed, at a realm: the same person every time. */
export function npcFrom(templateId: string, seed: number, realm: Npc['realm'], stage: number): Npc {
  const t = rosterTemplate(templateId);
  const rng = new Rng(seed);
  return t.kind === 'beast'
    ? generateBeast(t, realm, stage, rng)
    : generateCultivator(t, realm, stage, rng);
}

/** A kept person regenerated from their seed and pins, or null for someone kept without one. */
export function keptNpc(w: World, id: string): Npc | null {
  const k = w.kept[id];
  if (!k?.template || k.seed === undefined || !k.realm) return null;
  return npcFrom(k.template, k.seed, k.realm.realm, k.realm.stage);
}

/** What a kept person still carries: their kit and ring from their seed, less what you took. */
export function keptHaul(w: World, id: string): Haul | null {
  const n = keptNpc(w, id);
  if (!n) return null;
  const k = w.kept[id]!;
  const kit = kitOf(n);
  const ring = ringOf(n);
  const items: Record<string, number> = { ...kit.items };
  for (const [i, c] of Object.entries(ring?.items ?? {})) items[i] = (items[i] ?? 0) + c;
  for (const [i, c] of Object.entries(k.took ?? {})) {
    const left = (items[i] ?? 0) - c;
    if (left > 0) items[i] = left;
    else delete items[i];
  }
  const stones = Math.max(0, kit.stones + (ring?.stones ?? 0) - (k.tookStones ?? 0));
  return { items, stones };
}

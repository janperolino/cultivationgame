// What someone does when nobody tells them (design § NPC basics, Motives; P3.4): each round an
// NPC with no plan acts on their strongest motive whose moment has come, else waits. Fear flees
// anyone read above them, revenge attacks someone they're hostile to if it isn't beyond them, duty
// calls the law on a deed they saw, loyalty and family join a fight against a member or kin, greed
// loots the fallen, ambition takes the scene's prize, pride answers an insult or a threat,
// curiosity watches. The leans bend it: the cruel finish the fallen, the craven flee sooner, the
// reckless fight what is beyond them, the hot-tempered answer an insult with blows. What they act
// on is what you learn of them. A plan given them overrides it all. Before any motive, a power's
// people who see a face its death talisman marked come at it, or call the law if it is past them.
import { GUARDED } from '../../content/organizations.ts';
import { LAW } from '../../content/resolver.ts';
import { realmIndex } from '../../content/realms.ts';
import type { AxisId, MotiveId } from '../../content/personality.ts';
import type { GameState } from '../state.ts';
import { realmOfActor, realmSizeOf, type Actor } from './actor.ts';
import { isBeyond, readRealm } from './check.ts';
import { traceFor } from './backers.ts';
import { lean, opinion, tieOf } from './opinion.ts';
import { LOVE_TIES } from '../../content/people.ts';
import { step, type Step } from './plan.ts';
import type { Scene } from './scene.ts';
import { actorNature } from './talk.ts';
import { standingOf } from './world.ts';

export interface Intent {
  /** The step they take, or none when they call the law instead. */
  step?: Step;
  /** They call the law on a deed they saw. */
  law?: boolean;
  /** What moved them: a motive, or a lean: what those watching learn of them; or a trace seen. */
  why: MotiveId | AxisId | 'trace';
  /** The scene's line for it: "means to flee". */
  means: string;
}

const standing = (a: Actor) => a.state === 'present';

/** How far above them someone reads: a realm's index above theirs, or beyond them. */
function readAbove(me: Actor, them: Actor): number {
  const r = readRealm(me, them);
  if (r.kind === 'beyond') return 99;
  return realmIndex(r.realm.realm) - realmIndex(realmOfActor(me).realm);
}

/** Whether a fight with them is past them: a whole realm's step stronger. */
function pastMe(me: Actor, them: Actor): boolean {
  return isBeyond(realmSizeOf(me), realmSizeOf(them));
}

/** What an NPC means to do this round, or null to wait. */
export function intentOf(s: GameState, scene: Scene, a: Actor): Intent | null {
  const w = s.world;
  const day = s.calendar.day;
  const n = actorNature(w, a);
  const others = scene.actors.filter((x) => x.id !== a.id);
  const foes = others.filter((x) => x.side !== a.side);
  const present = foes.filter(standing);
  const fallen = others.filter((x) => x.state === 'down' || x.state === 'dead');
  // Deeds done here this day, by someone still standing in the scene.
  const here = w.deeds.filter(
    (d) =>
      d.place === scene.place &&
      d.day === day &&
      others.some((x) => x.id === d.actor && standing(x)),
  );

  // The cruel finish a fallen foe; the merciful never do.
  if (lean(n, 'heart') <= -1) {
    const down = fallen.find((x) => x.state === 'down' && x.side !== a.side);
    if (down)
      return {
        step: step('finish', { target: down.id }),
        why: 'heart',
        means: `means to finish ${down.name}`,
      };
  }
  // The craven flee sooner than fear itself would.
  const nerve = lean(n, 'nerve');
  if (nerve <= -1) {
    const above = present.find((x) => readAbove(a, x) >= (nerve <= -2 ? 0 : 1));
    if (above) return { step: step('flee'), why: 'nerve', means: 'means to run' };
  }
  // A face their power's death talisman marked: they come at it, or call the law if it's past them.
  if (a.power) {
    const marked = present.find((x) => !x.disguised && traceFor(w, x.id, a.power!, day));
    const leak = marked ? traceFor(w, marked.id, a.power, day)?.data.method : undefined;
    // A leak's mark at cold and up is a fine demanded, not a blade (O5); hostile and below, on sight.
    if (marked && leak && !GUARDED.onSight.includes(standingOf(w, a.power, marked.id, day).word))
      return {
        why: 'trace',
        means: `knows ${marked.name}'s face, and demands the method back and a fine for it`,
      };
    if (marked) {
      if (!pastMe(a, marked))
        return {
          step: step('attack', { target: marked.id }),
          why: 'trace',
          means: `knows ${marked.name}'s face from the trace, and attacks`,
        };
      if (LAW[scene.kind] && scene.lawDue === null) {
        return { law: true, why: 'trace', means: `knows ${marked.name}'s face, and calls the law` };
      }
    }
  }
  // The hot-tempered answer an insult or a threat with blows.
  const insulted = (x: Actor) =>
    w.memories.some(
      (m) =>
        m.holder === a.id &&
        m.about === x.id &&
        m.day === day &&
        (m.row === 'insulted' ||
          m.row === 'threatened' ||
          m.row === 'humiliated' ||
          m.row === 'cost-face'),
    );
  if (lean(n, 'temper') >= 2) {
    const x = present.find(insulted);
    if (x)
      return {
        step: step('attack', { target: x.id }),
        why: 'temper',
        means: `means to strike ${x.name}`,
      };
  }

  for (const motive of n.motives) {
    switch (motive) {
      case 'fear': {
        const above = present.find((x) => readAbove(a, x) >= 1);
        if (above) return { step: step('flee'), why: 'fear', means: 'means to get away' };
        break;
      }
      case 'revenge': {
        const x = present.find(
          (o) =>
            opinion(w, a.id, o.id, day).word === 'hostile' &&
            (lean(n, 'nerve') >= 2 || !pastMe(a, o)),
        );
        if (x)
          return {
            step: step('attack', { target: x.id }),
            why: 'revenge',
            means: `means to kill ${x.name}`,
          };
        break;
      }
      case 'duty': {
        const seen = here.some((d) => d.knownBy[a.id]?.who && d.kind !== 'lie');
        if (seen && LAW[scene.kind] && scene.lawDue === null) {
          return { law: true, why: 'duty', means: 'means to call the law' };
        }
        break;
      }
      case 'loyalty':
      case 'family': {
        const harmed = here.find((d) => {
          if (!d.victim || !['assault', 'killing', 'robbery', 'kidnapping'].includes(d.kind))
            return false;
          if (motive === 'family') {
            const t = tieOf(w, a.id, d.victim);
            return !!t && LOVE_TIES.includes(t);
          }
          const victim = others.find((x) => x.id === d.victim);
          return !!a.power && victim?.power === a.power;
        });
        const doer = harmed && present.find((x) => x.id === harmed.actor);
        if (doer)
          return {
            step: step('attack', { target: doer.id }),
            why: motive,
            means: `means to fight ${doer.name}`,
          };
        break;
      }
      case 'greed': {
        const x = fallen.find((o) => o.stones > 0 || Object.values(o.items).some((k) => k > 0));
        if (x)
          return {
            step: step('loot', { target: x.id }),
            why: 'greed',
            means: `means to loot ${x.name}`,
          };
        break;
      }
      case 'ambition': {
        const prize = scene.features.find(
          (f) => f.tags.includes('prize') && !f.broken && !f.hidden,
        );
        if (prize)
          return {
            step: step('gather', { target: prize.id }),
            why: 'ambition',
            means: `means to take ${prize.name}`,
          };
        break;
      }
      case 'pride': {
        const x = present.find(insulted);
        if (x)
          return {
            step: step('challenge', { target: x.id }),
            why: 'pride',
            means: `means to challenge ${x.name}`,
          };
        break;
      }
      case 'curiosity': {
        const x = present.find((o) => scene.players.includes(o.id));
        if (x)
          return {
            step: step('watch', { target: x.id }),
            why: 'curiosity',
            means: `watches ${x.name}`,
          };
        break;
      }
    }
  }
  return null;
}

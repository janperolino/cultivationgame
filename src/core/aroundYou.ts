// Around you (People and ties' design, Street time and Around you; P3.9b). The lines a place's
// screens run beside the doors, seeded by the place, the day and the line's number so a reload runs
// the same street: the hour's own sounds, the kept who live there going about, what your deeds
// stirred, and the crowd's faces at their small business; one in four a small place card, played by
// its choices (capability against the people in it, never dice) or gone into with a key. The cast's
// lines plug in here at N3, from the same "present here" list the crowd fills.
import {
  AROUND_CARDS,
  CARD_EVERY,
  DOING,
  HOUR_LINES,
  type AroundCard,
} from '../content/aroundYou.ts';
import { SHORT_WOUND } from '../content/encounters/pace.ts';
import { PLACE_AIR } from '../content/placeAir.ts';
import { branchOf, facesAt, placeFacts } from './crowd.ts';
import { findings, wordOfPlace } from './goinPlace.ts';
import { actorFromCultivator, plainActor } from './resolver/actor.ts';
import { capability, verdict, type Verdict } from './resolver/check.ts';
import { applyEffects, type Effect } from './resolver/effects.ts';
import { hashSeed, Rng } from './rng.ts';
import type { GameState } from './state.ts';

export interface AroundLine {
  text: string;
  /** A small place card the line opens, when it is one. */
  card: AroundCard | null;
}

const capital = (t: string) => t.charAt(0).toUpperCase() + t.slice(1);

/** The n-th line of a place's day: seeded, so the same street runs the same way. */
export function aroundLine(s: GameState, placeId: string, n: number): AroundLine {
  const day = s.calendar.day;
  const rng = new Rng(hashSeed(`around/${s.lineage.id}/${placeId}/${Math.floor(day)}/${n}`));
  const facts = placeFacts(placeId);
  const crowd = PLACE_AIR[placeId]?.crowd ?? facts.crowd;
  if (n % CARD_EVERY === CARD_EVERY - 1) {
    const cards = AROUND_CARDS.filter((c) => !c.needs || (crowd[c.needs] ?? 0) > 0);
    if (cards.length) {
      const card = rng.pick(cards);
      return { text: card.line, card };
    }
  }
  const h = branchOf(day);
  const hour = HOUR_LINES.filter((l) => l.branch === h && (!l.needs || (crowd[l.needs] ?? 0) > 0));
  if (hour.length && rng.chance(0.3)) return { text: rng.pick(hour).line, card: null };
  // What your deeds stirred: the word going round.
  const word = wordOfPlace(s, placeId);
  if (word.length && rng.chance(0.3)) {
    return { text: `People are talking: ${rng.pick(word)}.`, card: null };
  }
  // The kept who live here, going about.
  const kept = Object.entries(s.world.kept).filter(
    ([id, k]) => k.home === placeId && s.world.people[id] !== 'dead',
  );
  if (kept.length && rng.chance(0.25)) {
    const [, k] = rng.pick(kept);
    return { text: `${capital(k.name)} passes, about some business of their own.`, card: null };
  }
  const faces = facesAt(facts, 'street:around', day, 1, crowd);
  const face = faces[0];
  if (!face) return { text: 'The street goes about its day.', card: null };
  return { text: `${capital(face.line)} ${rng.pick(DOING[face.tag])}.`, card: null };
}

/** Real seconds until the next line: 15 to 30, seeded by the line's number. */
export function aroundGap(placeId: string, n: number): number {
  const rng = new Rng(hashSeed(`around-gap/${placeId}/${n}`));
  return rng.int(15, 30);
}

export interface CardRun {
  state: GameState;
  text: string;
  verdict: Verdict | null;
}

/**
 * A small place card's choice (design § Street time and Around you): a check is your capability
 * against its people at the place's crowd realm a few layers up; what lands is a little karma,
 * renown, silver or the short wound, through the resolver's effects.
 */
export function playCard(
  s: GameState,
  card: AroundCard,
  i: number,
  who = s.player.id,
): CardRun | string {
  const c = card.choices[i];
  if (!c) return 'No such choice.';
  let v: Verdict | null = null;
  if (c.check) {
    const you = actorFromCultivator(s);
    const them = plainActor({
      id: `around:${card.id}`,
      name: 'them',
      side: 'them',
      realm: { realm: 'qi-condensation', stage: Math.min(9, 1 + c.check.up) },
    });
    const theirs = capability(them, c.check.yours === 'presence' ? 'composure' : c.check.yours);
    v = verdict(capability(you, c.check.yours), theirs);
  }
  const out = v === 'short' && c.fail ? c.fail : c.pass;
  const region = s.map?.region ?? '';
  const effects: Effect[] = [];
  if (out.karma) effects.push({ do: 'karma', who, n: out.karma });
  if (out.renown && region) effects.push({ do: 'renown', who, region, n: out.renown });
  if (out.taels) effects.push({ do: 'silver', who, n: out.taels });
  if ('hurt' in out && out.hurt)
    effects.push({ do: 'wound', who, share: SHORT_WOUND.share / 3, days: 2 });
  const state = effects.length ? applyEffects(s, null, effects).state : s;
  return { state, text: out.text, verdict: v };
}

/** What a place's kept frames turned up since you were last here, told as Around you's lines. */
export function aroundFindings(
  s: GameState,
  placeId: string,
): { state: GameState; lines: string[] } {
  const f = findings(s, placeId);
  return { state: f.state, lines: f.words.map((w) => `Word on the street: ${w}`) };
}

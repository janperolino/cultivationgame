// The fights you play, by where they came from (Fights you play): a spar asked of someone, a road
// encounter's exit, a seclusion card's choice. Each builds its start from the state and its seed,
// so the save's record of the fight (core/played.ts) replays it, and each takes its end back:
// the spar to the chronicle, the road's to its card's stakes, a card's to its outcome. P3.9 adds
// the scene's, through `endSceneFight` in core/resolver/scene.ts.
import { cardFight, resolveCard } from './cards.ts';
import { combatantIn, type Fight } from './combat/fight.ts';
import { roadFight, settlePlayed } from './map/encounters.ts';
import { burnFought, settleTrap, trapFight } from './formations.ts';
import { afterFight, fightEnd, openFight, replay, takeUpFlags, type FightEnd } from './played.ts';
import { endSpar, sparFight, sparWhy } from './spar.ts';
import type { FightFrom, GameState } from './state.ts';

/** The fight's start, built again from where it came from. */
export function fightStart(s: GameState, from: FightFrom): Fight | null {
  switch (from.kind) {
    case 'spar':
      return sparFight(s, from.who);
    case 'road':
      return roadFight(s, from.enc, from.exit);
    case 'card':
      return cardFight(s, from.uid, from.choice);
    case 'trap':
      return trapFight(s, from.ground);
  }
}

/** The fight under way as it stands now, replayed from its start; null with none. */
export function currentFight(s: GameState): Fight | null {
  if (!s.fight) return null;
  const start = fightStart(s, s.fight.from);
  return start ? replay(s, start) : null;
}

/** Asks someone for a spar: it opens on the stage. Returns why not as a string. */
export function askSpar(s: GameState, who: string): GameState | string {
  const why = sparWhy(s, who);
  if (why) return why;
  return openFight(s, { kind: 'spar', who });
}

/** Who you face, by name: "Elder Mo", or "ridge wolves (3)". */
export function foeNames(s: GameState, f: Fight): string {
  const foes = f.combatants.filter((c) => c.id !== s.player.id && c.side !== you(s, f)?.side);
  if (foes.length === 0) return 'nobody';
  const first = foes[0]!.name;
  return foes.length > 1 && foes.every((c) => c.name === first)
    ? `${first} (${foes.length})`
    : foes.map((c) => c.name).join(', ');
}

function you(s: GameState, f: Fight) {
  return combatantIn(f, s.player.id);
}

/** The techniques you threw in the fight, from the actions you took. */
function usedArts(s: GameState): string[] {
  const out: string[] = [];
  for (const a of s.fight?.actions ?? []) {
    const m = a.main as { type?: string; id?: string } | undefined;
    if (m?.type === 'technique' && m.id && !out.includes(m.id)) out.push(m.id);
  }
  return out;
}

const SPAR_WORDS: Record<FightEnd, string> = {
  won: 'You bring them down.',
  lost: 'You are brought down. It was a spar: you get up.',
  fled: 'You break away.',
  yielded: 'You yield.',
  talked: 'You talk them down.',
  draw: 'Neither of you can go on.',
};

export interface Finished {
  state: GameState;
  /** What the spar, the card or the road says happened. */
  text: string;
  end: FightEnd;
}

/**
 * Ends the fight that has ended and hands it back to where it came from; the clock runs again.
 * Null while it still runs.
 */
export function finishFight(s: GameState, f: Fight): Finished | null {
  const rec = s.fight;
  const end = fightEnd(f, s.player.id);
  if (!rec || !end) return null;
  const used = usedArts(s);
  const names = foeNames(s, f);
  const st = takeUpFlags(burnFought(afterFight(s, f), f), f, end, rec.from.kind === 'spar');
  switch (rec.from.kind) {
    case 'spar':
      return { state: endSpar(st, f, names, end, rec.from.who), text: SPAR_WORDS[end], end };
    case 'road': {
      const r = settlePlayed(st, rec.from.enc, rec.from.exit, end, f, used);
      return { state: r?.state ?? st, text: r?.text ?? '', end };
    }
    case 'card': {
      const r = resolveCard(st, rec.from.uid, rec.from.choice, { played: end });
      return { state: r.ok ? r.state : st, text: r.ok ? r.text : '', end };
    }
    case 'trap': {
      const r = settleTrap(st, rec.from.ground, end);
      return { ...r, end };
    }
  }
}

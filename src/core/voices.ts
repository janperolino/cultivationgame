// What a person keeps of you (P3.9b; design § The resolver, What lasts: Memories carry their story,
// A moment, Room; What GLM sees: People as you know them). Beside their memories each person keeps a
// voice: the three lines they said that sound most like them, how they address you (fixed the first
// time, changed only when the tie does), the narrator's six notes on them, and the summary their
// oldest faded rows fold into. A memory made in a scene takes the holder's own words (`felt`), a
// moment is the blank row the engine sizes, and a person holds forty rows before the faded ones fold.
import {
  FELT_WORDS,
  MEMORIES,
  MOMENT,
  ROOM,
  VOICE_LINES,
  VOICE_NOTES,
  type MemoryTag,
} from '../content/memories.ts';
import { ACTS, type ActInfo } from '../content/resolver.ts';
import {
  memoryShare,
  natureOf,
  opinion,
  remember,
  tieOf,
  type Memory,
} from './resolver/opinion.ts';
import type { StepResult } from './resolver/scene.ts';
import type { Voice, World } from './resolver/world.ts';
import type { GameState } from './state.ts';

export const NO_VOICE: Voice = { summary: '', lines: [], notes: [] };

export function voiceOf(w: World, id: string): Voice {
  return w.voices[id] ?? NO_VOICE;
}

function withVoice(w: World, id: string, v: Voice): World {
  return { ...w, voices: { ...w.voices, [id]: v } };
}

/** The scene's notes go to what each person keeps, six each, the oldest dropped. */
export function keepVoices(s: GameState): GameState {
  const g = s.goin;
  if (!g) return s;
  let w = s.world;
  for (const [id, notes] of Object.entries(g.notes)) {
    if (id === s.player.id || !notes.length) continue;
    const v = voiceOf(w, id);
    const all = [...v.notes, ...notes.filter((n) => !v.notes.includes(n))];
    w = withVoice(w, id, { ...v, notes: all.slice(-VOICE_NOTES) });
  }
  return w === s.world ? s : { ...s, world: w };
}

/** What a turn's telling leaves on its people, refs already mapped back (ai/narrate.ts `Lasts`). */
export interface TurnLasts {
  said: readonly { about: string; line: string }[];
  address: readonly { about: string; address: string }[];
  felt: readonly { about: string; felt: string }[];
  moment: {
    about: string;
    reason: string;
    story: string;
    tag: MemoryTag;
    sign: 'good' | 'bad';
  } | null;
}

const words = (t: string, n: number) => t.split(/\s+/).filter(Boolean).slice(0, n).join(' ');

/** Acts whose pass backs a real moment (design § A moment): a talk, a gift, a deed. */
function backs(r: StepResult): boolean {
  const info: ActInfo = ACTS[r.step.act];
  if (r.refused) return false;
  if (info.people && r.check && r.check.verdict !== 'short') return true;
  return r.step.act === 'gift' || r.deeds.length > 0;
}

/**
 * Keeps what a telling left (design § A voice is kept, Memories carry their story, A moment): a line
 * each said (the newest three), how they address you the first time, a memory's own words on the
 * newest memory of yours they made this scene without one, and at most one moment a person a scene,
 * slight ±2 or real ±5 when a step of yours that turn backs it.
 */
export function keepLasts(
  s: GameState,
  lasts: TurnLasts,
  results: readonly StepResult[] = [],
  me = s.goin?.scene.players[0] ?? s.player.id,
): GameState {
  const g = s.goin;
  if (!g) return s;
  const day = s.calendar.day;
  let w = s.world;
  for (const x of lasts.said) {
    const v = voiceOf(w, x.about);
    if (v.lines.includes(x.line)) continue;
    w = withVoice(w, x.about, { ...v, lines: [...v.lines, x.line].slice(-VOICE_LINES) });
  }
  for (const x of lasts.address) {
    const v = voiceOf(w, x.about);
    const tie = tieOf(w, x.about, me) ?? '';
    if (v.address && (v.addressTie ?? '') === tie) continue;
    w = withVoice(w, x.about, { ...v, address: x.address, addressTie: tie });
  }
  for (const x of lasts.felt) {
    const mine = w.memories
      .slice(g.went.memories)
      .filter((m) => m.holder === x.about && m.about === me && !m.felt);
    const last = mine[mine.length - 1];
    if (!last) continue;
    w = {
      ...w,
      memories: w.memories.map((m) =>
        m.id === last.id ? { ...m, felt: words(x.felt, FELT_WORDS) } : m,
      ),
    };
  }
  const m = lasts.moment;
  const marker = m ? `moment:${m.about}` : '';
  if (m && !g.scene.log.includes(marker) && g.scene.actors.some((a) => a.id === m.about)) {
    const real = results.some((r) => r.actor === me && r.step.target === m.about && backs(r));
    const size = real ? MOMENT.real : MOMENT.slight;
    w = remember(
      w,
      {
        holder: m.about,
        about: me,
        row: 'moment',
        value: m.sign === 'good' ? size : -size,
        note: words(m.reason, MOMENT.words),
        what: words(m.story, FELT_WORDS),
        tag: m.tag,
        known: [me],
      },
      day,
    );
    return {
      ...s,
      world: w,
      goin: { ...g, scene: { ...g.scene, log: [...g.scene.log, marker] } },
    };
  }
  return w === s.world ? s : { ...s, world: w };
}

// ── Room ─────────────────────────────────────────────────────────────────────────────────────

/** The rows someone holds of you, oldest first. */
function rowsOf(w: World, holder: string, about: string): Memory[] {
  return w.memories.filter((m) => m.holder === holder && m.about === about);
}

/** What a row counts today, before weights: its value times the share left. */
function nowOf(w: World, m: Memory, day: number): number {
  return m.value * memoryShare(m, natureOf(w, m.holder), day);
}

/**
 * The rows that fold (design § Room): past forty, the oldest faded small ones, faded to nothing
 * first; a row worth 20 or more either way never folds. Folded rows count nothing more: only those
 * faded to almost nothing go, so the sum barely moves.
 */
export function foldable(
  w: World,
  holder: string,
  about: string,
  day: number,
  all = false,
): Memory[] {
  const rows = rowsOf(w, holder, about);
  const over = all ? rows.length : rows.length - ROOM.rows;
  if (over <= 0) return [];
  const small = rows.filter(
    (m) =>
      Math.abs(m.value) < ROOM.keep &&
      Math.abs(nowOf(w, m, day)) < 2 &&
      MEMORIES[m.row].fade !== null,
  );
  const gone = small.filter((m) => nowOf(w, m, day) === 0);
  const fading = small.filter((m) => nowOf(w, m, day) !== 0);
  return [...gone, ...fading].slice(0, all ? small.length : over);
}

/** The summary's length: 120 words, 300 once their word for you is friendly, trusting or hostile. */
export function summaryWords(w: World, holder: string, about: string, day: number): number {
  const word = opinion(w, holder, about, day).word;
  return word === 'friendly' || word === 'trusting' || word === 'hostile'
    ? ROOM.long
    : ROOM.summary;
}

/**
 * Folds rows into someone's summary: the chronicler's words when it wrote them, else the rows' own
 * stories joined onto the summary so far, held to the summary's length. The three lines and how they
 * address you stay.
 */
export function fold(
  w: World,
  holder: string,
  about: string,
  rows: readonly Memory[],
  day: number,
  written?: string,
): World {
  if (!rows.length) return w;
  const ids = new Set(rows.map((m) => m.id));
  const v = voiceOf(w, holder);
  const told = rows.map((m) => m.what ?? m.note ?? MEMORIES[m.row].reason).join('; ');
  const summary = words(
    written ?? [v.summary, told].filter(Boolean).join('; '),
    summaryWords(w, holder, about, day),
  );
  return withVoice({ ...w, memories: w.memories.filter((m) => !ids.has(m.id)) }, holder, {
    ...v,
    summary,
  });
}

/** About how many tokens someone's context holds: their rows, their voice and their summary. */
export function contextTokens(w: World, holder: string, about: string): number {
  const v = voiceOf(w, holder);
  const rows = rowsOf(w, holder, about)
    .map((m) => `${m.note ?? MEMORIES[m.row].reason} ${m.what ?? ''} ${m.felt ?? ''}`)
    .join(' ');
  const text = [rows, v.summary, ...v.lines, ...v.notes, v.address ?? ''].join(' ');
  return Math.ceil(text.length / 4);
}

/** Whether someone needs folding before the next call: past forty rows, or past 5,000 tokens. */
export function needsFold(w: World, holder: string, about: string): boolean {
  return rowsOf(w, holder, about).length > ROOM.rows || contextTokens(w, holder, about) > ROOM.fold;
}

/** Whether Compact shows on their page: past 2,000 tokens. */
export function canCompact(w: World, holder: string, about: string): boolean {
  return contextTokens(w, holder, about) > ROOM.compact;
}

/**
 * Folds anyone in the scene whose rows of you are past forty or whose context is past 5,000 tokens
 * (design § Room), before the next call: their oldest faded rows into their summary.
 */
export function foldDue(s: GameState, me = s.goin?.scene.players[0] ?? s.player.id): GameState {
  const g = s.goin;
  if (!g) return s;
  let w = s.world;
  const day = s.calendar.day;
  for (const a of g.scene.actors) {
    if (a.id === me || !needsFold(w, a.id, me)) continue;
    const all = contextTokens(w, a.id, me) > ROOM.fold;
    w = fold(w, a.id, me, foldable(w, a.id, me, day, all), day);
  }
  return w === s.world ? s : { ...s, world: w };
}

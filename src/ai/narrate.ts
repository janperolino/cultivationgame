// The narrator and the chronicler (design § How GLM fits in). The narrator tells a step from the
// engine's outcome alone, streamed, then a JSON tail of next choices, memory notes and new names.
// A tail that fails its check is asked for alone, as structured output at 0.2 (the spike's retry,
// 40 of 40 valid), and failing that the scene's own clicks stand in; when the narrator can't be had
// at all, the outcome's plain lines tell it. The chronicler sums the scene up every ten turns and
// when you leave: a summary for the next calls' context, a Chronicle line and notes on the people
// and places, falling back to the summary so far and the templated line. Notes name only refs the
// context held, mapped back to their ids.
import { callJson, callRole, type Ai } from './call.ts';
import { contextMessages, type Turn, type View } from './context.ts';
import type { Outcome } from './outcome.ts';
import { CHRONICLER_TASK, NARRATOR_TASK, TAIL_TASK } from './prompts.ts';
import {
  checkTail,
  chronicleJsonSchema,
  chronicleSchema,
  narratorTailJsonSchema,
  narratorTailSchema,
  splitNarration,
  type NarratorTail,
} from './schemas.ts';

/** How long a telling runs: a scene's step, or a beat of a fight (design § The resolver, Narration). */
export const LENGTHS = { scene: [80, 200], beat: [15, 50] } as const;
export type Length = keyof typeof LENGTHS;

export interface Note {
  /** The id the note is about. */
  about: string;
  note: string;
}

export interface Lasts {
  said: { about: string; line: string }[];
  address: { about: string; address: string }[];
  felt: { about: string; felt: string }[];
  moment: (Omit<NonNullable<NarratorTail['moment']>, 'about'> & { about: string }) | null;
}

export const NO_LASTS: Lasts = { said: [], address: [], felt: [], moment: null };

export interface Narration {
  prose: string;
  choices: string[];
  notes: Note[];
  names: NarratorTail['names'];
  /** What lasts of the turn's people, refs mapped back to ids (P3.9b): lines, address, felt, a moment. */
  lasts: Lasts;
  /** What stood in: nothing, the tail asked for alone, the scene's own clicks, or the plain outcome. */
  fellBack: 'none' | 'tail' | 'choices' | 'prose';
}

/** The scene's own clicks, when no tail can be had: look, wait, talk to whoever is near, leave. */
export function defaultChoices(view: View): string[] {
  const near = Object.entries(view.people).find(([id]) => id !== view.viewer);
  return [
    'Look around',
    ...(near ? [`Talk to ${near[1].label.replace(/,.*$/, '')}`] : []),
    'Wait',
    'Leave',
  ].slice(0, 4);
}

/**
 * Streams the prose and holds back the tail: text goes out until a ``` fence opens, with a run of
 * backticks at the end held until it's clear they don't open one.
 */
export function proseStream(onProse: (text: string) => void): (piece: string) => void {
  let all = '';
  let sent = 0;
  let done = false;
  return (piece) => {
    if (done) return;
    all += piece;
    const fence = all.indexOf('```', sent);
    if (fence >= 0) {
      if (fence > sent) onProse(all.slice(sent, fence));
      done = true;
      return;
    }
    let end = all.length;
    while (end > sent && all[end - 1] === '`') end--;
    if (end > sent) {
      onProse(all.slice(sent, end));
      sent = end;
    }
  };
}

/** Notes kept only for refs the context held, by their ids. */
function notesFrom(view: View, raw: readonly { about: string; note: string }[]): Note[] {
  const out: Note[] = [];
  for (const m of raw) {
    const id = view.refs[m.about] ?? (view.things.has(m.about) ? m.about : null);
    if (id) out.push({ about: id, note: m.note });
  }
  return out;
}

export interface NarrateOptions {
  length?: Length;
  /** Words to tell it in, over `length` (P3.9's lengths by moment, content/goin.ts). */
  words?: readonly [number, number];
  /** What goes before the outcome: where you stand, the tone setting (ai/scene.ts). */
  before?: string;
  /** The prose as it streams, without the tail. */
  onProse?: (text: string) => void;
}

/** Tells one step's outcome. */
export async function narrate(
  ai: Ai,
  view: View,
  outcome: Outcome,
  opts: NarrateOptions = {},
): Promise<Narration> {
  const [lo, hi] = opts.words ?? LENGTHS[opts.length ?? 'scene'];
  const task = `${opts.before ? `${opts.before}\n\n` : ''}${outcome.text}\n\n# Tell it\nIn ${lo}-${hi} words, then the tail.`;
  const messages = contextMessages(view, NARRATOR_TASK, task);
  let text: string;
  try {
    const onToken = opts.onProse ? proseStream(opts.onProse) : undefined;
    text = (await callRole(ai, 'narrator', messages, {}, onToken)).text;
  } catch (e) {
    if (ai.signal?.aborted) throw e;
    const prose = outcome.plain.join(' ');
    opts.onProse?.(prose);
    return {
      prose,
      choices: defaultChoices(view),
      notes: [],
      names: [],
      lasts: NO_LASTS,
      fellBack: 'prose',
    };
  }
  const { prose, tailText } = splitNarration(text);
  const first = checkTail(tailText);
  if (first.ok) return told(view, prose, first.tail, 'none');
  // The tail alone, as structured output, from the prose already written; the scene isn't rerun.
  const again = await callJson(
    ai,
    'tail',
    contextMessages(view, TAIL_TASK, `# The scene as written\n${prose}`),
    narratorTailSchema,
    narratorTailJsonSchema,
    'tail',
  );
  if (again.ok) return told(view, prose, again.value, 'tail');
  return {
    prose,
    choices: defaultChoices(view),
    notes: [],
    names: [],
    lasts: NO_LASTS,
    fellBack: 'choices',
  };
}

function told(
  view: View,
  prose: string,
  tail: NarratorTail,
  fellBack: Narration['fellBack'],
): Narration {
  return {
    prose,
    choices: tail.choices,
    notes: notesFrom(view, tail.memory),
    names: tail.names,
    lasts: lastsFrom(view, tail),
    fellBack,
  };
}

/** The tail's lasting parts with refs mapped back; any about a ref the context never held dropped. */
function lastsFrom(view: View, tail: NarratorTail): Lasts {
  const idOf = (ref: string) => view.refs[ref] ?? null;
  const map = <T extends { about: string }>(xs: readonly T[] | undefined): T[] =>
    (xs ?? []).flatMap((x) => {
      const id = idOf(x.about);
      return id && id !== view.viewer ? [{ ...x, about: id }] : [];
    });
  const m = tail.moment ? (map([tail.moment])[0] ?? null) : null;
  return { said: map(tail.said), address: map(tail.address), felt: map(tail.felt), moment: m };
}

export interface Chronicle {
  summary: string;
  line: string;
  notes: Note[];
  fellBack: boolean;
}

/** How often the chronicler sums up: every ten turns, and when you leave (design § How GLM fits in). */
export const CHRONICLE_EVERY = 10;

/**
 * Sums up the turns since the last summary. Failing twice, the summary so far stands with the
 * turns' own words added, and the templated line goes in the Chronicle.
 */
export async function chronicle(
  ai: Ai,
  view: View,
  turns: readonly Turn[],
  opts: { summary?: string; templated: string },
): Promise<Chronicle> {
  const told = turns.map((t) => `You: ${t.said}\nTold: ${t.told}`).join('\n');
  const messages = contextMessages(
    view,
    CHRONICLER_TASK,
    `# The turns since the last summary\n${told}`,
  );
  const r = await callJson(
    ai,
    'chronicler',
    messages,
    chronicleSchema,
    chronicleJsonSchema,
    'chronicle',
  );
  if (r.ok) {
    return {
      summary: r.value.summary,
      line: r.value.line,
      notes: notesFrom(view, r.value.notes),
      fellBack: false,
    };
  }
  const summary = [opts.summary ?? '', ...turns.map((t) => t.told)].join(' ').trim().slice(-900);
  return { summary, line: opts.templated, notes: [], fellBack: true };
}

// The interpreter (design § The resolver, The pipeline; § How GLM fits in): your typed words become
// the resolver's plans (core/resolver/plan.ts). GLM names acts and the context's refs; the engine
// maps the refs back to ids, drops any the context never held, and checks each step against the
// plan's own schema, so words grant nothing. A clear sentence gives one reading, which goes straight
// to the Do it preview; an unclear one two or three, offered as buttons. Words that ask for nothing
// the character could try, or a reading that names only what isn't there, give nothing to do. A
// reply that fails its check is asked for again once, and then the interpreter gives up without
// acting for you: you say it another way, and no tick passes. In a fight, the interpreter reads one
// turn: a main action and a minor one (design § Combat).
import { NEW_FACE, NEW_SPOT } from '../content/goin.ts';
import { ACTS, type ActInfo } from '../content/resolver.ts';
import { PlanSchema, StepSchema, type Plan, type Step } from '../core/resolver/plan.ts';
import { callJson, type Ai } from './call.ts';
import { contextMessages, type View } from './context.ts';
import { FIGHT_TASK, INTERPRETER_TASK } from './prompts.ts';
import {
  actFromGlm,
  fightTurnJsonSchema,
  fightTurnSchema,
  interpretationJsonSchema,
  interpretationSchema,
  type FightTurn,
  type InterpretationReply,
  type ReadStep,
} from './schemas.ts';

export interface Reading {
  label: string;
  plan: Plan;
}

export type Interpretation =
  /** One reading when the words were clear; two or three to choose from when they weren't. */
  | { kind: 'plan'; readings: Reading[] }
  /** The words ask for nothing your character could try here. */
  | { kind: 'nothing'; reason: string }
  /** GLM couldn't give a checked reply twice: say it another way. Nothing was done. */
  | { kind: 'fallback'; reason: string };

export const FALLBACK_LINE = "The words don't take shape. Say it another way.";
export const NOTHING_THERE = 'Nothing like that is here.';

/** A ref the view holds, mapped back to its id; null for anything the context never held. */
function idOf(view: View, ref: string | null | undefined): string | null {
  if (!ref) return null;
  if (view.refs[ref]) return view.refs[ref];
  return view.things.has(ref) ? ref : null;
}

const STONES = 'stones';

/** One step GLM wrote, made the resolver's: refs mapped back, the verb filled; null if it can't be. */
export function toStep(view: View, r: ReadStep): Step | null {
  const act = actFromGlm(r.act);
  const info: ActInfo = ACTS[act];
  // A project act's project is its target, wherever GLM put it (it has filed it under goal).
  const target = idOf(view, r.target) ?? (info.target === 'project' ? idOf(view, r.goal) : null);
  // A spot the scene doesn't list yet is named, and the engine makes it (P3.9b, made frames).
  const newSpot = act === 'enter' && !target && !!r.as;
  // Someone in the crowd the context doesn't list is named, and the engine makes them (talk first).
  const newFace = info.target === 'person' && !target && !!r.who;
  // An act that needs a target and names none the context holds is aimed at nothing there.
  if (info.target && !target && !newSpot && !newFace) return null;
  const list = (refs: readonly string[] | null | undefined) =>
    (refs ?? []).map((x) => idOf(view, x)).filter((x): x is string => !!x);
  const step: Record<string, unknown> = { verb: info.verb, act };
  if (target) step.target = target;
  else if (newSpot) step.target = NEW_SPOT;
  else if (newFace) {
    step.target = NEW_FACE;
    step.who = r.who;
  }
  if (r.manner) step.manner = r.manner;
  const uses = list(r.uses);
  if (uses.length) step.uses = uses;
  const helpers = list(r.helpers);
  if (helpers.length) step.helpers = helpers;
  const group = list(r.group);
  if (group.length) step.group = group;
  const thing = r.thing === STONES ? STONES : idOf(view, r.thing);
  if (thing) step.thing = thing;
  if (r.n) step.n = r.n;
  if (r.offer) step.offer = r.offer;
  const about = idOf(view, r.about);
  if (about) step.about = about;
  const prop = idOf(view, r.prop);
  if (prop) step.prop = prop;
  if (r.show?.length) step.show = [...new Set(r.show)];
  if (r.as) step.as = r.as;
  if (r.shown) step.shown = r.shown;
  if (r.bond) step.bond = r.bond;
  const goal = idOf(view, r.goal);
  if (goal) step.goal = goal;
  const parsed = StepSchema.safeParse(step);
  return parsed.success ? parsed.data : null;
}

/** GLM's reply as the engine takes it: readings whose every step survived, or nothing to do. */
export function toInterpretation(view: View, reply: InterpretationReply): Interpretation {
  const readings: Reading[] = [];
  for (const r of reply.readings) {
    const steps = r.steps.map((x) => toStep(view, x));
    if (steps.some((x) => x === null)) continue;
    const plan = PlanSchema.safeParse({ actor: view.viewer, steps });
    if (plan.success) readings.push({ label: r.label, plan: plan.data });
  }
  if (readings.length) return { kind: 'plan', readings };
  return { kind: 'nothing', reason: reply.nothing ?? NOTHING_THERE };
}

/** Your words as plans. */
export async function interpret(ai: Ai, view: View, words: string): Promise<Interpretation> {
  const messages = contextMessages(view, INTERPRETER_TASK, `# The player types\n${words}`, {
    stores: true,
  });
  const r = await callJson(
    ai,
    'interpreter',
    messages,
    interpretationSchema,
    interpretationJsonSchema,
    'plan',
  );
  if (!r.ok) return { kind: 'fallback', reason: FALLBACK_LINE };
  return toInterpretation(view, r.value);
}

export type FightReading = { kind: 'turn'; turn: FightTurn } | { kind: 'fallback'; reason: string };

/**
 * Your words as a fight's turn, its ids mapped back as a plan's are; one it can't read falls back
 * to the buttons, never to an action picked for you.
 */
export async function interpretFight(ai: Ai, view: View, words: string): Promise<FightReading> {
  const messages = contextMessages(view, FIGHT_TASK, `# In the fight, the player types\n${words}`);
  const r = await callJson(ai, 'fight', messages, fightTurnSchema, fightTurnJsonSchema, 'turn');
  if (!r.ok) return { kind: 'fallback', reason: FALLBACK_LINE };
  const t = r.value;
  const back = (x: string | null | undefined) => idOf(view, x);
  return {
    kind: 'turn',
    turn: {
      ...t,
      main: { ...t.main, id: back(t.main.id), target: back(t.main.target) },
      minor: t.minor
        ? {
            ...t.minor,
            feature: back(t.minor.feature),
            onto: back(t.minor.onto),
            id: back(t.minor.id),
          }
        : null,
      uses: t.uses.map((u) => back(u)).filter((u): u is string => !!u),
    },
  };
}

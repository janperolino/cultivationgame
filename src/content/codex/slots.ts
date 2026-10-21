// The live numbers a codex entry or a guide may name as `{slot}` (content/codex/schema.ts), read
// from the constants the sims tune, so the words stay true when a number moves.
import { DUTY_PAY } from '../jobs.ts';
import {
  ATTENTION_CEILING,
  ATTENTION_FLOOR,
  FOCUS_DRAIN,
  HEAT_UNSETTLED_S,
  ORB_EVERY_S,
} from '../attention.ts';
import {
  BAR_CAP,
  MAJOR_FAIL_KEEP,
  MINOR_FAIL_LOSS,
  ODDS_PER_TENTH,
  PACE,
  STONE_QI,
  STONES_PER_QI_DAY,
  UNSETTLED_DAYS,
} from '../cultivation.ts';
import { DAWN_BONUS, DISCIPLINE_BONUS, ELEMENT_BONUS } from '../hours.ts';
import { READ_DAYS } from '../copies.ts';
import { ROOTS } from '../roots.ts';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const num = (x: number) => String(Math.round(x * 100) / 100);

const rootSpeed = (id: string) => num(ROOTS.find((r) => r.id === id)?.speed ?? 1);

export const CODEX_SLOTS: Readonly<Record<string, string>> = {
  /** Attention: being there, and full focus, as multipliers. */
  attentionThere: num(1 + ATTENTION_FLOOR),
  attentionFull: num(1 + ATTENTION_CEILING),
  /** Minutes full focus takes to drain to the floor. */
  focusDrainMinutes: num(1 / FOCUS_DRAIN / 60),
  orbEvery: `${ORB_EVERY_S[0]}–${ORB_EVERY_S[1]}`,
  heatUnsettledSeconds: num(HEAT_UNSETTLED_S),
  /** The faster clock past the tutorial layers. */
  pace: num(PACE),
  dutyPay: num(DUTY_PAY),
  rootMixed: rootSpeed('mixed'),
  rootTrue: rootSpeed('true'),
  rootSingle: rootSpeed('single'),
  rootHeavenly: rootSpeed('heavenly'),
  rootMutated: rootSpeed('mutated'),
  barCap: pct(BAR_CAP),
  oddsPerTenth: pct(ODDS_PER_TENTH),
  minorFailLoss: pct(MINOR_FAIL_LOSS),
  unsettledDays: num(UNSETTLED_DAYS),
  majorFailKeep: pct(MAJOR_FAIL_KEEP),
  stoneQi: pct(STONE_QI),
  stonesPerDay: num(STONES_PER_QI_DAY),
  elementBonus: pct(ELEMENT_BONUS),
  dawnBonus: pct(DAWN_BONUS),
  disciplineBonus: pct(DISCIPLINE_BONUS),
  readDaysWhite: num(READ_DAYS.white),
};

/** Fills `{slot}`s from the live numbers; an unknown slot is left as written, for the test to find. */
export function fillSlots(text: string, more: Readonly<Record<string, string>> = {}): string {
  return text.replace(/\{(\w+)\}/g, (all, k: string) => more[k] ?? CODEX_SLOTS[k] ?? all);
}

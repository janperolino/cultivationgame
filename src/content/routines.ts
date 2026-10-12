// Routines (design § Cultivation, the day is twelve double-hours): whole wheels learned from
// teachers, manuals and sects. Following one exactly, all twelve hours, earns the discipline bonus.
// Drafted in P1.4 for Jan's review. A new routine is an entry here, not new code.
import type { HourKind } from './hours.ts';

export interface Routine {
  id: string;
  name: string;
  pinyin: string;
  hanzi: string;
  /** Who teaches it, for the tooltip. */
  source: string;
  /** Twelve hours, from 子 round to 亥. */
  hours: readonly HourKind[];
}

// Shorthand for the hour lists, so each wheel reads as one line.
const q = 'qi';
const b = 'body';
const s = 'soul';
const st = 'study';
const p = 'practice';
const z = 'sleep';

export const ROUTINES: readonly Routine[] = [
  {
    id: 'watch-rotation',
    name: 'Watch Rotation',
    pinyin: 'Shouye Lunzhi',
    hanzi: '守夜轮值',
    source:
      "the March's garrison school: drill after dawn, letters after noon, and qi through every watch",
    //      子 丑 寅 卯 辰 巳 午 未  申 酉 戌 亥
    hours: [z, z, q, q, p, q, q, st, q, q, q, q],
  },
  {
    id: 'wall-drill',
    name: 'Wall Drill',
    pinyin: 'Chengqiang Caolian',
    hanzi: '城墙操练',
    source:
      "the Gongsun cadet school on the Wall of Piled Bones: spear at morning and evening, the body hardened at noon's heat",
    hours: [z, z, q, q, p, b, q, q, p, q, st, q],
  },
  {
    id: 'butchers-day',
    name: "Butcher's Day",
    pinyin: 'Tumen Rike',
    hanzi: '屠门日课',
    source:
      "the Beast-Butcher Gate's outer disciples: the body before the blade, and the blade before the books",
    hours: [z, z, q, q, b, b, q, p, q, q, st, q],
  },
  {
    id: 'lantern-hours',
    name: 'Lantern Hours',
    pinyin: 'Tideng Shi',
    hanzi: '提灯时',
    source:
      'the Night Bridge Society, whose work starts when the lanterns are lit: a nap at noon, and the evening for the soul',
    hours: [z, z, q, q, q, q, z, st, q, q, s, q],
  },
  {
    id: 'nine-midnights',
    name: 'Nine Midnights',
    pinyin: 'Jiu Ziye',
    hanzi: '九子夜',
    source:
      'a hermit of the Border Wilds, who sleeps through the noon glare; it keeps 子 and 丑 awake, so only Foundation can follow it',
    hours: [q, q, q, q, s, st, z, z, p, b, q, q],
  },
];

/** Until character creation (P1.7), every life is the cave orphan who went to the garrison school. */
export const PLACEHOLDER_ROUTINE = 'watch-rotation';

const byId = new Map(ROUTINES.map((r) => [r.id, r]));

export function routine(id: string): Routine {
  const r = byId.get(id);
  if (!r) throw new RangeError(`Unknown routine ${id}`);
  return r;
}

export function hasRoutine(id: string): boolean {
  return byId.has(id);
}

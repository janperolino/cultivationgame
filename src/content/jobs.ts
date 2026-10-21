// Jobs, posts and duty hours (design § Cultivation, Duty hours; § Professions, people and powers,
// Posts; O4). A job is an entry, not code: who gives it, where its shift is kept, the hours it puts
// on the home wheel as Duty 值, the lowest seat that holds it, its perk and how it is left. A job
// given by a power is a post, paid in its currency (and stones where the type pays them); one at a
// shop or office with no power behind it, or a power's post opened to outsiders, is a hire, paid in
// stones. The M3 posts, hires and perks are drafted for Jan's review. core/jobs.ts reads them.
import type { SeatId } from './organizations.ts';
import type { RealmId } from './realms.ts';

export interface Job {
  id: string;
  /** Named for the work: the Duty hours' name on the wheel. */
  name: string;
  hanzi: string;
  /** The power that gives it, or null for a shop or office with no power behind it. */
  power: string | null;
  /** Taken as a hire even with a power behind it: stones, no seat or currency (the Qian Clan's guard). */
  hire?: boolean;
  /** Its hall or office, in words: "the Wall's garrison", "the medicine garden 药园". */
  hall: string;
  /** Where it is taken and its shift kept, an atlas place id; null for a road job (the caravan guard). */
  place: string | null;
  /** The lowest seat that holds a post. */
  seat?: SeatId;
  /**
   * The least realm and stage a hire takes on (Sean's playtest, 2026-10-20: a layer-1 child was
   * hired to guard a warehouse), said on its posting before you take it.
   */
  from?: { realm: RealmId; stage: number };
  /** A deacon's or elder's post: one holder, not every member. */
  one?: boolean;
  /** Its hours on the home wheel, 0 at 子 round to 11 at 亥. */
  shift: readonly number[];
  /** What it gives beside its pay, a line of data (design § What membership gives and asks). */
  perk: string;
  /** How it is left: freely, or only by leaving its power (a dynasty's soldier deserts). */
  leave: 'free' | 'power';
  /**
   * A dangerous post (design: a harsh power's lower seats hold them): its pay times this, and the
   * raid template met once a month its shifts are kept, as a road card's risk (the checkpoint).
   */
  danger?: { pay: number; raid: string };
}

/**
 * A duty day pays this much a day's work on the realm curve (1.5 at Qi Condensation, 13.5 at
 * Foundation): above a day's wage and below the qi the same four hours give in seclusion, so
 * working never beats secluding (O4's talk).
 */
export const DUTY_PAY = 1.5;
/** The types that pay their posts half in stones, half in their currency. */
export const PAYS_STONES: readonly string[] = ['dynasty', 'guild'];

/** A duty day missed costs this standing row (−1), stacking to this many, fading over a season. */
export const MISSED_SHIFT = { row: 'missed-shift', most: 10 } as const;
/** A month with at least this share of its shifts kept: "Keeps our watch" (+2, to +10). */
export const KEPT_MONTH = { share: 0.5, row: 'kept-watch', most: 5 } as const;
/** A hire lets you go after this many duty days missed in a month. */
export const HIRE_LETS_GO = 7;

const r = (from: number, n: number) => Array.from({ length: n }, (_, i) => from + i);

export const JOBS: readonly Job[] = [
  // ── The March of Pacified Borders: the cadets' patrols and the garrison school's watch ──
  {
    id: 'wall-patrol',
    name: 'Patrol the Wall',
    hanzi: '巡城',
    power: 'qm-anbian-fu',
    hall: "the Wall's garrison",
    place: 'qm-duigu-qiang',
    seat: 'outer',
    shift: r(6, 4),
    perk: "the sutler's stores at cost",
    leave: 'power',
  },
  {
    id: 'school-watch',
    name: "Stand the school's watch",
    hanzi: '守夜',
    power: 'qm-anbian-fu',
    hall: 'the garrison school',
    place: 'qm-anbian-fu',
    seat: 'outer',
    shift: r(8, 4),
    perk: "the school's drill yard and its rations",
    leave: 'power',
  },
  // ── The Beast-Butcher Gate ──
  {
    id: 'gate-garden',
    name: 'Work the medicine garden',
    hanzi: '药园',
    power: 'qm-tushou-men',
    hall: 'the medicine garden 药园',
    place: 'qm-tushou-men',
    seat: 'outer',
    shift: r(4, 4),
    perk: "the garden's herbs at cost",
    leave: 'free',
  },
  {
    id: 'gate-mine',
    name: "Dig the Gate's mine",
    hanzi: '矿脉',
    power: 'qm-tushou-men',
    hall: 'the mine 矿脉',
    place: 'qm-tushou-men',
    seat: 'outer',
    shift: r(7, 4),
    perk: 'a share of the ore dug',
    leave: 'free',
  },
  {
    id: 'gate-strait-raid',
    name: 'Raid across the strait',
    hanzi: '渡海',
    power: 'qm-tushou-men',
    hall: 'the raiding boats 渡海船',
    place: 'qm-tushou-men',
    seat: 'outer',
    shift: r(8, 4),
    perk: 'a share of the cores cut',
    leave: 'free',
    danger: { pay: 2, raid: 'goal-raid-strait' },
  },
  {
    id: 'gate-law-deacon',
    name: "Keep the law hall's rolls",
    hanzi: '执法',
    power: 'qm-tushou-men',
    hall: 'the law hall 执法堂',
    place: 'qm-tushou-men',
    seat: 'inner',
    one: true,
    shift: r(4, 4),
    perk: "the law hall's authority over offenders",
    leave: 'free',
  },
  // ── The other sects that trade ──
  {
    id: 'reins-pens',
    name: 'Tend the spirit herds',
    hanzi: '牧兽',
    power: 'qm-baijiang-zong',
    hall: 'the beast pens',
    place: 'qm-baijiang-zong',
    seat: 'outer',
    shift: r(3, 4),
    perk: "the pens' beast feed and dung at cost",
    leave: 'free',
  },
  {
    id: 'pavilion-arrays',
    name: 'Feed the binding arrays',
    hanzi: '守阵',
    power: 'qm-fugu-ge',
    hall: 'the array hall',
    place: 'qm-fugu-ge',
    seat: 'outer',
    shift: r(5, 4),
    perk: "the array hall's spent flags and chalk at cost",
    leave: 'free',
  },
  {
    id: 'lamp-trimming',
    name: 'Trim the fen lamps',
    hanzi: '剪灯',
    power: 'qm-shoudeng-zong',
    hall: 'the lamp hall',
    place: 'qm-shoudeng-zong',
    seat: 'outer',
    shift: r(8, 4),
    perk: "the scripture pavilion's reading hours free",
    leave: 'free',
  },
  // ── Hires in the City of the Guarded Mouth ──
  {
    id: 'bounty-runner',
    name: 'Run for the bounty office',
    hanzi: '跑腿',
    power: null,
    hall: 'the bounty office',
    place: 'qm-shoukou-cheng',
    from: { realm: 'qi-condensation', stage: 4 },
    shift: r(3, 4),
    perk: "first pick of the board's postings",
    leave: 'free',
  },
  {
    id: 'qian-warehouse',
    name: 'Guard the Qian warehouse',
    hanzi: '守仓',
    power: 'qm-qian-shi',
    hire: true,
    hall: "the Qian Clan's trading house",
    place: 'qm-shoukou-cheng',
    from: { realm: 'qi-condensation', stage: 4 },
    shift: r(8, 4),
    perk: "the trading house's goods at its own price",
    leave: 'free',
  },
  // ── Day hires a rogue takes from the first layer (The opening, built: the rogue start) ──
  {
    id: 'stall-minding',
    name: "Mind the bounty office's stall",
    hanzi: '看摊',
    power: null,
    hall: 'the bounty office',
    place: 'qm-shoukou-cheng',
    shift: r(4, 4),
    perk: "the clerk's word on which postings pay",
    leave: 'free',
  },
  {
    id: 'dock-carrying',
    name: 'Carry on the River-Bend docks',
    hanzi: '扛包',
    power: null,
    hall: "the ferrymen's wharf",
    place: 'qm-hewan-cheng',
    shift: r(3, 4),
    perk: 'a boat downriver, asked no questions',
    leave: 'free',
  },
  {
    id: 'smugglers-porter',
    name: "Porter for the smugglers' factor",
    hanzi: '挑夫',
    power: null,
    hall: "the smugglers' factor on the terraces",
    place: 'qm-shiyan-guo',
    shift: r(8, 4),
    perk: "the factor's word on who is asking after whom",
    leave: 'free',
  },
  // ── On the road ──
  {
    id: 'caravan-guard',
    name: 'Guard the caravan',
    hanzi: '押镖',
    power: null,
    hall: 'a caravan',
    place: null,
    from: { realm: 'qi-condensation', stage: 4 },
    shift: [],
    perk: 'the road paid for, on the roads',
    leave: 'free',
  },
];

const byId = new Map(JOBS.map((j) => [j.id, j]));

export function hasJob(id: string): boolean {
  return byId.has(id);
}

export function job(id: string): Job {
  const j = byId.get(id);
  if (!j) throw new RangeError(`Unknown job ${id}`);
  return j;
}

/** Whether a job is a hire: no power behind it, or a power's post opened to outsiders. */
export function isHire(j: Job): boolean {
  return j.power === null || !!j.hire;
}

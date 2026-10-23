// Happenings (P3.9b; design § The world, Going in: Four layers): each its own small system on one
// template, where (a door kind at a power's seat), when (a schedule), its roles, how you join and
// what it gives by its own hook. The first is the elder's lecture at your own power's seat, members
// only, on the 1st and 15th at 辰 for two hours: insight by your soul against the lecture's tier,
// and a good question a talk check that can earn the elder's notice. Tournaments, auctions,
// recruitment days and the cast's gatherings (People and ties' N3, N6) come into the same slot.
// The elders and their subjects are drafted in P3.9b for Jan's review (docs/review-queue.md).
import type { RealmId } from './realms.ts';

export interface HappeningTemplate {
  id: string;
  name: string;
  /** The door kind it happens at, and whether only members of the place's power come in. */
  door: 'hall' | 'ground' | 'teahouse' | 'market';
  members: boolean;
  /** Days of the month (1 to 30) it falls on, the double-hour it opens at (子 = 0) and its length. */
  days: readonly number[];
  branch: number;
  hours: number;
}

export const LECTURE: HappeningTemplate = {
  id: 'lecture',
  name: 'the elder’s lecture',
  door: 'hall',
  members: true,
  days: [1, 15],
  branch: 4,
  hours: 2,
};

export const HAPPENINGS: readonly HappeningTemplate[] = [LECTURE];

/** Who lectures at a power's seat and on what: the subject's tier sets what your soul faces. */
export interface Lecturer {
  elder: string;
  realm: RealmId;
  subject: string;
  /** The tier of what is taught: your soul against its realm decides how much you take in. */
  tier: number;
}

export const LECTURERS: Readonly<Record<string, Lecturer>> = {
  'qm-tushou-men': {
    elder: 'Elder Mo',
    realm: 'foundation-establishment',
    subject: 'where a beast’s core sits by its kind, and the one cut that frees it whole',
    tier: 1,
  },
  'qm-fugu-ge': {
    elder: 'Elder Gu',
    realm: 'foundation-establishment',
    subject: 'reading a binding array’s eye from the drift of its qi',
    tier: 2,
  },
  'qm-baijiang-zong': {
    elder: 'Elder Han',
    realm: 'foundation-establishment',
    subject: 'the first month of a bond, when the beast decides who leads',
    tier: 1,
  },
  'qm-shoudeng-zong': {
    elder: 'Elder Wei',
    realm: 'foundation-establishment',
    subject: 'what the drowned want, and the three things a lamp must never be fed',
    tier: 2,
  },
  'qm-jingzhong-si': {
    elder: 'Abbot Jingkong',
    realm: 'core-formation',
    subject: 'stilling the heart before a breakthrough, by the bell’s nine strokes',
    tier: 2,
  },
  'qm-hu-shi': {
    elder: 'Elder Hu Shan',
    realm: 'foundation-establishment',
    subject: 'stone eyes: seeing qi through rock, and what it costs the sight',
    tier: 1,
  },
  'qm-qian-shi': {
    elder: 'Elder Qian Lu',
    realm: 'foundation-establishment',
    subject: 'appraising a core’s grade by its weight and its warmth',
    tier: 1,
  },
  'qm-yeqiao-hui': {
    elder: 'Old Ferryman Du',
    realm: 'foundation-establishment',
    subject: 'reading the tide-table, and when a crew lets a passenger drown',
    tier: 1,
  },
};

/**
 * What sitting a lecture pays (design § Happenings): two study days' insight for its two hours,
 * at full when your soul reads clear against its tier, less when close or short. A good question is
 * an ask of the elder; passed, they remember it.
 */
export const LECTURE_PAYS = { studyDays: 2, close: 0.6, short: 0.25 } as const;

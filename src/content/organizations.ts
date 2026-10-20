// Organizations (design § Professions, people and powers, Organizations share one skeleton, Seats
// and the currency; O1). Every atlas power carries a type, and a type is a preset for one
// skeleton: how you join, the currency, what it asks, how you leave, what it gives, and its six
// seats' names. A power overrides any part by its id; the atlas keeps only the type. A kingdom with
// no ruling power reads as a dynasty. Names stay in the cultivation novels' words (Jan's call).
// Drafted for Jan's review: every power's type (in the atlas), the seat names below, and the
// Border Wilds powers' overrides and treatment.
import type { OrgType, Population } from './atlas/schema.ts';
import type { RealmId } from './realms.ts';
import generated from './generated/organizations.json';

export { ORG_TYPES, type OrgType } from './atlas/schema.ts';

/** The six seats, lowest first, as Tale of Immortal's sects have them. */
export const SEAT_IDS = ['outer', 'inner', 'true', 'elder', 'grand', 'head'] as const;
export type SeatId = (typeof SEAT_IDS)[number];

export interface Title {
  name: string;
  hanzi: string;
}

/** A seat's name, and the greater one its holder takes from a realm up (a great shaman, an emperor). */
export interface SeatName extends Title {
  great?: Title & { from: RealmId };
}

/**
 * How a membership sits beside others: a house is served one at a time (sect, academy, temple,
 * dynasty, assassins); kin is blood, one at a time and kept (clan, tribe, beast power); the rest
 * stack (guild, society, gang).
 */
export type Bond = 'house' | 'kin' | 'stack';

/** How a power treats its own (design § What membership gives and asks). */
export const TREATMENTS = ['generous', 'fair', 'harsh'] as const;
export type Treatment = (typeof TREATMENTS)[number];

export interface OrgPreset {
  /** The type's name, as design's table has it. */
  name: string;
  bond: Bond;
  join: readonly string[];
  currency: Title;
  asks: readonly string[];
  /** Leaving by the rule: its words, and whether the rule is hunted (betrayal by itself). */
  leave: { words: string; hunted: boolean };
  gives: readonly string[];
  seats: Record<SeatId, SeatName>;
  /** Titles are the holders' realms (a beast power's), whatever the seat. */
  byRealm?: boolean;
}

const CONTRIBUTION: Title = { name: 'contribution', hanzi: '贡献' };
const t = (name: string, hanzi: string): SeatName => ({ name, hanzi });

export const ORG_PRESETS: Record<OrgType, OrgPreset> = {
  sect: {
    name: 'Sect, gate or palace',
    bond: 'house',
    join: ['a test'],
    currency: CONTRIBUTION,
    asks: ['duties', 'quotas'],
    leave: { words: 'released or expelled', hunted: false },
    gives: ['methods', 'a library'],
    seats: {
      outer: t('outer disciple', '外门弟子'),
      inner: t('inner disciple', '内门弟子'),
      true: t('true disciple', '真传弟子'),
      elder: t('elder', '长老'),
      grand: t('grand elder', '太上长老'),
      head: t('sect master', '宗主'),
    },
  },
  clan: {
    name: 'Clan',
    bond: 'kin',
    join: ['birth', 'adoption', 'marriage'],
    currency: CONTRIBUTION,
    asks: ['blood duty'],
    leave: { words: 'never quite', hunted: false },
    gives: ['inheritance', 'protection'],
    seats: {
      outer: t('branch clansman', '旁系'),
      inner: t('direct-line', '嫡系'),
      true: t('heir', '嫡传'),
      elder: t('clan elder', '族老'),
      grand: t('old ancestor', '老祖'),
      head: t('patriarch', '家主'),
    },
  },
  guild: {
    name: 'Guild or works',
    bond: 'stack',
    join: ['buying in', 'apprenticeship'],
    currency: CONTRIBUTION,
    asks: ['dues', 'trade quotas'],
    leave: { words: 'selling out', hunted: false },
    gives: ['markets', 'caravans', 'workshops'],
    seats: {
      outer: t('member', '会员'),
      inner: t('senior member', '高级会员'),
      true: t('guild steward', '执事'),
      elder: t('guild elder', '长老'),
      grand: t('guest elder', '客卿'),
      head: t('guild master', '会长'),
    },
  },
  gang: {
    name: 'Gang',
    bond: 'stack',
    join: ['a blood oath'],
    currency: { name: 'face', hanzi: '面子' },
    asks: ['territory', 'tribute'],
    leave: { words: 'in a box', hunted: true },
    gives: ['streets', 'fences'],
    seats: {
      outer: t('gang member', '帮众'),
      inner: t('incense master', '香主'),
      true: t('hall master', '堂主'),
      elder: t('elder', '长老'),
      grand: t('great elder', '大长老'),
      head: t('gang chief', '帮主'),
    },
  },
  society: {
    name: 'Society',
    bond: 'stack',
    join: ['recruited', 'sponsored'],
    currency: { name: 'trust', hanzi: '信' },
    asks: ['silence', 'favors'],
    leave: { words: 'hunted', hunted: true },
    gives: ['intelligence', 'smuggling', 'contacts'],
    seats: {
      outer: t('informant', '眼线'),
      inner: t('member', '会众'),
      true: t('hall master', '堂主'),
      elder: t('elder', '长老'),
      grand: t('great elder', '大长老'),
      head: t('society head', '会首'),
    },
  },
  assassins: {
    name: 'Assassins',
    bond: 'house',
    join: ['recruited'],
    currency: { name: 'trust', hanzi: '信' },
    asks: ['contracts', 'silence'],
    leave: { words: 'hunted', hunted: true },
    gives: ['poisons', 'marks'],
    seats: {
      outer: t('bronze-medal killer', '铜牌'),
      inner: t('silver-medal killer', '银牌'),
      true: t('gold-medal killer', '金牌'),
      elder: t('elder', '长老'),
      grand: t('great elder', '大长老'),
      head: t('house master', '楼主'),
    },
  },
  academy: {
    name: 'Academy',
    bond: 'house',
    join: ['an exam'],
    currency: CONTRIBUTION,
    asks: ['attendance', 'tests'],
    leave: { words: 'graduating', hunted: false },
    gives: ['teachers', 'alumni'],
    seats: {
      outer: t('student', '学子'),
      inner: t('inner student', '内院'),
      true: t('personal student', '亲传'),
      elder: t('teacher', '教习'),
      grand: t('grand teacher', '大教习'),
      head: t('academy head', '院长'),
    },
  },
  temple: {
    name: 'Temple or abbey',
    bond: 'house',
    join: ['vows'],
    currency: { name: 'merit', hanzi: '功德' },
    asks: ['vows', 'service'],
    leave: { words: 'breaking your vows', hunted: false },
    gives: ['sanctuary', 'Buddhist arts'],
    seats: {
      outer: t('novice', '沙弥'),
      inner: t('monk', '比丘'),
      true: t('abbot’s disciple', '亲传'),
      elder: t('elder monk', '长老'),
      grand: t('first seat', '首座'),
      head: t('abbot', '方丈'),
    },
  },
  dynasty: {
    name: 'Dynasty or army',
    bond: 'house',
    join: ['conscription', 'office'],
    currency: { name: 'military merit', hanzi: '军功' },
    asks: ['service', 'taxes', 'war'],
    leave: { words: 'deserting (hunted) or retiring', hunted: false },
    gives: ['stipends', 'garrisons', 'authority'],
    seats: {
      outer: t('soldier', '兵卒'),
      inner: t('captain', '校尉'),
      true: t('commander', '统领'),
      elder: t('general', '将军'),
      grand: t('great general', '大将军'),
      head: {
        name: 'king',
        hanzi: '王',
        great: { name: 'emperor', hanzi: '皇帝', from: 'deity-transformation' },
      },
    },
  },
  tribe: {
    name: 'Tribe',
    bond: 'kin',
    join: ['birth', 'a trial'],
    currency: { name: 'deeds', hanzi: '功' },
    asks: ['the hunt', 'feuds'],
    leave: { words: 'exile', hunted: false },
    gives: ['land', 'beasts', 'old rites'],
    seats: {
      outer: t('tribesman', '族人'),
      inner: t('warrior', '勇士'),
      true: t('chosen warrior', '神选'),
      elder: t('elder', '长老'),
      grand: {
        name: 'shaman',
        hanzi: '巫',
        great: { name: 'great shaman', hanzi: '大巫', from: 'nascent-soul' },
      },
      head: t('chief', '族长'),
    },
  },
  beast: {
    name: 'Beast power',
    bond: 'kin',
    join: ['bloodline', 'a beast bond', 'tribute'],
    currency: { name: 'tribute', hanzi: '供奉' },
    asks: ['tribute', 'territory'],
    leave: { words: 'devoured', hunted: true },
    gives: ['beast lore', 'mounts', 'bloodline gifts'],
    // By realm: the seats keep these only as a fallback; titles read BEAST_TITLES.
    seats: {
      outer: t('beast soldier', '兽兵'),
      inner: t('beast captain', '兽将'),
      true: t('beast captain', '兽将'),
      elder: t('beast commander', '兽帅'),
      grand: t('beast king', '兽王'),
      head: t('beast king', '兽王'),
    },
    byRealm: true,
  },
};

/** A beast power's titles are its holders' realms, as the novels' beast ranks are. */
export const BEAST_TITLES: Partial<Record<RealmId, Title>> & Record<'qi-condensation', Title> = {
  'qi-condensation': { name: 'beast soldier', hanzi: '兽兵' },
  'foundation-establishment': { name: 'beast captain', hanzi: '兽将' },
  'core-formation': { name: 'beast commander', hanzi: '兽帅' },
  'nascent-soul': { name: 'beast king', hanzi: '兽王' },
  'deity-transformation': { name: 'great king', hanzi: '大王' },
  'void-refinement': { name: 'beast sovereign', hanzi: '兽皇' },
};

/** The blood a power's own are: an atlas race. A member of other blood is "not of our blood". */
export const HUMAN_BLOOD = 'race-humans';
export const TYPE_BLOOD: Partial<Record<OrgType, string>> = { beast: 'race-beasts' };

/** The realms a power's seats sit at, read top down from its population (core/organizations.ts). */
export interface Ladder {
  head: RealmId;
  grand: RealmId;
  elder: RealmId;
  /** True and inner share a realm. */
  inner: RealmId;
  /** Nothing under the inner realm: it splits at layer 7, inner above and outer below. */
  split: boolean;
}

export interface OrgOverride {
  /** A seat's name within the vocabulary (the Gate's Gate disciples, a march's marquis). */
  seats?: Partial<Record<SeatId, SeatName>>;
  /** Seat realms where the population reads wrong. */
  ladder?: Partial<Ladder>;
  /** Added to the type's gives: a clan that runs a guild hall. */
  gives?: readonly string[];
  treatment?: Treatment;
  blood?: string;
  /** A branch hall: joining it is joining the power it answers to, and its seats are that power's. */
  branchOf?: string;
}

/**
 * Powers' overrides by id. The Border Wilds' are drafted for review (O1's talk); the rest wait for
 * the atlas fill, apart from blood where a power's own are not human.
 */
export const ORG_OVERRIDES: Record<string, OrgOverride> = {
  'qm-tushou-men': {
    seats: {
      outer: t('outer Gate disciple', '外门弟子'),
      inner: t('inner Gate disciple', '内门弟子'),
      true: t('true Gate disciple', '真传弟子'),
      head: t('Gate master', '门主'),
    },
    treatment: 'harsh',
  },
  'qm-fugu-ge': { seats: { head: t('Pavilion master', '阁主') }, treatment: 'fair' },
  'qm-baijiang-zong': { treatment: 'fair' },
  'qm-shoudeng-zong': { seats: { head: t('Lamp Mother', '灯母') }, treatment: 'fair' },
  'qm-chisui-dong': { seats: { head: t('cave master', '洞主') }, treatment: 'harsh' },
  'qm-jingzhong-si': { treatment: 'generous' },
  'qm-yeqiao-hui': { treatment: 'fair', blood: 'race-halfbloods' },
  'qm-luochao-lou': { treatment: 'harsh', blood: 'race-halfbloods' },
  'qm-hu-shi': { seats: { head: t('clan matriarch', '家主') }, treatment: 'generous' },
  'qm-qian-shi': { gives: ['the core exchange'], treatment: 'fair' },
  'qm-xinglin-bianguan': { branchOf: 'xinglin' },
  // The Valley's few at the very top would seat Nascent Soul as inner disciples (O1's talk).
  xinglin: {
    ladder: { elder: 'nascent-soul', inner: 'core-formation', split: false },
    treatment: 'generous',
  },
  // The March is held for the Great Jing by the Gongsun generals: a marquis, not a king.
  'qm-anbian-fu': {
    seats: { head: t('Border-Pacifying Marquis', '安边侯') },
    treatment: 'harsh',
  },
  'qm-muling-guo': { treatment: 'fair' },
  // Blood other than human.
  'evergreen-deep': { blood: 'race-plants' },
  'qm-guhuai-ling': { blood: 'race-plants' },
  canglan: { blood: 'race-sea' },
  'sea-tiesai-bu': { blood: 'race-sea' },
  'sea-guishu-yuan': { blood: 'race-sea' },
  'xs-lengjiao': { blood: 'race-sea' },
  'hs-hanchao-bu': { blood: 'race-sea' },
  'fy-jiaoku-bu': { blood: 'race-sea' },
  'cg-jieya-si': { blood: 'race-beasts' },
  'cg-xingxue-tang': { blood: 'race-halfbloods' },
};

/**
 * Kingdoms a power or a council rules: these don't read as a dynasty. Any other kingdom does, so
 * the March's garrison takes the conscript's child without an entry of its own.
 */
export const RULED_KINGDOMS: Record<string, string> = {
  // A council of cave clans that pays no tax and gives no soldiers (O1's talk).
  'qm-shiyan-guo': 'council',
};

/** The yearly inner trial: held in the first month, passed at close or better (O1's talk). */
export const INNER_TRIAL = { month: 1, pass: 'close' } as const;

/** Donations (design § Economy, Sect contribution): stones at 2 low a point, goods at half their sell price. */
export const DONATION = {
  stonesPerPoint: 2,
  goodsShare: 0.5,
  /** A thing's sell price: its posted price at the shops' usual buying rate. */
  sellRate: 0.4,
} as const;

/** A dynasty's member may retire after this many years' service; leaving sooner is deserting. */
export const RETIRE_YEARS = 10;

// ── Membership's doors (the organizations checkpoint's fixes) ───────────────────────────────────

/**
 * The way in by type, asked at the power's seat (a dynasty's at any town of its kingdom): a test,
 * an exam or a trial is the strongest ladder against the outer seat's bottom (Qi Condensation 1,
 * so any rooted child passes); vows and the blood oath are sworn; enlisting takes anyone; buying
 * in costs stones on the realm curve; a society or an assassins' house sponsors only one it stands
 * favored with; a clan takes you by birth, adoption or marriage, never at a door.
 */
export type EntryBy = 'test' | 'vows' | 'enlist' | 'buy' | 'oath' | 'sponsor' | 'kin';
export const ENTRY: Record<OrgType, { by: EntryBy } & Title> = {
  sect: { by: 'test', name: 'Ask to sit the entrance test', hanzi: '入门考核' },
  academy: { by: 'test', name: 'Sit the entrance exam', hanzi: '入学考' },
  tribe: { by: 'test', name: 'Ask to face the trial', hanzi: '试炼' },
  beast: { by: 'test', name: 'Ask to face the trial', hanzi: '试炼' },
  temple: { by: 'vows', name: 'Ask to take the vows', hanzi: '受戒' },
  dynasty: { by: 'enlist', name: 'Enlist', hanzi: '从军' },
  guild: { by: 'buy', name: 'Buy in', hanzi: '入会' },
  gang: { by: 'oath', name: 'Swear the blood oath', hanzi: '歃血' },
  society: { by: 'sponsor', name: 'Ask to be sponsored', hanzi: '引荐' },
  assassins: { by: 'sponsor', name: 'Ask to be sponsored', hanzi: '引荐' },
  clan: { by: 'kin', name: 'Born, adopted or married in', hanzi: '血脉' },
};
/** Buying into a guild: low-grade stones on the realm curve by your realm. */
export const BUY_IN = 30;
/** A sponsor takes on one their power stands this well with. */
export const SPONSOR_FROM = 'favored';

/**
 * The door where a member's seat is settled, by type (the elders' hall 长老院 of a sect): an
 * elder's lesson, a protector, the inner trial in its month, and asking to be released.
 */
export const SEAT_HALL: Record<OrgType, Title> = {
  sect: { name: 'Elders’ hall', hanzi: '长老院' },
  academy: { name: 'Teachers’ hall', hanzi: '教习院' },
  temple: { name: 'Elders’ hall', hanzi: '长老院' },
  dynasty: { name: 'Commandery', hanzi: '军府' },
  guild: { name: 'Stewards’ office', hanzi: '执事房' },
  gang: { name: 'Incense hall', hanzi: '香堂' },
  society: { name: 'Inner hall', hanzi: '内堂' },
  assassins: { name: 'Inner hall', hanzi: '内堂' },
  tribe: { name: 'Elders’ fire', hanzi: '长老火塘' },
  clan: { name: 'Ancestral hall', hanzi: '祠堂' },
  beast: { name: 'Elders’ den', hanzi: '长老洞' },
};

/**
 * A gift at a power's gate or hall (tribute): one worth this much in low-grade stones on the realm
 * curve by the giver's realm (15 low at Qi Condensation, 135 at Foundation) is "Tribute", +5 for a
 * season, and one gift a month counts.
 */
export const GIFT = { low: 15, value: 5 } as const;

// ── What membership gives (design § What membership gives and asks; O2) ────────────────────────

/**
 * The monthly allowance 月例 by seat, in low-grade stones and Qi-Gathering Pills, at fair
 * treatment. From elder up it is the true disciple's on the realm curve: 60 low at Foundation,
 * times the holder's realm scale over Foundation's (`ELDER_ALLOWANCE`).
 */
export const ALLOWANCE: Record<'outer' | 'inner' | 'true', { stones: number; pills: number }> = {
  outer: { stones: 3, pills: 1 },
  inner: { stones: 15, pills: 3 },
  true: { stones: 60, pills: 0 },
};
export const ALLOWANCE_PILL = 'qi-gathering-pill';
export const ELDER_ALLOWANCE = { stones: 60, at: 'foundation-establishment' as RealmId };

/**
 * How a power's treatment scales the allowance (O2's talk): harsh pays its outer and inner seats
 * half the stones and none of the pills ("half or none") and takes a tithe of what they bring in,
 * its top seats ×1.5; generous pays every seat ×1.5, the pills rounded down.
 */
export const TREATMENT_RULES: Record<
  Treatment,
  { low: number; lowPills: number; top: number; tithe: number }
> = {
  generous: { low: 1.5, lowPills: 1.5, top: 1.5, tithe: 0 },
  fair: { low: 1, lowPills: 1, top: 1, tithe: 0 },
  harsh: { low: 0.5, lowPills: 0, top: 1.5, tithe: 0.3 },
};

/**
 * The dwelling by seat as qi density in seclusion: a shared hall on the power's vein, a cave, a
 * true disciple's courtyard, a peak from elder up. Counted only while you seclude inside the
 * power's seat, and capped by its vein: a vein of tier n holds the n-th density (O2's talk), so
 * the Gate's tier 4 vein holds them all and the Lamp-Keepers' tier 2 stops at a cave's.
 */
export const DWELLING: Record<SeatId, number> = {
  outer: 1.1,
  inner: 1.3,
  true: 1.6,
  elder: 2,
  grand: 2,
  head: 2,
};
export const VEIN_DENSITY = [1, 1.1, 1.3, 1.6, 2] as const;

/**
 * The open counter (design: outsiders at the hall): from friendly standing, the power's "known"
 * (+10, where loyalty's "below friendly" sits), at ×1.25 in stones, never the members' lines or
 * the chapters. An honored outsider is offered the guest elder 客卿 seat.
 */
export const OPEN_COUNTER = { from: 'known', markup: 1.25 } as const;
export const GUEST_ELDER: Title & { from: 'honored' } = {
  name: 'guest elder',
  hanzi: '客卿',
  from: 'honored',
};

/**
 * The scripture pavilion 藏经阁 sells the power's own chapters by seat (design § Lines, chapters
 * and kinship): chapter 1 to any member, chapter 2 from inner, chapter 3 from true.
 */
export const PAVILION_SEAT: Record<number, SeatId> = { 1: 'outer', 2: 'inner', 3: 'true' };
export const PAVILION: Title = { name: 'scripture pavilion', hanzi: '藏经阁' };

// ── Backing, tutelage and what it asks (design § What membership gives and asks; O3) ─────────────

/**
 * A death talisman 命牌 is carried from the true seat up, in a power whose head stands at Core
 * Formation or above, as strong as its head's realm (O3's talk).
 */
export const TALISMAN = { seat: 'true' as SeatId, from: 'core-formation' as RealmId };

/**
 * An elder's time, bought with the currency (O3's talk), priced on the realm curve by the buyer's
 * realm (Qi Condensation ×1, Foundation ×9): a lesson is a day of an elder's teaching, worth three
 * days of your own study's insight, one a month; a protector 护法 stands by your next breakthrough,
 * +5% to the odds, and a failure under one takes no injury.
 */
export const ELDER_TIME = {
  lesson: { points: 20, studyDays: 3 },
  protector: { points: 100, odds: 0.05 },
} as const;
export const PROTECTOR: Title = { name: 'protector', hanzi: '护法' };

/**
 * Investment: each year the trial's ranking takes a few Foundation Pills, one for every thousand
 * Qi Condensation cultivators the power counts, at least one and at most ten (O3's talk).
 */
export const YEARS_PILLS = { pill: 'foundation-pill', per: 1000, min: 1, max: 10 } as const;

/**
 * A member who reaches a seat's realm young is offered a true disciple's treatment early: the
 * inner seat's realm reached before this share of that realm's lifespan (Foundation by 30).
 */
export const EARLY_TRUE = { share: 0.15 } as const;

/**
 * The monthly quota by seat, in the power's currency (design: outer 10 points): paid in from the
 * balance as each month turns; from elder up the seat's post is its quota (O4). A generous power
 * and a guest elder ask none. Two months missed running cost standing, the third strikes you off.
 */
export const QUOTA: Record<SeatId, number> = {
  outer: 10,
  inner: 20,
  true: 30,
  elder: 0,
  grand: 0,
  head: 0,
};
export const QUOTA_MISSED = { standing: 2, struck: 3 } as const;

/**
 * Leave a year, in days, by seat: three months at the outer and inner seats, more as you climb,
 * none counted from elder up. Only a house counts leave (a sect, academy, temple, dynasty or
 * assassins' house). Past it a point a day, and a standing row each month overstayed.
 */
export const LEAVE: Record<SeatId, number> = {
  outer: 90,
  inner: 90,
  true: 180,
  elder: Infinity,
  grand: Infinity,
  head: Infinity,
};
export const LEAVE_OVER = { pointsPerDay: 1, rowEvery: 30 } as const;

/** The law hall's heat on a member who kills or robs one of their own power (design: the law). */
export const LAW_HALL = { heat: 3, deeds: ['killing', 'massacre', 'robbery', 'theft'] } as const;

// ── Guarded methods (design § Professions, people and powers, Guarded methods; O5) ─────────────

/**
 * A leak and its mark (O5's talk): a fine on the road at cold standing and up, twice the copy's
 * price; restitution at the power's law hall, three times; a black market's leaked copy bought out
 * three months after the sale; the hunt cooling a chapter a season. At these standing words the
 * power's people take a marked face on sight instead of fining it.
 */
export const GUARDED = {
  fine: 2,
  restitution: 3,
  buyoutMonths: 3,
  coolDays: 90,
  onSight: ['hostile', 'hunted'] as readonly string[],
} as const;

/**
 * The chapters a seat knows of its power's methods (design: an outer disciple chapter 1, an elder
 * all of them): what a member recognizes when they see it used.
 */
export const KNOWS_CHAPTER: Record<SeatId, number> = {
  outer: 1,
  inner: 2,
  true: 3,
  elder: Infinity,
  grand: Infinity,
  head: Infinity,
};

/**
 * The law hall on the road, by the hunt's chapter (O5's talk): a chapter 1 leak two outer
 * disciples, a chapter 2 leak two inner disciples, a chapter 3 leak and up an elder, each the
 * strongest of their seat.
 */
export const LAW_HALL_PARTY: Record<1 | 2 | 3, { seat: SeatId; count: number }> = {
  1: { seat: 'outer', count: 2 },
  2: { seat: 'inner', count: 2 },
  3: { seat: 'elder', count: 1 },
};
export const LAW_HALL_TITLE: Title = { name: 'law hall', hanzi: '执法堂' };

/** An atlas power or kingdom as organizations read it (written by `npm run atlas:build`). */
export interface OrgRow {
  id: string;
  name: string;
  pinyin: string;
  hanzi: string;
  /** Only a power has one; a kingdom reads as a dynasty. */
  type?: OrgType;
  parent: string | null;
  region: string | null;
  /** The written top's realm, '' for none, 'unknown' for a mystery. */
  top: string;
  population?: Population;
  vein?: number;
  /** The powers and kingdoms it is hostile to: its enemy and feud ties. */
  foes: readonly string[];
}

export const ORG_ROWS: readonly OrgRow[] = generated as OrgRow[];

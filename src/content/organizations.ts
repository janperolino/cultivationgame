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

// Origins (design § Character creation): the three Border Wilds origins of the first playable,
// rolled a third each, with fixed childhood text until GLM writes it from M3, the testing-day
// scene, and the choice it ends on. Going along or refusing sets the starting method, routines,
// stones, flags and where you live; the origin path's first technique (content/techniques.ts,
// `firstFor`) and everything after arrive as cards (content/cards/). The named people fill the
// cards' slots. Drafted in P1.7 for Jan's review.

export type OriginId = 'cave-orphan' | 'conscript' | 'frontier-orphan';
export type OriginChoice = 'along' | 'refuse';
export const ORIGIN_IDS: readonly OriginId[] = ['cave-orphan', 'conscript', 'frontier-orphan'];
export const ORIGIN_CHOICES: readonly OriginChoice[] = ['along', 'refuse'];

export interface OriginPath {
  /** What you become: "a garrison cadet", "a street cultivator". */
  name: string;
  /** The button on testing day. */
  label: string;
  /** What happens next, in the second person. */
  text: string;
  /** The qi method you start with, or null for the refusals that start without one. */
  method: string | null;
  routines: readonly string[];
  /** Low-grade spirit stones in hand. */
  stones: number;
  /** Story flags the cards read: a bounty, a map, a grudge. */
  flags: readonly string[];
  /** Where you live once play begins: an atlas entry id. */
  place: string;
  /** The chronicle line for testing day, a biography; {name} fills in. */
  chronicle: string;
}

export interface Origin {
  id: OriginId;
  name: string;
  hanzi: string;
  /** Where you grew up: an atlas entry id. */
  home: string;
  /** One line for the talent roll. */
  summary: string;
  /** The childhood paragraph, fixed until GLM writes it from M3. */
  childhood: string;
  /** Testing day, up to the choice. */
  testing: string;
  /** The people the cards speak of, by slot: a person's id (content/people.ts), or a phrase for someone unnamed. */
  people: Readonly<Record<string, string>>;
  along: OriginPath;
  refuse: OriginPath;
}

export const ORIGINS: readonly Origin[] = [
  {
    id: 'cave-orphan',
    name: 'Cave orphan',
    hanzi: '洞穴孤儿',
    home: 'qm-shiyan-guo',
    summary: 'raised by the cave clans of the Kingdom of Stone Eyes',
    childhood:
      "You were found at the bottom of a sinkhole in the Kingdom of Stone Eyes, wrapped in a smuggler's oilcloth, and the cave clans raised you the way they raise everything that falls in: Aunt Yan fed you bat-guano rice and taught you which caves breathe and which ones swallow. You learned to walk on terraces, to keep a lamp alive in a draught, and never to ask which neighbors have scales under their sleeves.",
    testing:
      'This year the imperial tester comes down to the sinkholes himself, with a garrison escort and a grey stone that lights for rooted children. The clans have hidden their rooted ones in the lower caves for a generation. Aunt Yan pulls you toward the dark. But the stone has already seen you across the terrace, and it is glowing.',
    people: { aunt: 'aunt-yan', sergeant: 'sergeant-hou', tester: 'tester-qiu' },
    along: {
      name: 'a garrison school cadet',
      label: 'Walk to the stone',
      text: "You walk up the terrace and put your hand on the stone. Tester Qiu writes your name in the Registry, and by evening you are in a cart bound for the March's garrison school: a standard method, rations, and a place on the wall.",
      method: 'garrison-standard',
      routines: ['watch-rotation'],
      stones: 10,
      flags: [],
      place: 'qm-anbian-fu',
      chronicle:
        "On root-testing day, {name} walks to the tester's stone and is taken to the March's garrison school.",
    },
    refuse: {
      name: 'a hidden cave child',
      label: 'Run for the lower caves',
      text: "You run. Aunt Yan pulls you through a crack no tester's lamp has found, and the clans close the cave behind you. They give you a crude method scratched on the cave wall, a map of caves no one else has, and the names of the smugglers who owe them.",
      method: 'crude-cave',
      routines: [],
      stones: 0,
      flags: ['cave-map', 'smuggler-contacts'],
      place: 'qm-shiyan-guo',
      chronicle:
        'On root-testing day, {name} runs from the tester into the lower caves, and the cave clans hide {them}.',
    },
  },
  {
    id: 'conscript',
    name: "Conscript's child",
    hanzi: '军户之子',
    home: 'qm-anbian-fu',
    summary: 'born to a garrison family of the March of Pacified Borders',
    childhood:
      'Your mother held a watchtower on the March of Pacified Borders until the year the raids tripled, and your father went to the wall at sixteen like every son of the march and came back in a box with a beast core on the lid. You grew up reading tracks before letters, plowing with a spear across the furrow, and telling a raid horn from a hunt horn in your sleep.',
    testing:
      "The Gongsun garrison's frontier tester comes at twelve now, under the march's charter, and every rooted child goes to the cadet school instead of the capital. Sergeant Lei waits by the stone with a list. You put your hand on it, and it lights.",
    people: { sergeant: 'sergeant-lei', fixer: 'old-sha', tester: 'the frontier tester' },
    along: {
      name: 'a garrison cadet',
      label: 'Take the cadet oath',
      text: 'You take the oath with the other lit children. Sergeant Lei hands you a cadet spear, a manual and a purse of low-grade stones, and by the end of the week you are walking patrols on the Wall of Piled Bones.',
      method: 'cadet-spear',
      routines: ['wall-drill'],
      stones: 30,
      flags: ['cadet'],
      place: 'qm-duigu-qiang',
      chronicle:
        'On root-testing day, {name} takes the cadet oath and is sent to the Wall of Piled Bones.',
    },
    refuse: {
      name: 'a deserter',
      label: 'Slip away before the oath',
      text: 'You slip out the back of the hall before the oath and keep running. By morning there is a bounty on a lit child of twelve, and you have no method, no stones and nowhere to go, except a half-blood ferryman who says the Night Bridge Society might find a use for you.',
      method: null,
      routines: [],
      stones: 0,
      flags: ['bounty'],
      place: 'qm-anbian-fu',
      chronicle:
        'On root-testing day, {name} slips away before the cadet oath, with a bounty on {their} head by morning.',
    },
  },
  {
    id: 'frontier-orphan',
    name: 'Frontier orphan',
    hanzi: '边城孤儿',
    home: 'qm-shoukou-cheng',
    summary: 'orphaned by a beast raid outside the City of the Guarded Mouth',
    childhood:
      'A beast raid took your family at the reef road below the City of the Guarded Mouth when you were six, and you grew up in its alleys: carrying for the market stalls, sleeping under the bounty office stairs, and watching cultivators come back from across the strait with cores the size of fists. You know the city by its smells and its walls by their skulls.',
    testing:
      "The Beast-Butcher Gate's recruiter tests orphans who lost family to beasts, and he lines you up with the others outside the bounty office. The stone lights under your hand. He smiles like a man pricing a hide.",
    people: { senior: 'senior-zhao', clerk: 'clerk-fan', recruiter: 'the recruiter' },
    along: {
      name: 'an outer disciple',
      label: 'Swear to the Gate',
      text: 'You swear to the Beast-Butcher Gate. They give you a saber method, a bunk, and Senior Brother Zhao, who tells you that contribution comes from cores, that cores come from beasts, and that he expects results.',
      method: 'butcher-saber',
      routines: ['butchers-day'],
      stones: 5,
      flags: ['outer-disciple'],
      place: 'qm-tushou-men',
      chronicle:
        'On root-testing day, {name} swears to the Beast-Butcher Gate as an outer disciple.',
    },
    refuse: {
      name: 'a street cultivator',
      label: 'Walk away',
      text: 'You take your hand off the stone and walk back into the alleys. The recruiter writes something down. You have no method yet, but Clerk Fan at the bounty office always needs runners, and the Gate remembers you said no.',
      method: null,
      routines: [],
      stones: 2,
      flags: ['gate-grudge'],
      place: 'qm-shoukou-cheng',
      chronicle:
        "On root-testing day, {name} turns down the Beast-Butcher Gate and goes back to the city's alleys.",
    },
  },
];

const byId = new Map(ORIGINS.map((o) => [o.id, o]));

export function origin(id: OriginId): Origin {
  const o = byId.get(id);
  if (!o) throw new RangeError(`Unknown origin ${id}`);
  return o;
}

export function originPath(id: OriginId, choice: OriginChoice): OriginPath {
  return origin(id)[choice];
}

/** The key techniques and cards use for an origin path: "cave-orphan/along". */
export function pathKey(id: OriginId, choice: OriginChoice): string {
  return `${id}/${choice}`;
}

/**
 * The atlas names of the places the origins use, so the chronicle and cards can name them without
 * loading the atlas; a content test holds them to `content/atlas/entries.json`.
 */
export const PLACE_NAMES: Readonly<Record<string, string>> = {
  'qm-bianhuang': 'the Border Wilds',
  'qm-shiyan-guo': 'the Kingdom of Stone Eyes',
  'qm-anbian-fu': 'the March of Pacified Borders',
  'qm-shoukou-cheng': 'the City of the Guarded Mouth',
  'qm-tushou-men': 'the Beast-Butcher Gate',
  'qm-yeqiao-hui': 'the Night Bridge Society',
  'qm-duigu-qiang': 'the Wall of Piled Bones',
  'great-jing': 'the Great Jing Dynasty',
};

/** The places' hanzi, as flavor under the English name (from content/atlas/entries.json). */
export const PLACE_HANZI: Readonly<Record<string, string>> = {
  'qm-bianhuang': '边荒',
  'qm-shiyan-guo': '石眼国',
  'qm-anbian-fu': '安边府',
  'qm-shoukou-cheng': '守口城',
  'qm-tushou-men': '屠兽门',
  'qm-yeqiao-hui': '夜桥会',
  'qm-duigu-qiang': '堆骨墙',
};

/** A place's name for the text, "the Kingdom of Stone Eyes"; its id when unknown. */
export function placeName(id: string): string {
  return PLACE_NAMES[id] ?? id;
}

/** Family names for the creation screen's suggestions, in pinyin. */
export const FAMILY_NAMES: readonly string[] = [
  'Han',
  'Lin',
  'Shen',
  'Zhou',
  'Bai',
  'Lu',
  'Qin',
  'Su',
  'Yan',
  'Wei',
  'Gu',
  'Jiang',
  'Mo',
  'Xu',
  'Tang',
  'Ye',
  'Shi',
  'Fang',
  'Luo',
  'Cao',
];

/** Given names for the creation screen's suggestions, in pinyin. */
export const GIVEN_NAMES: readonly string[] = [
  'Li',
  'Feng',
  'Yun',
  'Xue',
  'Chen',
  'Ming',
  'Ning',
  'Qing',
  'Shan',
  'Yu',
  'Lan',
  'Hao',
  'Rou',
  'Jian',
  'Wen',
  'Zhi',
  'Ling',
  'Tie',
  'Yao',
  'Xiao',
];

/** Pronoun sets offered at creation; any other is typed in. */
export const PRONOUN_CHOICES: readonly string[] = ['they/them', 'she/her', 'he/him'];

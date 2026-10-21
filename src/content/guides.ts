// The guides (design § UI and screens, Introductions; the opening redone, 2026-10-20, and The
// opening, built's talk): the loop and every control you must use to get on are walked through
// once a lineage, where they live, never on a timer. A plain narrator speaks them all, a UI voice
// and no one in the world, so a start in any region reads the same: second person, present tense,
// the verb first, one or two lines, numbers only when they decide something. Three forms:
//
// - `build`: the screen building itself for the first seclusion. Cultivate opens on the figure and
//   the qi bar, and each piece fades in as its guide comes (core/guides.ts, `built`).
// - `veil`: what must not be missed. A still dark veil, one control lit in a gilt ring, the clock
//   held (the first orb's breath runs at half instead), a ghost hand showing the motion once.
// - `ring`: a gilt ring and a short line at the control, nothing held.
//
// Each guide ends by adding its codex entry with a dot (core/codex.ts). Texts await Jan's review.
export const GUIDE_IDS = [
  'take-up',
  'qi-bar',
  'first-orb',
  'focus',
  'study-hour',
  'first-minor',
  'first-node',
  'practice',
  'first-card',
  'read-copy',
  'first-course',
  'place-doors',
  'first-buy',
  'fight-turn',
] as const;
export type GuideId = (typeof GUIDE_IDS)[number];

/** The first seclusion's guides, which build Cultivate a piece at a time. */
export const BUILD_GUIDES: readonly GuideId[] = ['take-up', 'qi-bar', 'first-orb', 'focus'];

export type GuideForm = 'build' | 'veil' | 'ring';

/** What a guide's ring stands on: the control carries `data-guide` with this id. */
export type GuideControl =
  | 'take-up'
  | 'qi-bar'
  | 'orb'
  | 'focus'
  | 'wheel'
  | 'gate'
  | 'node'
  | 'practice-this'
  | 'card'
  | 'read-now'
  | 'map'
  | 'doors'
  | 'buy'
  | 'moves';

export interface Guide {
  id: GuideId;
  form: GuideForm;
  /** The screen it fires on (ui/screens.ts), and Routine's tab. */
  screen: string;
  tab?: 'day' | 'practice' | 'study';
  control: GuideControl;
  /** At most two lines; {method}, {technique} and {copy} fill in. */
  lines: readonly string[];
  /** A ghost hand shows the pointer motion once (design: passing through an orb, tapping a gate). */
  hand?: 'through' | 'tap';
  /** The codex entry it adds as it ends. */
  codex: string;
  /** A ring that waits only for a look, and closes on its "Got it". */
  ack?: boolean;
}

export const GUIDES: Readonly<Record<GuideId, Guide>> = {
  'take-up': {
    id: 'take-up',
    form: 'build',
    screen: 'cultivate',
    control: 'take-up',
    lines: ['You know the {method}. Take it up to begin.'],
    codex: 'qi-bar',
  },
  'qi-bar': {
    id: 'qi-bar',
    form: 'build',
    screen: 'cultivate',
    control: 'qi-bar',
    lines: ['Qi gathers here while you sit. Full, it breaks through to the next layer.'],
    codex: 'seat',
    ack: true,
  },
  'first-orb': {
    id: 'first-orb',
    form: 'veil',
    screen: 'cultivate',
    control: 'orb',
    lines: ['Qi drifts in. Pass the pointer through an orb to draw it in.'],
    hand: 'through',
    codex: 'orbs',
  },
  focus: {
    id: 'focus',
    form: 'build',
    screen: 'cultivate',
    control: 'focus',
    lines: [
      'Each orb lifts your focus. While you are here you cultivate ×{attentionThere}, up to ×{attentionFull} at full focus.',
      'Draw on the inhale for more. Focus drains while you are away.',
    ],
    codex: 'focus',
    ack: true,
  },
  'study-hour': {
    id: 'study-hour',
    form: 'ring',
    screen: 'routine',
    tab: 'day',
    control: 'wheel',
    lines: ['Your day has twelve hours. Turn one to Study for insight.'],
    codex: 'wheel',
  },
  'first-minor': {
    id: 'first-minor',
    form: 'veil',
    screen: 'cultivate',
    control: 'gate',
    lines: ['The bar is full. Break through, then tap as the spark passes each gate.'],
    hand: 'tap',
    codex: 'minor-breakthrough',
  },
  'first-node': {
    id: 'first-node',
    form: 'ring',
    screen: 'trees',
    control: 'node',
    lines: ['Insight buys nodes. Buy your first.'],
    codex: 'nodes',
  },
  practice: {
    id: 'practice',
    form: 'ring',
    screen: 'routine',
    tab: 'practice',
    control: 'practice-this',
    lines: ['Put {technique} in a slot, then give it an hour on the wheel.'],
    codex: 'practice',
  },
  'first-card': {
    id: 'first-card',
    form: 'ring',
    screen: 'cultivate',
    control: 'card',
    lines: ['A card. Each is a choice, and it waits for you.'],
    codex: 'cards',
  },
  'read-copy': {
    id: 'read-copy',
    form: 'ring',
    screen: 'routine',
    tab: 'study',
    control: 'read-now',
    lines: ['A copy is read before it is any use. Read now, then give it a Study hour.'],
    codex: 'study',
  },
  'first-course': {
    id: 'first-course',
    form: 'ring',
    screen: 'map',
    control: 'map',
    lines: ['Click the map to set a course. The clock carries you.'],
    codex: 'course',
  },
  'place-doors': {
    id: 'place-doors',
    form: 'ring',
    screen: 'map',
    control: 'doors',
    lines: ['Doors are grouped: Trade, Own, Work, Hear, Rest. Open one.'],
    codex: 'place',
  },
  'first-buy': {
    id: 'first-buy',
    form: 'ring',
    screen: 'map',
    control: 'buy',
    lines: ['Pick a row, then Buy.'],
    codex: 'buy-sell',
  },
  'fight-turn': {
    id: 'fight-turn',
    form: 'veil',
    screen: 'cultivate',
    control: 'moves',
    lines: ['Your move. Each button shows its odds against this foe.'],
    codex: 'fight-moves',
  },
};

/** Each guide as Settings' replay list names it. */
export const GUIDE_NAMES: Readonly<Record<GuideId, string>> = {
  'take-up': 'Taking up your method',
  'qi-bar': 'The qi bar',
  'first-orb': 'Drawing an orb',
  focus: 'Focus',
  'study-hour': 'Turning an hour to Study',
  'first-minor': 'The first minor breakthrough',
  'first-node': 'The first node',
  practice: 'A technique put to practice',
  'first-card': 'The first card',
  'read-copy': 'Reading a copy',
  'first-course': 'Setting a course',
  'place-doors': 'A place’s doors',
  'first-buy': 'The first buy',
  'fight-turn': 'The first turn of a fight',
};

/** The narrator's skip, on every guide; the first also offers to skip them all. */
export const I_KNOW_THIS = 'I know this';
export const PLAYED_BEFORE = "I've played before";

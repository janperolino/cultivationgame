// You do it the first time (design § UI and screens): the first time in a lineage a feature
// reaches you it arrives switched off, a hint points at the control, and it waits until you do it;
// after that the defaults help. The lineage keeps which firsts are done (core/firsts.ts). The texts
// here are drafts for Jan's review: each hint, shown once a life, and the coming-back card's
// line for a first still waiting. {copy}, {method}, {technique}, {art} (its name), {artKind}
// ("tempering art"), {growing} ("tempering your body"), {ladder} ("body") and {hour} ("Body") fill in.

/** The first times, in the order their hints come. */
export const FIRST_IDS = [
  'copy',
  'study-hour',
  'method',
  'technique',
  'art',
  'stones',
  'node',
] as const;
export type FirstId = (typeof FIRST_IDS)[number];

/** Every first done: NPCs, old tests, and sims that don't play them. */
export const ALL_FIRSTS: readonly FirstId[] = FIRST_IDS;

/**
 * Stones worth burning: the stones first waits from this many held, and from Qi Condensation's
 * second layer, so it comes after the method and the orbs (Jan's call after P2.8).
 */
export const FIRST_STONES = 5;
export const FIRST_STONES_LAYER = 2;

/**
 * Insight enough for a node: the node first waits from here, well past the 10 that opens the
 * Trees, so a new life has time to look round first (Jan's call after P2.8).
 */
export const FIRST_NODE_INSIGHT = 50;

/** Days lived (about five real minutes at the start) before a hint says hints can be turned off. */
export const HINTS_OFF_DAYS = 30;

/**
 * Hints, one at a time, in this order, each once a life. A first with two steps (a slot or a
 * method, then an hour) has a hint for each. Breakthroughs, drawing orbs and the card tray are
 * already yours to do and get a hint only; drawing orbs waits for a method taken up, so the
 * method's hint comes first. The last says hints can be turned off.
 */
export const HINT_IDS = [
  'copy',
  'study-hour',
  'method',
  'qi-hours',
  'orbs',
  'attending',
  'technique',
  'technique-hour',
  'art',
  'art-hour',
  'stones',
  'node',
  'insight',
  'breakthrough',
  'auto',
  'cards',
  'hints-off',
] as const;
export type HintId = (typeof HINT_IDS)[number];

export const HINTS: Readonly<Record<HintId, string>> = {
  copy: 'Your {copy} waits on the shelf. Read now puts it on your study hours.',
  'study-hour':
    'Your wheel is all qi, and qi hours give nothing until you know a method. Turn an hour to Study to read it; more hours read it sooner.',
  orbs: 'Qi drifts toward your figure on Cultivate. Pass the pointer through an orb to draw it in.',
  attending:
    'That orb filled your focus. While you attend, on any screen, your qi runs ×1.25, and focus lifts it toward ×2; an orb drawn on the inhale fills it faster. Focus drains while you are away.',
  method:
    'You have learned your first cultivation method, the {method}. Take it up under Climb with to start cultivating.',
  'qi-hours':
    'Your qi climbs in the qi hours of your wheel. Give your day more qi hours to cultivate for longer.',
  technique:
    'You have learned your first combat technique, {technique}: what you fight with. Put it in a practice slot with Practice this, and its mastery rises a little each day.',
  'technique-hour': '{technique} has its slot but no hour. Turn an hour to Practice on the wheel.',
  art: 'You have learned your first {artKind}, the {art}. Take it up under Climb with to start {growing}.',
  'art-hour':
    'Your {ladder} climbs in the {hour} hours of your wheel. Turn an hour to {hour} to start {growing}.',
  stones: 'Spirit stones sit in your pouch. Burn them in qi hours and the day gathers more.',
  node: 'Insight enough for a node. Buy one on the Trees, where your understanding takes shape.',
  insight:
    'Insight buys more nodes. Every hour leaves a little, more while you attend; study hours give a steady stream, and each mastery level and each read finished gives a burst.',
  breakthrough: 'A bar is full. Break through with the button under your figure on Cultivate.',
  auto: 'Minor breakthroughs run on their own, at safe odds, even while you are away. Choose how bold under Minor breakthroughs on Routine. Major breakthroughs are always yours to call.',
  cards: 'A card waits in the tray on Cultivate. Each is a choice, and it waits for you.',
  'hints-off':
    'Guides and hints like this one can be turned off in Settings, and replayed from there.',
};

/**
 * The hints a guide speaks instead (The opening, built: a guided feature drops its hint); the
 * firsts beneath them stay, with their beacons, as the fallback.
 */
export const GUIDED_HINTS: readonly HintId[] = [
  'copy',
  'study-hour',
  'method',
  'orbs',
  'attending',
  'technique',
  'technique-hour',
  'node',
  'breakthrough',
  'cards',
];

/** The codex entry each hint left links to (content/codex). */
export const HINT_CODEX: Readonly<Partial<Record<HintId, string>>> = {
  'qi-hours': 'wheel',
  art: 'body-soul',
  'art-hour': 'body-soul',
  stones: 'stone-burning',
  insight: 'insight-sources',
  auto: 'auto-minor',
  'hints-off': 'guides-settings',
};

/** The coming-back card's line for each first still waiting, by its step. */
export const FIRST_WAITING: Readonly<
  Record<
    Exclude<
      HintId,
      | 'qi-hours'
      | 'orbs'
      | 'attending'
      | 'insight'
      | 'breakthrough'
      | 'auto'
      | 'cards'
      | 'hints-off'
    >,
    string
  >
> = {
  copy: 'Your {copy} waits on the shelf, unread.',
  'study-hour': 'No hour of your wheel goes to study yet.',
  method: 'The {method} waits to be taken up.',
  technique: '{technique} waits for a practice slot.',
  'technique-hour': '{technique} waits for an hour.',
  art: 'Your {artKind} waits to be taken up.',
  'art-hour': 'Your {artKind} waits for an hour.',
  stones: 'Your spirit stones wait to be burned.',
  node: 'Insight enough for a node waits on the Trees.',
};

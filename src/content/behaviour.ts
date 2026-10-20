// A person's nature as behaviour (design § How GLM fits in; P3.4's talk, P3.8): what the narrator
// is told about someone is what they do, never the axis's adjective ("talks too much, can't keep a
// secret past a cup of wine", not "gregarious"). One line for each lean's way at each strength,
// one for each motive and one for each quirk. Drafted in P3.8 for Jan's review.
import type { AxisId, MotiveId, QuirkId } from './personality.ts';

/** By axis: the low way (−1, −2) and the high way (+1, +2), as the axis's low and high words. */
export const LEAN_BEHAVIOUR: Record<
  AxisId,
  { low: readonly [string, string]; high: readonly [string, string] }
> = {
  temper: {
    low: [
      'slow to anger, lets an insult pass once',
      'never raises their voice, even over a corpse',
    ],
    high: [
      'bristles at a wrong word and lets you see it',
      'strikes first and asks after, over a look held too long',
    ],
  },
  nerve: {
    low: ['backs away from a fight they could win', 'runs at the first drawn blade, and begs well'],
    high: [
      'takes risks a careful man would not',
      'walks into any danger for a prize, and laughs while doing it',
    ],
  },
  honesty: {
    low: ['tells the truth unless it costs them', 'cannot lie without their face giving it away'],
    high: [
      'bends the truth when it pays',
      'lies as easily as breathing, and smiles while doing it',
    ],
  },
  heart: {
    low: [
      'shrugs at suffering that is not their own',
      'enjoys another man’s pain, and draws it out',
    ],
    high: [
      'softens toward the hurt and the young',
      'gives away what they need to whoever is weeping',
    ],
  },
  hand: {
    low: [
      'counts every coin twice before it leaves them',
      'haggles over a cup of tea, and never pays first',
    ],
    high: ['pays a little over and stands a round', 'gives away a fortune on a good word'],
  },
  trust: {
    low: [
      'wants a reason before they believe you',
      'believes nothing they did not see, and watches your hands',
    ],
    high: ['takes a stranger at their word', 'believes any story told with a straight face'],
  },
  memory: {
    low: ['lets old wrongs lie once the price is paid', 'forgets a slight by the next morning'],
    high: [
      'keeps a tally of every wrong and settles it',
      'waits years to repay an insult, and repays it tenfold',
    ],
  },
  pride: {
    low: ['bows easily and takes the lower seat', 'calls everyone elder and apologizes for living'],
    high: [
      'expects to be bowed to and notices when they are not',
      'looks through anyone of a lower realm as if they were air',
    ],
  },
  bearing: {
    low: ['says little and lets silences run', 'answers in single words, if at all'],
    high: [
      'likes company and fills every silence',
      'talks too much, can’t keep a secret past a cup of wine',
    ],
  },
  conscience: {
    low: ['does what pays and sleeps well after', 'kills a witness without a second thought'],
    high: [
      'will not do a thing they think wrong',
      'stands up to the strong for the weak, even at a cost',
    ],
  },
  fidelity: {
    low: ['sides with whoever pays best this month', 'sells out a friend for the first good offer'],
    high: ['keeps their word and their side', 'dies before they betray someone they have sworn to'],
  },
};

export const MOTIVE_BEHAVIOUR: Record<MotiveId, string> = {
  greed: 'weighs every person by what can be taken from them',
  ambition: 'measures everything by how far it lifts them',
  fear: 'thinks first of how to stay alive and out of sight',
  loyalty: 'acts for their power before themselves',
  family: 'would do anything for their kin',
  revenge: 'carries an old wrong and looks for its price',
  duty: 'holds to their duty or faith over their own good',
  pride: 'cannot bear to lose face',
  curiosity: 'cannot leave a secret alone',
};

export const QUIRK_BEHAVIOUR: Record<QuirkId, string> = {
  gambler: 'bets on anything, and cannot turn down a wager',
  drinker: 'is never far from a jar of wine, and warms to whoever shares it',
  glutton: 'thinks about the next meal, and warms to whoever feeds them',
  superstitious: 'reads omens everywhere and trusts a talisman over a man',
  vain: 'preens, and melts at a compliment',
  amorous: 'looks too long at a pretty face, and lets it sway them',
  chaste: 'keeps a cold distance from any hint of romance',
  pious: 'keeps every promise and prays at every shrine',
  collector: 'cannot pass up a rare thing, whatever it costs',
  bookish: 'would rather read than fight, and trades for old texts',
};

/** The line for a lean: −2, −1, +1 or +2 on its axis. */
export function leanBehaviour(axis: AxisId, lean: number): string {
  const way = lean < 0 ? LEAN_BEHAVIOUR[axis].low : LEAN_BEHAVIOUR[axis].high;
  return way[Math.abs(lean) >= 2 ? 1 : 0];
}

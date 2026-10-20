// The Alchemy Dao 丹道 (design § Professions, The craft Dao trees): the furnace and the pill. Hand is the
// alchemist's own hands at the pill furnace, Line is the furnace left to run, Lore is the recipes.
// Tiers 1 and 2 drafted in K2 by a cheap agent; **awaiting Jan's review**. Tiers 3 to 9 carry only their capstones.
import { defineCraft } from '../craft.ts';

export const ALCHEMY_DAO = defineCraft({
  id: 'alchemy',
  name: 'Alchemy',
  hanzi: '丹道',
  what: 'Pills from the furnace: how rare a batch comes out, whether it holds while you are away, and which recipes you know.',
  starter: {
    id: 'alchemy-qi-gathering-seal',
    name: 'Qi-Gathering Pill',
    hanzi: '聚气丹',
    recipe: 'qi-gathering-pill',
    text: 'The first pill every alchemist learns: pinch, roll, and wait for the furnace.',
  },
  tiers: [
    // Tier 1: Qi Condensation
    {
      hand: {
        nodes: [
          {
            id: 'alchemy-steady-pinch',
            name: 'Steady Pinch',
            hanzi: '稳捏',
            effects: [{ stat: 'alchemyLift', value: 0.1 }],
            text: 'You pinch each dose of powder the same weight, down to a grain.',
          },
          {
            id: 'alchemy-lid-watching',
            name: 'Lid Watching',
            hanzi: '观盖',
            effects: [{ stat: 'alchemyReach', value: 0.25 }],
            text: "You learn what the furnace lid's rattle says before the smoke does.",
          },
          {
            id: 'alchemy-clean-hands',
            name: 'Clean Hands',
            hanzi: '净手',
            effects: [{ stat: 'alchemyLift', value: 0.2 }],
            text: 'Washed hands, dry sleeves, and no stray ash in the dose.',
          },
        ],
        capstone: {
          id: 'alchemy-steady-flame',
          name: 'Steady Flame',
          hanzi: '稳火',
          effects: [{ stat: 'alchemyReach', value: 0.5 }],
          text: 'Your furnace fire holds one colour for a whole night.',
        },
      },
      line: {
        nodes: [
          {
            id: 'alchemy-tight-seal',
            name: 'Tight Seal',
            hanzi: '严封',
            effects: [{ stat: 'alchemyHold', value: 0.05 }],
            text: 'You pack the furnace lid with wet clay, so no qi leaks.',
          },
          {
            id: 'alchemy-banked-coals',
            name: 'Banked Coals',
            hanzi: '压炭',
            effects: [{ stat: 'alchemySpeed', value: -0.1 }],
            text: 'Coals banked under ash burn slow and even through the night.',
          },
          {
            id: 'alchemy-vented-lid',
            name: 'Vented Lid',
            hanzi: '通盖',
            effects: [
              { stat: 'alchemySafety', value: 0.25 },
              { stat: 'alchemyYield', value: 0.1 },
            ],
            text: 'A pinhole in the lid lets bad qi out before the furnace cracks.',
          },
        ],
        capstone: {
          id: 'alchemy-twin-furnace',
          name: 'Twin Furnace',
          hanzi: '双炉',
          effects: [{ stat: 'twinFurnace', value: 1 }],
          text: 'A second furnace takes the other half of your attention, and neither goes cold.',
        },
      },
      lore: {
        nodes: [
          {
            id: 'alchemy-qi-restoring-seal',
            name: 'Qi-Restoring Pill',
            hanzi: '回气丹',
            recipe: 'qi-restoring-pill',
            text: 'You copy it from a dog-eared jade slip that every market stall sells.',
          },
          {
            id: 'alchemy-spring-returning-seal',
            name: 'Spring-Returning Pill',
            hanzi: '回春丹',
            recipe: 'spring-returning-pill',
            text: 'An old alchemist shows you the one herb to add last.',
          },
          {
            id: 'alchemy-wound-knitting-seal',
            name: 'Wound-Knitting Pill',
            hanzi: '续伤丹',
            recipe: 'wound-knitting-pill',
            effects: [{ stat: 'alchemyOdds', value: 0.02 }],
            text: 'Three failed batches in, you start to see what each herb was really doing.',
          },
        ],
        capstone: {
          id: 'alchemy-pill-sense',
          name: 'Pill Sense',
          hanzi: '丹感',
          effects: [{ stat: 'alchemyPity', value: 1 }],
          text: 'A failed dose smells of what it nearly was, and the next try starts from there.',
        },
      },
    },
    // Tier 2: Foundation Establishment
    {
      hand: {
        nodes: [
          {
            id: 'alchemy-grain-weights',
            name: 'Grain Weights',
            hanzi: '分厘',
            effects: [{ stat: 'alchemyLift', value: 0.15 }],
            text: 'Brass weights the size of rice grains make every dose exact.',
          },
          {
            id: 'alchemy-furnace-ear',
            name: 'Furnace Ear',
            hanzi: '听炉',
            effects: [{ stat: 'alchemyReach', value: 0.4 }],
            text: 'You can hear a pill ripen: a low hum, then a click.',
          },
          {
            id: 'alchemy-turning-hand',
            name: 'Turning Hand',
            hanzi: '转手',
            effects: [{ stat: 'alchemyLift', value: 0.3 }],
            text: 'You turn the pill in the flame by hand, never by timer.',
          },
        ],
        capstone: {
          id: 'alchemy-nine-turn-wrist',
          name: 'Nine-Turn Wrist',
          hanzi: '九转腕',
          effects: [{ stat: 'alchemyLift', value: 0.5 }],
          text: 'Nine turns of the same wrist, and the fire answers each one.',
        },
      },
      line: {
        nodes: [
          {
            id: 'alchemy-double-lid',
            name: 'Double Lid',
            hanzi: '重盖',
            effects: [{ stat: 'alchemyHold', value: 0.08 }],
            text: 'A second lid of cinnabar-sealed clay goes over the first.',
          },
          {
            id: 'alchemy-wide-belly',
            name: 'Wide Belly',
            hanzi: '阔腹',
            effects: [{ stat: 'alchemyYield', value: 0.15 }],
            text: 'A furnace with a wider belly takes more herb in each batch.',
          },
          {
            id: 'alchemy-quench-jar',
            name: 'Quench Jar',
            hanzi: '冷罐',
            effects: [
              { stat: 'alchemySpeed', value: -0.15 },
              { stat: 'alchemySafety', value: 0.4 },
            ],
            text: 'A jar of spring water by the furnace cools a pill before it cracks.',
          },
        ],
        capstone: {
          id: 'alchemy-three-legged-cauldron',
          name: 'Three-Legged Cauldron',
          hanzi: '三足鼎',
          effects: [{ stat: 'alchemyYield', value: 0.5 }],
          text: 'A bronze cauldron on three legs, its belly twice the clay furnace’s, over one fire.',
        },
      },
      lore: {
        nodes: [
          {
            id: 'alchemy-herb-pairs',
            name: 'Herb Pairs',
            hanzi: '药对',
            effects: [{ stat: 'alchemyOdds', value: 0.03 }],
            text: 'You learn which herbs quarrel in the furnace and which ones carry each other.',
          },
          {
            id: 'alchemy-core-blood-seal',
            name: 'Core-Blood Pill',
            hanzi: '核血丹',
            recipe: 'core-blood-pill',
            text: 'The recipe is plain; the trick is how little beast blood goes in.',
          },
          {
            id: 'alchemy-sovereign-herb',
            name: 'Sovereign Herb',
            hanzi: '君药',
            effects: [
              { stat: 'alchemyPity', value: 0.5 },
              { stat: 'alchemyOdds', value: 0.02 },
            ],
            text: 'Every recipe has one sovereign herb, and you can now pick it out of a stranger’s pill.',
          },
        ],
        capstone: {
          id: 'alchemy-ash-reading',
          name: 'Ash Reading',
          hanzi: '读灰',
          effects: [
            { stat: 'alchemyPity', value: 1 },
            { stat: 'alchemyOdds', value: 0.05 },
          ],
          text: 'You read the ash of a failed batch like a page, and the next try starts from it.',
        },
      },
    },
  ],
  later: [
    // Tier 3: Core Formation
    {
      hand: {
        name: 'Palm Fire',
        hanzi: '掌心火',
        text: 'You warm a pill in the hollow of your palm and it finishes there.',
      },
      line: {
        name: 'Nine-Layer Furnace',
        hanzi: '九层炉',
        text: 'A furnace stacked in nine floors, each one cooking its own stage of the batch.',
      },
      lore: {
        name: 'Ancient Recipe Slips',
        hanzi: '古方',
        text: 'A jade slip from a dead alchemist whose recipes still hold.',
      },
    },
    // Tier 4: Nascent Soul
    {
      hand: {
        name: 'Soul-Guided Fire',
        hanzi: '神火',
        text: 'Your soul walks the flame, and the pill takes the shape of your thought.',
      },
      line: {
        name: 'Self-Feeding Furnace',
        hanzi: '自炉',
        text: 'A furnace that keeps its own earth fire and wants no tending for a month.',
      },
      lore: {
        name: 'Recipe Birthing',
        hanzi: '创方',
        text: 'You write a recipe no one has, and it works the first time.',
      },
    },
    // Tier 5: Soul Transformation
    {
      hand: {
        name: 'Heaven-Flame Hand',
        hanzi: '天火手',
        text: 'You borrow a thread of earth-core fire and the pill is done before the lid is shut.',
      },
      line: {
        name: 'Furnace of Ten Thousand Pills',
        hanzi: '万丹炉',
        text: 'A furnace that gives a bowlful of pills from a thimble of herb.',
      },
      lore: {
        name: 'Pill Canon',
        hanzi: '丹经',
        text: 'You compose the first chapter of a canon that other alchemists copy out by hand.',
      },
    },
    // Tier 6: Void Refinement
    {
      hand: {
        name: 'Pill Without Fire',
        hanzi: '无火丹',
        text: 'A pill finished by qi alone, with no coal anywhere in the room.',
      },
      line: {
        name: 'Void Cauldron',
        hanzi: '虚鼎',
        text: 'A cauldron that holds a hundred herbs and weighs as much as a leaf.',
      },
      lore: {
        name: 'Stolen Recipe of Heaven',
        hanzi: '窃天方',
        text: 'You read a recipe off the way a star dies.',
      },
    },
    // Tier 7: Body Integration
    {
      hand: {
        name: 'Fused Furnace Hand',
        hanzi: '合炉手',
        text: 'Your hand and the furnace move as one limb.',
      },
      line: {
        name: 'Body Cauldron',
        hanzi: '身鼎',
        text: 'You breathe out a batch the way other men breathe out smoke.',
      },
      lore: {
        name: 'Pill Bone Memory',
        hanzi: '丹骨',
        text: 'The recipes live in your bones, and no slip is needed.',
      },
    },
    // Tier 8: Mahayana
    {
      hand: {
        name: 'Pill Cloud Palm',
        hanzi: '丹云掌',
        text: 'Pills form in the air above your palm, one by one, like raindrops.',
      },
      line: {
        name: 'Furnace of Ages',
        hanzi: '万载炉',
        text: 'A fire lit a thousand years ago and never once allowed to go out.',
      },
      lore: {
        name: 'Complete Pill Canon',
        hanzi: '全丹经',
        text: 'Every pill in the world is a line in a book you have read to the last page.',
      },
    },
    // Tier 9: Tribulation Transcendence
    {
      hand: {
        name: 'Tribulation-Cloud Pill',
        hanzi: '劫云丹',
        text: 'A pill that calls tribulation clouds, and the clouds bow to it.',
      },
      line: {
        name: 'Furnace That Is a World',
        hanzi: '洞天炉',
        text: 'A furnace the size of a small world, with a sun at the bottom of it.',
      },
      lore: {
        name: 'Pill Dao Complete',
        hanzi: '丹道圆满',
        text: 'There is no recipe left for you to learn, only some to forget.',
      },
    },
  ],
});

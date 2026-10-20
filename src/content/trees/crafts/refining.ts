// The Refining Dao 器道 (design § Professions, The craft Dao trees): the refiner's forge and earth fire.
// Hand is the hammer and the quench, Line is the hearth left to burn, Lore is the patterns.
// Tiers 1 and 2 drafted in K2 by a cheap agent; **awaiting Jan's review**. Tiers 3 to 9 carry only their capstones.
import { defineCraft } from '../craft.ts';

export const REFINING_DAO = defineCraft({
  id: 'refining',
  name: 'Refining',
  hanzi: '器道',
  what: 'Gear from the forge: how fine a piece comes out, how much ore a hearth turns, and which patterns you know.',
  starter: {
    id: 'refining-iron-blade-seal',
    name: 'Iron Blade',
    hanzi: '铁剑',
    recipe: 'iron-sword',
    text: 'A plain iron blade, beaten out of one lump of ore on a borrowed anvil.',
  },
  tiers: [
    // Tier 1: Qi Condensation
    {
      hand: {
        nodes: [
          {
            id: 'refining-even-strikes',
            name: 'Even Strikes',
            hanzi: '匀锤',
            effects: [{ stat: 'refiningLift', value: 0.1 }],
            text: 'Your hammer falls the same weight on the seventh blow as on the first.',
          },
          {
            id: 'refining-colour-reading',
            name: 'Colour Reading',
            hanzi: '观色',
            effects: [{ stat: 'refiningReach', value: 0.25 }],
            text: 'Red, orange, straw, white: you strike when the iron says so.',
          },
          {
            id: 'refining-quench-timing',
            name: 'Quench Timing',
            hanzi: '候淬',
            effects: [{ stat: 'refiningLift', value: 0.2 }],
            text: 'You pull the blade out in the breath between orange and straw.',
          },
        ],
        capstone: {
          id: 'refining-clear-tempering',
          name: 'Clear Tempering',
          hanzi: '清淬',
          effects: [{ stat: 'refiningReach', value: 0.5 }],
          text: 'The quench water stays clear, because you never let the iron scorch.',
        },
      },
      line: {
        nodes: [
          {
            id: 'refining-dry-charcoal',
            name: 'Dry Charcoal',
            hanzi: '干炭',
            effects: [{ stat: 'refiningHold', value: 0.05 }],
            text: 'Charcoal dried a full season keeps the heat from sagging mid-batch.',
          },
          {
            id: 'refining-bellows-rhythm',
            name: 'Bellows Rhythm',
            hanzi: '风箱',
            effects: [{ stat: 'refiningSpeed', value: -0.1 }],
            text: 'Pull, push, pull: a bellows kept to a heartbeat.',
          },
          {
            id: 'refining-clay-lining',
            name: 'Clay Lining',
            hanzi: '泥衬',
            effects: [{ stat: 'refiningSafety', value: 0.5 }],
            text: 'A lining of fire clay keeps the hearth from splitting under earth fire.',
          },
        ],
        capstone: {
          id: 'refining-second-piece',
          name: 'Second Piece',
          hanzi: '二件',
          effects: [{ stat: 'refiningYield', value: 1 }],
          text: 'A good lump of ore, drawn out thin, gives a second piece beside the first.',
        },
      },
      lore: {
        nodes: [
          {
            id: 'refining-boar-hide-vest-seal',
            name: 'Boar-Hide Vest',
            hanzi: '猪皮甲',
            recipe: 'boar-hide-vest',
            text: 'Every border refiner starts on one: tough hide, riveted iron plates.',
          },
          {
            id: 'refining-ash-wood-spear-seal',
            name: 'Ash-Wood Spear',
            hanzi: '梣木枪',
            recipe: 'ash-wood-spear',
            text: 'You learn which ash staff does not split when an iron head is seated on it.',
          },
          {
            id: 'refining-iron-knuckles-seal',
            name: 'Iron Knuckles',
            hanzi: '铁指虎',
            recipe: 'iron-knuckles',
            effects: [{ stat: 'refiningOdds', value: 0.02 }],
            text: 'A fist-weight of iron, cast in a mould you carve yourself.',
          },
        ],
        capstone: {
          id: 'refining-pattern-memory',
          name: 'Pattern Memory',
          hanzi: '纹忆',
          effects: [{ stat: 'refiningPity', value: 1 }],
          text: 'A failed piece leaves its pattern in your fingers, and the next one begins closer.',
        },
      },
    },
    // Tier 2: Foundation Establishment
    {
      hand: {
        nodes: [
          {
            id: 'refining-fold-count',
            name: 'Fold Count',
            hanzi: '叠锻',
            effects: [{ stat: 'refiningLift', value: 0.15 }],
            text: 'Fold the bar, weld, fold again: twelve folds and the grain runs true.',
          },
          {
            id: 'refining-spark-reading',
            name: 'Spark Reading',
            hanzi: '辨星',
            effects: [{ stat: 'refiningReach', value: 0.4 }],
            text: 'The colour of the sparks tells you how much dross is left in the iron.',
          },
          {
            id: 'refining-hammer-sense',
            name: 'Hammer Sense',
            hanzi: '锤感',
            effects: [{ stat: 'refiningLift', value: 0.3 }],
            text: 'Your hammer finds the soft place in the ore before the metal shows it.',
          },
        ],
        capstone: {
          id: 'refining-single-blow',
          name: 'Single Blow',
          hanzi: '一锤',
          effects: [{ stat: 'refiningLift', value: 0.5 }],
          text: 'One blow at the right moment does what ten at the wrong one never would.',
        },
      },
      line: {
        nodes: [
          {
            id: 'refining-deep-hearth',
            name: 'Deep Hearth',
            hanzi: '深炉',
            effects: [{ stat: 'refiningYield', value: 0.15 }],
            text: 'A hearth sunk a span deeper takes a bigger charge of ore.',
          },
          {
            id: 'refining-water-jacket',
            name: 'Water Jacket',
            hanzi: '水套',
            effects: [{ stat: 'refiningSafety', value: 0.4 }],
            text: 'A water jacket round the anvil keeps cracks out of the piece.',
          },
          {
            id: 'refining-twin-bellows',
            name: 'Twin Bellows',
            hanzi: '双风箱',
            effects: [
              { stat: 'refiningSpeed', value: -0.15 },
              { stat: 'refiningHold', value: 0.08 },
            ],
            text: 'Two bellows, two hands, and the iron never waits for air.',
          },
        ],
        capstone: {
          id: 'refining-clean-slag',
          name: 'Clean Slag',
          hanzi: '净渣',
          effects: [{ stat: 'refiningYield', value: 0.5 }],
          text: 'You skim the slag so close that almost none of the ore is lost.',
        },
      },
      lore: {
        nodes: [
          {
            id: 'refining-storage-ring-seal',
            name: 'Storage Ring',
            hanzi: '储物戒',
            recipe: 'storage-ring',
            text: 'A ring of spirit iron, its inside carved with a pocket of folded space.',
          },
          {
            id: 'refining-pattern-book',
            name: 'Pattern Book',
            hanzi: '谱册',
            effects: [{ stat: 'refiningOdds', value: 0.03 }],
            text: 'A cloth-bound book of rubbings: every runner-up pattern you ever struck.',
          },
          {
            id: 'refining-azure-cloud-sword-seal',
            name: 'Azure Cloud Sword',
            hanzi: '青云剑',
            recipe: 'azure-cloud-sword',
            effects: [{ stat: 'refiningPity', value: 0.25 }],
            text: 'A sword that is nearly blue along its spine, and refiners come to look at it.',
          },
        ],
        capstone: {
          id: 'refining-master-template',
          name: "Master's Template",
          hanzi: '范本',
          effects: [
            { stat: 'refiningPity', value: 1 },
            { stat: 'refiningOdds', value: 0.04 },
          ],
          text: 'You keep a clay template of your best piece, and every new one is pressed against it.',
        },
      },
    },
  ],
  later: [
    // Tier 3: Core Formation
    {
      hand: {
        name: 'Core-Fire Hammer',
        hanzi: '丹火锤',
        text: 'A hammer blow that carries a thread of your core heat into the iron.',
      },
      line: {
        name: 'Spirit-Iron Hearth',
        hanzi: '灵铁炉',
        text: 'A hearth hot enough to melt spirit iron, which common coals will not touch.',
      },
      lore: {
        name: 'Old Pattern Slips',
        hanzi: '古纹',
        text: 'A pattern slip from a dead refiner, its lines still sharp.',
      },
    },
    // Tier 4: Nascent Soul
    {
      hand: {
        name: 'Soul-Struck Blade',
        hanzi: '魂锤',
        text: 'You hear the metal ring and strike until it sings a true note.',
      },
      line: {
        name: 'Self-Beating Anvil',
        hanzi: '自锤砧',
        text: 'An anvil with a pulse of its own, beating the piece while you sleep.',
      },
      lore: {
        name: 'Pattern Birthing',
        hanzi: '创纹',
        text: 'You carve a pattern no one has, and the blade accepts it.',
      },
    },
    // Tier 5: Soul Transformation
    {
      hand: {
        name: 'Heaven-Fire Quench',
        hanzi: '天火淬',
        text: 'You quench in lightning-struck water, and the blade is scorched blue for good.',
      },
      line: {
        name: 'Mountain-Heart Forge',
        hanzi: '山心炉',
        text: "A forge dug into a mountain's heart, as hot as the earth beneath it.",
      },
      lore: {
        name: 'Artifact Canon',
        hanzi: '器经',
        text: 'You write the first chapter of a canon that other refiners hammer out from.',
      },
    },
    // Tier 6: Void Refinement
    {
      hand: {
        name: 'Void-Folded Metal',
        hanzi: '虚折',
        text: 'A fold that goes through nothing, so the blade has no edge to blunt.',
      },
      line: {
        name: 'Star-Iron Furnace',
        hanzi: '星铁炉',
        text: "A furnace that keeps a fallen star's iron molten.",
      },
      lore: {
        name: 'Void Patterns',
        hanzi: '虚纹',
        text: 'Patterns drawn in the gaps between lines.',
      },
    },
    // Tier 7: Body Integration
    {
      hand: {
        name: 'Body Hammer',
        hanzi: '身锤',
        text: 'Your fist is the hammer and your arm the beam.',
      },
      line: {
        name: 'Body Anvil',
        hanzi: '身砧',
        text: 'Your own back is the anvil, and the iron rests on your qi.',
      },
      lore: {
        name: 'Bone Patterns',
        hanzi: '骨纹',
        text: 'The patterns are written in your bones, and no slip is needed.',
      },
    },
    // Tier 8: Mahayana
    {
      hand: {
        name: 'Thousand-Blow Rain',
        hanzi: '千锤雨',
        text: 'A thousand hammer blows land in a breath, like rain on a roof.',
      },
      line: {
        name: 'Everburning Anvil',
        hanzi: '长明砧',
        text: 'An anvil whose fire has not dimmed since the first sect was founded.',
      },
      lore: {
        name: 'Canon of All Artifacts',
        hanzi: '万器经',
        text: 'Every artifact in the world is a line in a book you have read to the last page.',
      },
    },
    // Tier 9: Tribulation Transcendence
    {
      hand: {
        name: 'Heaven-Cleaving Hammer',
        hanzi: '裂天锤',
        text: 'A hammer whose fall cracks the sky above the forge.',
      },
      line: {
        name: 'Forge Realm',
        hanzi: '炉界',
        text: 'A forge as large as a small world, with seas of molten ore.',
      },
      lore: {
        name: 'Dao-Forged Pattern',
        hanzi: '道纹',
        text: 'A pattern the Dao itself drew, and you merely traced it.',
      },
    },
  ],
});

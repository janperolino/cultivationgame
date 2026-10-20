// The Spirit Farming Dao 灵植 (design § Professions, The craft Dao trees): the spirit field and the seed.
// Hand is the tending of each plant, Line is the plot left to grow, Lore is the seeds and their crossing.
// Tiers 1 and 2 drafted in K2 by a cheap agent; **awaiting Jan's review**. Tiers 3 to 9 carry only their capstones.
import { defineCraft } from '../craft.ts';

export const FARMING_DAO = defineCraft({
  id: 'farming',
  name: 'Spirit Farming',
  hanzi: '灵植',
  what: 'Crops from the spirit field: how well each plant is tended, how many harvests a plot gives, and which seeds you can grow.',
  starter: {
    id: 'farming-spirit-rice-seal',
    name: 'Spirit Rice',
    hanzi: '灵米',
    recipe: 'spirit-rice',
    text: 'A paddy of grey-green rice that drinks qi from the mud.',
  },
  tiers: [
    // Tier 1: Qi Condensation
    {
      hand: {
        nodes: [
          {
            id: 'farming-gentle-thinning',
            name: 'Gentle Thinning',
            hanzi: '疏苗',
            effects: [{ stat: 'farmingLift', value: 0.1 }],
            text: 'You pull the weakest sprouts, so the strongest get the qi.',
          },
          {
            id: 'farming-soil-touch',
            name: 'Soil Touch',
            hanzi: '触土',
            effects: [{ stat: 'farmingReach', value: 0.25 }],
            text: 'A pinch of earth between finger and thumb tells you if the bed is thirsty.',
          },
          {
            id: 'farming-dew-watering',
            name: 'Dew Watering',
            hanzi: '晨露',
            effects: [{ stat: 'farmingLift', value: 0.2 }],
            text: 'Watered at dawn with dew shaken off the leaf, never with well water.',
          },
        ],
        capstone: {
          id: 'farming-green-thumb',
          name: 'Green Thumb',
          hanzi: '青指',
          effects: [{ stat: 'farmingReach', value: 0.5 }],
          text: 'A seedling you plant with your own hands does not wilt in the move.',
        },
      },
      line: {
        nodes: [
          {
            id: 'farming-raised-beds',
            name: 'Raised Beds',
            hanzi: '高畦',
            effects: [{ stat: 'farmingHold', value: 0.05 }],
            text: 'Beds a hand higher drain the spring floods away.',
          },
          {
            id: 'farming-compost-pit',
            name: 'Compost Pit',
            hanzi: '肥坑',
            effects: [{ stat: 'farmingYield', value: 0.1 }],
            text: 'A pit of rotted leaves and bone meal feeds the next sowing.',
          },
          {
            id: 'farming-ash-ring',
            name: 'Ash Ring',
            hanzi: '灰圈',
            effects: [{ stat: 'farmingSafety', value: 0.5 }],
            text: 'A ring of wood ash round each plot keeps the root-borers out.',
          },
        ],
        capstone: {
          id: 'farming-second-harvest',
          name: 'Second Harvest',
          hanzi: '复收',
          effects: [{ stat: 'secondHarvest', value: 1 }],
          text: 'A rice stalk cut at the right knot sends up a second head before frost.',
        },
      },
      lore: {
        nodes: [
          {
            id: 'farming-calm-heart-grass-seal',
            name: 'Calm-Heart Grass',
            hanzi: '静心草',
            recipe: 'calm-heart-grass',
            text: 'A seed packet from any market, and a note on how deep to sow it.',
          },
          {
            id: 'farming-ridge-bitterroot-seal',
            name: 'Ridge Bitterroot',
            hanzi: '脊苦根',
            recipe: 'ridge-bitterroot',
            text: 'It grows on poor ground, and you learn to keep the ground poor.',
          },
          {
            id: 'farming-frontier-millet-seal',
            name: 'Frontier Millet',
            hanzi: '边塞粟',
            recipe: 'frontier-millet',
            effects: [{ stat: 'farmingOdds', value: 0.02 }],
            text: 'A hardy grain that taught you what a seed will put up with.',
          },
        ],
        capstone: {
          id: 'farming-seed-lore',
          name: 'Seed Lore',
          hanzi: '种识',
          effects: [{ stat: 'seedCrossing', value: 1 }],
          text: 'You lay two kinds of pollen on one flower, and keep the seed that comes of it.',
        },
      },
    },
    // Tier 2: Foundation Establishment
    {
      hand: {
        nodes: [
          {
            id: 'farming-root-reading',
            name: 'Root Reading',
            hanzi: '察根',
            effects: [{ stat: 'farmingLift', value: 0.15 }],
            text: 'You lift a plant to look at its roots, then lay it back without a bruise.',
          },
          {
            id: 'farming-night-tending',
            name: 'Night Tending',
            hanzi: '夜护',
            effects: [{ stat: 'farmingReach', value: 0.4 }],
            text: 'Some spirit herbs open only at night, and you are there with a lantern.',
          },
          {
            id: 'farming-seed-soaking',
            name: 'Seed Soaking',
            hanzi: '浸种',
            effects: [{ stat: 'farmingLift', value: 0.3 }],
            text: 'Seed steeped overnight in spring water sprouts all at once.',
          },
        ],
        capstone: {
          id: 'farming-rain-calling-hand',
          name: 'Rain-Calling Hand',
          hanzi: '引雨',
          effects: [{ stat: 'farmingLift', value: 0.5 }],
          text: "A tap on the field god's stone, and the right rain comes.",
        },
      },
      line: {
        nodes: [
          {
            id: 'farming-terraced-plot',
            name: 'Terraced Plot',
            hanzi: '梯田',
            effects: [{ stat: 'farmingHold', value: 0.08 }],
            text: 'Terraces hold water on the slope, and the slope holds the crop.',
          },
          {
            id: 'farming-dense-rows',
            name: 'Dense Rows',
            hanzi: '密垄',
            effects: [{ stat: 'farmingYield', value: 0.15 }],
            text: 'Rows set a finger closer, each plant tended by name.',
          },
          {
            id: 'farming-straw-mats',
            name: 'Straw Mats',
            hanzi: '稻席',
            effects: [
              { stat: 'farmingSafety', value: 0.4 },
              { stat: 'farmingHold', value: 0.08 },
            ],
            text: 'Straw mats spread at dusk save the field from a late frost.',
          },
        ],
        capstone: {
          id: 'farming-third-cutting',
          name: 'Third Cutting',
          hanzi: '三收',
          effects: [{ stat: 'secondHarvest', value: 1 }],
          text: 'Where one crop grew, three cuttings come before winter.',
        },
      },
      lore: {
        nodes: [
          {
            id: 'farming-seed-ledger',
            name: 'Seed Ledger',
            hanzi: '种册',
            effects: [{ stat: 'farmingOdds', value: 0.03 }],
            text: 'A book of every plot, every cross and what each one came up as.',
          },
          {
            id: 'farming-clear-spring-lotus-seal',
            name: 'Clear Spring Lotus',
            hanzi: '清泉莲',
            recipe: 'clear-spring-lotus',
            text: 'It will grow only in water that has never touched a hand.',
          },
          {
            id: 'farming-old-apricot-kernel-seal',
            name: 'Old Apricot Kernel',
            hanzi: '老杏仁',
            recipe: 'old-apricot-kernel',
            effects: [{ stat: 'farmingPity', value: 0.25 }],
            text: 'An orchard-keeper shows you which kernels are worth the cracking.',
          },
        ],
        capstone: {
          id: 'farming-strain-memory',
          name: 'Strain Memory',
          hanzi: '种忆',
          effects: [
            { stat: 'seedCrossing', value: 1 },
            { stat: 'farmingOdds', value: 0.04 },
          ],
          text: 'You remember every strain you ever grew, and which parents gave it.',
        },
      },
    },
  ],
  later: [
    // Tier 3: Core Formation
    {
      hand: {
        name: 'Spirit-Field Hand',
        hanzi: '灵田手',
        text: 'Your palm warms the soil, and the seed splits a day early.',
      },
      line: {
        name: 'Spirit-Spring Plot',
        hanzi: '灵泉田',
        text: 'A plot fed by a trickle from a spirit spring.',
      },
      lore: {
        name: 'Old Seed Slips',
        hanzi: '古种',
        text: 'A jade slip from a dead spirit farmer, listing seeds that no market stocks.',
      },
    },
    // Tier 4: Nascent Soul
    {
      hand: {
        name: 'Soul-Tended Garden',
        hanzi: '神园',
        text: 'You water a whole row with a thought, and each plant drinks what it needs.',
      },
      line: {
        name: 'Self-Tending Field',
        hanzi: '自耕',
        text: 'A field that weeds itself, with root-sprites doing the work.',
      },
      lore: {
        name: 'Strain Birthing',
        hanzi: '育种',
        text: 'You raise a strain no one has grown, and it sets seed true.',
      },
    },
    // Tier 5: Soul Transformation
    {
      hand: {
        name: 'Heaven-Rain Palm',
        hanzi: '天雨手',
        text: 'You call rain on a single bed, and on that bed alone.',
      },
      line: {
        name: 'Thousand-Year Soil',
        hanzi: '千年壤',
        text: 'Soil that has fed spirit herbs for a thousand years, thick with qi.',
      },
      lore: {
        name: 'Herb Canon',
        hanzi: '灵植经',
        text: 'You write the first chapter of a canon that other spirit farmers copy.',
      },
    },
    // Tier 6: Void Refinement
    {
      hand: {
        name: 'Void Garden Hand',
        hanzi: '虚园手',
        text: 'A seed planted in the void puts roots out into starlight.',
      },
      line: {
        name: 'Pocket Field',
        hanzi: '袖田',
        text: 'A field the size of a sleeve that holds a whole terraced hillside.',
      },
      lore: {
        name: 'Star Seed Lore',
        hanzi: '星种',
        text: 'Seeds that fell from the sky in a meteor shower, and you know what they are.',
      },
    },
    // Tier 7: Body Integration
    {
      hand: {
        name: 'Root-Body Hand',
        hanzi: '根身',
        text: 'Your fingers take root, and the soil speaks through them.',
      },
      line: {
        name: 'Body Field',
        hanzi: '身田',
        text: 'Your dantian is a field, and herbs grow in its qi-rich soil.',
      },
      lore: {
        name: 'Wood-Heart Memory',
        hanzi: '木心',
        text: 'You know every herb as a line you have lived.',
      },
    },
    // Tier 8: Mahayana
    {
      hand: {
        name: 'Season-Turning Hand',
        hanzi: '转季手',
        text: 'A wave of your hand turns spring into autumn over one plot.',
      },
      line: {
        name: 'Eternal Spring Field',
        hanzi: '长春田',
        text: 'A field where it is always spring, and nothing wilts.',
      },
      lore: {
        name: 'Complete Herb Canon',
        hanzi: '全植经',
        text: 'Every herb in the world is a line in a book you have read to the last page.',
      },
    },
    // Tier 9: Tribulation Transcendence
    {
      hand: {
        name: 'Heaven-Sprout Hand',
        hanzi: '天苗手',
        text: 'A seed you plant grows into the tree that holds up a sky.',
      },
      line: {
        name: 'Field That Is a World',
        hanzi: '洞天田',
        text: 'A field as wide as a small world, with its own seasons.',
      },
      lore: {
        name: 'Dao Seed',
        hanzi: '道种',
        text: 'A seed that holds every plant in it, waiting to be told which.',
      },
    },
  ],
});

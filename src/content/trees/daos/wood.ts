// The Wood Dao: rooting, regrowth and poison (design § The combat Daos). Its side paths reach into
// the garden: an eye for herbs, how fast they age, and the venom in them. Drafted in P2.3 from the
// D2 skeleton; **awaiting Jan's review**.
import { defineDao } from '../dao.ts';

export const WOOD_DAO = defineDao({
  id: 'wood',
  name: 'Wood',
  hanzi: '木',
  what: 'Rooting, regrowth and poison: how hard your wood strikes, how it holds a foe, and how it knits you back. An action counts the Wood Dao when it is tagged wood or deals wood.',
  lean: 'left',
  tiers: [
    // Tier 1: Qi Condensation
    {
      starter: {
        id: 'wood-first-shoot',
        name: 'First Shoot',
        hanzi: '初芽',
        effects: [{ stat: 'woodPower', value: 0.03 }],
        text: 'A green shoot pushes up through the qi in your palm.',
      },
      gates: [
        {
          id: 'wood1-verdant',
          name: 'Verdant',
          nodes: [
            {
              id: 'wood-new-leaf',
              name: 'New Leaf',
              hanzi: '新叶',
              effects: [{ stat: 'woodPower', value: 0.04 }],
              text: 'Soft leaves unfurl in the channels, reaching for any light.',
            },
            {
              id: 'wood-green-sap',
              name: 'Green Sap',
              hanzi: '青汁',
              effects: [{ stat: 'woodPower', value: 0.04 }],
              text: 'Your qi runs thick and sweet and slow, and it does not stop.',
            },
            {
              id: 'wood-verdant',
              name: 'Verdant',
              hanzi: '葱茏',
              effects: [{ stat: 'woodPower', value: 0.08 }],
              text: 'Everything in you is in leaf, and your wood strikes with all of it.',
            },
          ],
        },
        {
          id: 'wood1-rooting',
          name: 'Rooting',
          nodes: [
            {
              id: 'wood-reaching-root',
              name: 'Reaching Root',
              hanzi: '伸根',
              effects: [{ stat: 'rootTurns', value: 1 }],
              text: 'A root goes looking for the foe’s ankle, and it is patient.',
            },
            {
              id: 'wood-knotwood',
              name: 'Knotwood',
              hanzi: '结木',
              effects: [{ stat: 'woodCrit', value: 0.01 }],
              text: 'You strike where the grain knots, and the knot gives.',
            },
            {
              id: 'wood-rooting',
              name: 'Rooting',
              hanzi: '扎根',
              effects: [
                { stat: 'rootTurns', value: 1 },
                { stat: 'woodHit', value: 0.08 },
              ],
              text: 'A root of yours holds a turn longer, and a rooted foe is easy to hit.',
            },
          ],
        },
        {
          id: 'wood1-regrowth',
          name: 'Regrowth',
          nodes: [
            {
              id: 'wood-scar-bark',
              name: 'Scar Bark',
              hanzi: '疤皮',
              effects: [{ stat: 'fightRegen', value: 0.01 }],
              text: 'Where you are cut, the bark thickens over the cut.',
            },
            {
              id: 'wood-grafted-limb',
              name: 'Grafted Limb',
              hanzi: '接枝',
              effects: [{ stat: 'fightRegen', value: 0.01 }],
              text: 'A hurt limb knits in the middle of the fight, as a graft takes.',
            },
            {
              id: 'wood-regrowth',
              name: 'Regrowth',
              hanzi: '再生',
              effects: [{ stat: 'fightRegen', value: 0.02 }],
              text: 'You mend a little at the start of every turn, as a cut tree puts out new wood.',
            },
          ],
        },
      ],
      sides: [
        {
          id: 'wood1-herb',
          name: 'Herb Sense',
          nodes: [
            {
              id: 'wood-green-thumb',
              name: 'Green Thumb',
              hanzi: '绿指',
              effects: [{ stat: 'herbSense', value: 0.05 }],
              text: 'Seedlings take to the soil under your hand.',
            },
            {
              id: 'wood-leaf-reading',
              name: 'Leaf Reading',
              hanzi: '观叶',
              effects: [{ stat: 'herbSense', value: 0.05 }],
              text: 'The curl of a leaf tells you what is wrong with the root.',
            },
            {
              id: 'wood-herb-sense',
              name: 'Herb Sense',
              hanzi: '识草',
              effects: [{ stat: 'herbSense', value: 0.1 }],
              text: 'You walk a hillside and the good herbs seem to lean toward you.',
            },
          ],
        },
      ],
      capstone: {
        id: 'wood-deep-roots',
        name: 'Deep Roots',
        hanzi: '深根',
        effects: [
          { stat: 'woodPower', value: 0.1 },
          { stat: 'deepRoots', value: 0.5 },
        ],
        text: 'While a foe is rooted, the roots feed you too: your mending is half again as strong.',
      },
    },

    // Tier 2: Foundation Establishment
    {
      starter: {
        id: 'wood-foundation-wood',
        name: 'Foundation Wood',
        hanzi: '筑基木',
        effects: [{ stat: 'woodPower', value: 0.04 }],
        text: 'The wood has a trunk now, standing in the foundation itself.',
      },
      gates: [
        {
          id: 'wood2-overgrowth',
          name: 'Overgrowth',
          nodes: [
            {
              id: 'wood-thick-bark',
              name: 'Thick Bark',
              hanzi: '厚皮',
              effects: [{ stat: 'woodPower', value: 0.05 }],
              text: 'Layer on layer of qi, one ring for every season you sat through.',
            },
            {
              id: 'wood-spreading-canopy',
              name: 'Spreading Canopy',
              hanzi: '展冠',
              effects: [{ stat: 'woodPower', value: 0.05 }],
              text: 'Your wood takes the light from everything beneath it.',
            },
            {
              id: 'wood-crowded-thicket',
              name: 'Crowded Thicket',
              hanzi: '密丛',
              effects: [{ stat: 'woodPower', value: 0.05 }],
              text: 'No room between your shoots for anything that is not you.',
            },
            {
              id: 'wood-overgrowth',
              name: 'Overgrowth',
              hanzi: '疯长',
              effects: [{ stat: 'woodPower', value: 0.15 }],
              text: 'You stop pruning, and the wood runs wild and hits like a flood.',
            },
          ],
        },
        {
          id: 'wood2-vines',
          name: 'Binding Vines',
          nodes: [
            {
              id: 'wood-creeper',
              name: 'Creeper',
              hanzi: '藤蔓',
              effects: [{ stat: 'woodCrit', value: 0.02 }],
              text: 'A thin vine finds the gap in a guard and goes in.',
            },
            {
              id: 'wood-tight-coil',
              name: 'Tight Coil',
              hanzi: '紧缠',
              effects: [{ stat: 'rootTurns', value: 1 }],
              text: 'The vine winds twice round the leg, and then twice again.',
            },
            {
              id: 'wood-thorn-bind',
              name: 'Thorn Bind',
              hanzi: '棘缚',
              effects: [{ stat: 'woodCrit', value: 0.02 }],
              text: 'Every thorn is turned in, so that pulling it tighter hurts.',
            },
            {
              id: 'wood-binding-vines',
              name: 'Binding Vines',
              hanzi: '缚藤',
              effects: [{ stat: 'bindingVines', value: 1 }],
              text: 'A foe you root loses a fifth of its Evasion besides.',
            },
          ],
        },
        {
          id: 'wood2-spring',
          name: 'Spring Return',
          nodes: [
            {
              id: 'wood-sap-rise',
              name: 'Sap Rise',
              hanzi: '汁升',
              effects: [{ stat: 'regeneration', value: 0.25 }],
              text: 'In spring the sap climbs the trunk again, and your wounds close with it.',
            },
            {
              id: 'wood-budding',
              name: 'Budding',
              hanzi: '抽芽',
              effects: [{ stat: 'regeneration', value: 0.25 }],
              text: 'Small green buds where the flesh was torn.',
            },
            {
              id: 'wood-second-leaf',
              name: 'Second Leaf',
              hanzi: '复叶',
              effects: [{ stat: 'regeneration', value: 0.25 }],
              text: 'What fell in the autumn comes back in the spring.',
            },
            {
              id: 'wood-spring-return',
              name: 'Spring Return',
              hanzi: '春回',
              effects: [{ stat: 'regeneration', value: 0.5 }],
              text: 'After a fight, and between fights, your body mends faster than it has any right to.',
            },
          ],
        },
      ],
      sides: [
        {
          id: 'wood2-growth',
          name: 'Old Growth',
          nodes: [
            {
              id: 'wood-patient-garden',
              name: 'Patient Garden',
              hanzi: '候园',
              effects: [{ stat: 'herbAge', value: 0.05 }],
              text: 'You learn when to leave a plot alone, and let the years do the work.',
            },
            {
              id: 'wood-old-growth',
              name: 'Old Growth',
              hanzi: '古木',
              effects: [{ stat: 'herbAge', value: 0.1 }],
              text: 'Herbs in your garden ripen in the time it takes others to seed.',
            },
          ],
        },
        {
          id: 'wood2-bloom',
          name: 'Venom Bloom',
          nodes: [
            {
              id: 'wood-bitter-sap',
              name: 'Bitter Sap',
              hanzi: '苦汁',
              effects: [{ stat: 'poisonDamage', value: 0.05 }],
              text: 'The sap of some plants kills, and you have learned which.',
            },
            {
              id: 'wood-venom-bloom',
              name: 'Venom Bloom',
              hanzi: '毒花',
              effects: [{ stat: 'poisonDamage', value: 0.15 }],
              text: 'A pretty flower, pollen on its tongue; a foe breathes it in and keeps breathing.',
            },
          ],
        },
      ],
      capstone: {
        id: 'wood-evergreen',
        name: 'Evergreen',
        hanzi: '常青',
        effects: [
          { stat: 'woodPower', value: 0.1 },
          { stat: 'evergreen', value: 1 },
        ],
        text: 'Once a fight, a blow that would fell you leaves you a quarter of your HP instead.',
      },
    },
  ],
});

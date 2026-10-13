// The Earth Dao: weight, stagger and standing firm (design § The combat Daos). Its side paths reach
// down into the ground: spirit veins and sites on the map, and a place to hide in the dirt. Drafted
// in P2.3 from the D2 skeleton; **awaiting Jan's review**.
import { defineDao } from '../dao.ts';

export const EARTH_DAO = defineDao({
  id: 'earth',
  name: 'Earth',
  hanzi: '土',
  what: 'Weight, stagger and standing firm: how hard your earth falls, how it knocks a foe off balance, and how little you give ground. An action counts the Earth Dao when it is tagged earth or deals earth.',
  lean: 'left',
  tiers: [
    // Tier 1: Qi Condensation
    {
      starter: {
        id: 'earth-first-stone',
        name: 'First Stone',
        hanzi: '初石',
        effects: [{ stat: 'earthPower', value: 0.03 }],
        text: 'You learn to feel the weight of a stone in the hand before you throw it.',
      },
      gates: [
        {
          id: 'earth1-weight',
          name: 'Weight',
          nodes: [
            {
              id: 'earth-heavy-hands',
              name: 'Sunken Weight',
              hanzi: '沉劲',
              effects: [{ stat: 'earthPower', value: 0.04 }],
              text: 'Your fists sit low, and what you throw has all of you behind it.',
            },
            {
              id: 'earth-packed-clay',
              name: 'Packed Clay',
              hanzi: '实泥',
              effects: [{ stat: 'earthPower', value: 0.04 }],
              text: 'Qi pressed down until there is no air left in it.',
            },
            {
              id: 'earth-weight',
              name: 'Weight',
              hanzi: '厚重',
              effects: [
                { stat: 'earthPower', value: 0.08 },
                { stat: 'earthHit', value: 0.04 },
              ],
              text: 'Your earth falls like a stone falls: hard, and exactly where it is going.',
            },
          ],
        },
        {
          id: 'earth1-stagger',
          name: 'Stagger',
          nodes: [
            {
              id: 'earth-shoving-palm',
              name: 'Shoving Palm',
              hanzi: '推掌',
              effects: [{ stat: 'earthCrit', value: 0.01 }],
              text: 'A palm into the chest, and a step back he did not choose.',
            },
            {
              id: 'earth-bad-footing',
              name: 'Bad Footing',
              hanzi: '失足',
              effects: [{ stat: 'earthCrit', value: 0.01 }],
              text: 'You strike the knee and the ankle first, and the rest of him follows.',
            },
            {
              id: 'earth-stagger',
              name: 'Stagger',
              hanzi: '震退',
              effects: [{ stat: 'staggerSlow', value: 1 }],
              text: 'A foe you stagger acts last.',
            },
          ],
        },
        {
          id: 'earth1-stance',
          name: 'Mountain Stance',
          nodes: [
            {
              id: 'earth-low-root',
              name: 'Low Root',
              hanzi: '低根',
              effects: [{ stat: 'hp', value: 0.03 }],
              text: 'You sink into the knees until the ground holds you up.',
            },
            {
              id: 'earth-wide-feet',
              name: 'Wide Feet',
              hanzi: '开步',
              effects: [{ stat: 'hp', value: 0.03 }],
              text: 'Shoulders’ width, then a little more. Nothing pushes you off it.',
            },
            {
              id: 'earth-mountain-stance',
              name: 'Mountain Stance',
              hanzi: '山架',
              effects: [
                { stat: 'hp', value: 0.08 },
                { stat: 'staggerResist', value: 0.25 },
              ],
              text: 'You stand like a hill, and a shove slides off you more often than not.',
            },
          ],
        },
      ],
      sides: [
        {
          id: 'earth1-vein',
          name: 'Vein Sense',
          nodes: [
            {
              id: 'earth-bare-feet',
              name: 'Bare Feet',
              hanzi: '赤足',
              effects: [{ stat: 'veinSense', value: 0.05 }],
              text: 'You stand barefoot on the ground and feel it hum.',
            },
            {
              id: 'earth-dowsing-hand',
              name: 'Dowsing Hand',
              hanzi: '探手',
              effects: [{ stat: 'veinSense', value: 0.05 }],
              text: 'Your palm warms over a place where the qi runs strong below.',
            },
            {
              id: 'earth-vein-sense',
              name: 'Vein Sense',
              hanzi: '识脉',
              effects: [{ stat: 'veinSense', value: 0.1 }],
              text: 'You can feel where a spirit vein runs, and where it stops.',
            },
          ],
        },
      ],
      capstone: {
        id: 'earth-unmoved',
        name: 'Unmoved',
        hanzi: '不动',
        effects: [
          { stat: 'earthPower', value: 0.1 },
          { stat: 'unmoved', value: 1 },
        ],
        text: 'The first hit against you each turn does half: it lands on the mountain.',
      },
    },

    // Tier 2: Foundation Establishment
    {
      starter: {
        id: 'earth-foundation-earth',
        name: 'Foundation Earth',
        hanzi: '筑基土',
        effects: [{ stat: 'earthPower', value: 0.04 }],
        text: 'The earth has bedrock now, under the foundation itself.',
      },
      gates: [
        {
          id: 'earth2-landslide',
          name: 'Landslide',
          nodes: [
            {
              id: 'earth-loose-scree',
              name: 'Loose Scree',
              hanzi: '碎石',
              effects: [{ stat: 'earthPower', value: 0.05 }],
              text: 'The slope lets go a stone at a time, then all at once.',
            },
            {
              id: 'earth-hard-wedge',
              name: 'Hard Wedge',
              hanzi: '硬楔',
              effects: [{ stat: 'earthPierce', value: 0.1 }],
              text: 'A wedge of rock that goes into a crack and splits it.',
            },
            {
              id: 'earth-rolling-boulder',
              name: 'Rolling Boulder',
              hanzi: '滚石',
              effects: [{ stat: 'earthPower', value: 0.05 }],
              text: 'Once it is moving, you only have to keep out of its way.',
            },
            {
              id: 'earth-landslide',
              name: 'Landslide',
              hanzi: '山崩',
              effects: [{ stat: 'earthPierce', value: 0.3 }],
              text: 'The whole hillside comes down. Armor and wards stop a good part less of it.',
            },
          ],
        },
        {
          id: 'earth2-crush',
          name: 'Crush',
          nodes: [
            {
              id: 'earth-grinding-weight',
              name: 'Grinding Weight',
              hanzi: '磨压',
              effects: [{ stat: 'earthCrit', value: 0.02 }],
              text: 'A heavy thing leaning on a stumbling one: it does not need to be quick.',
            },
            {
              id: 'earth-millstone',
              name: 'Millstone',
              hanzi: '磨盘',
              effects: [{ stat: 'earthCrit', value: 0.02 }],
              text: 'Round and slow and unstoppable, and it takes what is in between.',
            },
            {
              id: 'earth-pinned-foe',
              name: 'Pinned Foe',
              hanzi: '压制',
              effects: [{ stat: 'earthCrit', value: 0.02 }],
              text: 'A foe with his feet off the ground cannot get out from under you.',
            },
            {
              id: 'earth-crush',
              name: 'Crush',
              hanzi: '碾压',
              effects: [{ stat: 'crush', value: 0.15 }],
              text: 'Earth deals a seventh more to a staggered foe.',
            },
          ],
        },
        {
          id: 'earth2-bedrock',
          name: 'Bedrock',
          nodes: [
            {
              id: 'earth-deep-footing',
              name: 'Deep Footing',
              hanzi: '深基',
              effects: [{ stat: 'hp', value: 0.05 }],
              text: 'Your stance goes down a fathom, and the ground under you goes down with it.',
            },
            {
              id: 'earth-granite-skin',
              name: 'Granite Skin',
              hanzi: '岩肤',
              effects: [{ stat: 'physicalResist', value: 0.05 }],
              text: 'Your skin has a grain now, and the grain is stone.',
            },
            {
              id: 'earth-thick-bones',
              name: 'Thick Bones',
              hanzi: '厚骨',
              effects: [{ stat: 'hp', value: 0.05 }],
              text: 'Bone dense as a quarried block, and no easier to break.',
            },
            {
              id: 'earth-bedrock',
              name: 'Bedrock',
              hanzi: '基岩',
              effects: [
                { stat: 'hp', value: 0.1 },
                { stat: 'physicalResist', value: 0.1 },
              ],
              text: 'Nothing is under you but the world, and the world does not move.',
            },
          ],
        },
      ],
      sides: [
        {
          id: 'earth2-spirit-vein',
          name: 'Spirit Vein Sense',
          nodes: [
            {
              id: 'earth-hollow-ground',
              name: 'Hollow Ground',
              hanzi: '空地',
              effects: [{ stat: 'veinSense', value: 0.05 }],
              text: 'You can tell by the sound of a footfall when there is a cave underneath.',
            },
            {
              id: 'earth-spirit-vein-sense',
              name: 'Spirit Vein Sense',
              hanzi: '灵脉感',
              effects: [{ stat: 'veinSense', value: 0.1 }],
              text: 'You can find the site for an abode with your eyes closed and your hand on the ground.',
            },
          ],
        },
        {
          id: 'earth2-burrow',
          name: 'Burrow',
          nodes: [
            {
              id: 'earth-dirt-cover',
              name: 'Dirt Cover',
              hanzi: '土掩',
              effects: [{ stat: 'physicalResist', value: 0.05 }],
              text: 'A ditch and a heap of loose soil is a wall, if you know how to use it.',
            },
            {
              id: 'earth-burrow',
              name: 'Burrow',
              hanzi: '遁地',
              effects: [{ stat: 'burrow', value: 1 }],
              text: 'You can find cover anywhere there is dirt, and go down into it to escape.',
            },
          ],
        },
      ],
      capstone: {
        id: 'earth-mountain-falls',
        name: 'Mountain Falls',
        hanzi: '山倾',
        effects: [
          { stat: 'earthPower', value: 0.1 },
          { stat: 'mountainFalls', value: 1 },
        ],
        text: 'A critical of yours staggers every foe, not only the one you struck.',
      },
    },
  ],
});

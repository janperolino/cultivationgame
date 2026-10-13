// The Water Dao: flow, chill and recovery (design § The combat Daos). Its side paths reach into the
// sea and travel on it: tide sense and a deeper rest between fights. Drafted in P2.3 from the D2
// skeleton; **awaiting Jan's review**.
import { defineDao } from '../dao.ts';

export const WATER_DAO = defineDao({
  id: 'water',
  name: 'Water',
  hanzi: '水',
  what: 'Flow, chill and recovery: how hard your water falls, how it slows a foe, and how it gives you back. An action counts the Water Dao when it is tagged water or deals water.',
  lean: 'right',
  tiers: [
    // Tier 1: Qi Condensation
    {
      starter: {
        id: 'water-first-drop',
        name: 'First Drop',
        hanzi: '初水',
        effects: [{ stat: 'waterPower', value: 0.03 }],
        text: 'You learn to hold a drop on the fingertip without it running off.',
      },
      gates: [
        {
          id: 'water1-current',
          name: 'Deep Current',
          nodes: [
            {
              id: 'water-slow-eddy',
              name: 'Slow Eddy',
              hanzi: '缓涡',
              effects: [{ stat: 'waterPower', value: 0.04 }],
              text: 'Qi turns in a slow circle in the belly and gathers weight as it turns.',
            },
            {
              id: 'water-undertow-pull',
              name: 'Under-Pull',
              hanzi: '底牵',
              effects: [{ stat: 'waterPower', value: 0.04 }],
              text: 'The surface stays calm while something below it starts to drag.',
            },
            {
              id: 'water-deep-current',
              name: 'Deep Current',
              hanzi: '深流',
              effects: [
                { stat: 'waterPower', value: 0.08 },
                { stat: 'waterHit', value: 0.04 },
              ],
              text: 'Your water runs deep and does not wander: it hits harder and finds what you aimed at.',
            },
          ],
        },
        {
          id: 'water1-chill',
          name: 'Chill',
          nodes: [
            {
              id: 'water-cold-spring',
              name: 'Cold Spring',
              hanzi: '寒泉',
              effects: [{ stat: 'chillTurns', value: 1 }],
              text: 'Your water comes from somewhere the sun never reaches.',
            },
            {
              id: 'water-frost-breath',
              name: 'Frost Breath',
              hanzi: '霜息',
              effects: [{ stat: 'waterCrit', value: 0.01 }],
              text: 'Your breath shows white in a warm room, and you strike where the cold has settled.',
            },
            {
              id: 'water-chill',
              name: 'Chill',
              hanzi: '寒意',
              effects: [
                { stat: 'chillSlow', value: 1 },
                { stat: 'chillTurns', value: 1 },
              ],
              text: 'A chill of yours lasts a turn longer, and a foe you chill acts last.',
            },
          ],
        },
        {
          id: 'water1-form',
          name: 'Flowing Form',
          nodes: [
            {
              id: 'water-loose-wrists',
              name: 'Loose Wrists',
              hanzi: '松腕',
              effects: [{ stat: 'evasion', value: 0.03 }],
              text: 'A fist cannot take a stream in hand; you stop making one.',
            },
            {
              id: 'water-slipping-step',
              name: 'Slipping Step',
              hanzi: '滑步',
              effects: [{ stat: 'evasion', value: 0.03 }],
              text: 'Your weight is never quite where the blow lands.',
            },
            {
              id: 'water-flowing-form',
              name: 'Flowing Form',
              hanzi: '流形',
              effects: [{ stat: 'evasion', value: 0.08 }],
              text: 'You pour around a strike the way a river pours around a stone.',
            },
          ],
        },
      ],
      sides: [
        {
          id: 'water1-still',
          name: 'Still Water',
          nodes: [
            {
              id: 'water-held-breath',
              name: 'Held Breath',
              hanzi: '闭息',
              effects: [{ stat: 'qiRecovery', value: 0.05 }],
              text: 'You stop, and the qi you spent comes back up like silt settling.',
            },
            {
              id: 'water-flat-pond',
              name: 'Flat Pond',
              hanzi: '平塘',
              effects: [{ stat: 'qiRecovery', value: 0.05 }],
              text: 'Not a ripple on the dantian. Not one.',
            },
            {
              id: 'water-still-water',
              name: 'Still Water',
              hanzi: '止水',
              effects: [{ stat: 'qiRecovery', value: 0.1 }],
              text: 'A defend of yours draws back a good share of the qi you spent.',
            },
          ],
        },
      ],
      capstone: {
        id: 'water-undertow',
        name: 'Undertow',
        hanzi: '暗潮',
        effects: [
          { stat: 'waterPower', value: 0.1 },
          { stat: 'undertow', value: 1 },
        ],
        text: 'Your chill drags from below: a chilled foe loses its minor action.',
      },
    },

    // Tier 2: Foundation Establishment
    {
      starter: {
        id: 'water-foundation-water',
        name: 'Foundation Water',
        hanzi: '筑基水',
        effects: [{ stat: 'waterPower', value: 0.04 }],
        text: 'The water has a bed now, cut into the foundation itself.',
      },
      gates: [
        {
          id: 'water2-abyss',
          name: 'Abyss',
          nodes: [
            {
              id: 'water-heavy-water',
              name: 'Heavy Water',
              hanzi: '重水',
              effects: [{ stat: 'waterPower', value: 0.05 }],
              text: 'Your water is dense, and it sinks into things.',
            },
            {
              id: 'water-seeping-edge',
              name: 'Seeping Edge',
              hanzi: '渗缘',
              effects: [{ stat: 'waterPierce', value: 0.1 }],
              text: 'Water finds the seam in a robe and does not stop at the seam.',
            },
            {
              id: 'water-pressure',
              name: 'Pressure',
              hanzi: '水压',
              effects: [{ stat: 'waterPower', value: 0.05 }],
              text: 'A fathom down, the sea leans on you from every side. Now so do you.',
            },
            {
              id: 'water-abyss',
              name: 'Abyss',
              hanzi: '深渊',
              effects: [{ stat: 'waterPierce', value: 0.3 }],
              text: 'Water from the bottom of the sea. Armor and wards stop a good part less of it.',
            },
          ],
        },
        {
          id: 'water2-edge',
          name: 'Freezing Edge',
          nodes: [
            {
              id: 'water-ice-seam',
              name: 'Ice Seam',
              hanzi: '冰隙',
              effects: [{ stat: 'waterCrit', value: 0.02 }],
              text: 'Frost cracks a chilled foe along the same line each time.',
            },
            {
              id: 'water-brittle-cold',
              name: 'Brittle Cold',
              hanzi: '脆寒',
              effects: [{ stat: 'waterCrit', value: 0.02 }],
              text: 'A cold foe is a stiff foe, and a stiff foe breaks.',
            },
            {
              id: 'water-hoarfrost',
              name: 'Hoarfrost',
              hanzi: '白霜',
              effects: [{ stat: 'waterCrit', value: 0.02 }],
              text: 'Frost on the hair and the lashes, and on the sword arm.',
            },
            {
              id: 'water-freezing-edge',
              name: 'Freezing Edge',
              hanzi: '冰刃',
              effects: [{ stat: 'freezingEdge', value: 1 }],
              text: 'A critical on a chilled foe freezes it where it stands.',
            },
          ],
        },
        {
          id: 'water2-mist',
          name: 'Mist Step',
          nodes: [
            {
              id: 'water-thin-fog',
              name: 'Thin Fog',
              hanzi: '薄雾',
              effects: [{ stat: 'evasion', value: 0.05 }],
              text: 'A haze round your body blurs where it ends.',
            },
            {
              id: 'water-dew-foot',
              name: 'Dew Foot',
              hanzi: '露足',
              effects: [{ stat: 'evasion', value: 0.05 }],
              text: 'You step on wet grass and leave no print.',
            },
            {
              id: 'water-morning-haze',
              name: 'Morning Haze',
              hanzi: '晨霭',
              effects: [{ stat: 'evasion', value: 0.05 }],
              text: 'A foe swings at where you were a breath ago.',
            },
            {
              id: 'water-mist-step',
              name: 'Mist Step',
              hanzi: '雾步',
              effects: [{ stat: 'mistStep', value: 1 }],
              text: 'The first hit against you each fight does half: it lands on mist.',
            },
          ],
        },
      ],
      sides: [
        {
          id: 'water2-spring',
          name: 'Deep Spring',
          nodes: [
            {
              id: 'water-seep',
              name: 'Seep',
              hanzi: '渗',
              effects: [{ stat: 'restQi', value: 0.05 }],
              text: 'Rest lets the qi seep back, a little at a time.',
            },
            {
              id: 'water-deep-spring',
              name: 'Deep Spring',
              hanzi: '深泉',
              effects: [{ stat: 'restQi', value: 0.1 }],
              text: 'Between fights, a spring under the dantian fills you back to the brim.',
            },
          ],
        },
        {
          id: 'water2-tide',
          name: 'Tide Sense',
          nodes: [
            {
              id: 'water-salt-tongue',
              name: 'Salt Tongue',
              hanzi: '咸舌',
              effects: [{ stat: 'seaSense', value: 0.05 }],
              text: 'You taste the sea on the wind and know how far off the shore is.',
            },
            {
              id: 'water-tide-sense',
              name: 'Tide Sense',
              hanzi: '潮感',
              effects: [{ stat: 'seaSense', value: 0.1 }],
              text: 'You feel the tide turn in your knees, even a day inland.',
            },
          ],
        },
      ],
      capstone: {
        id: 'water-riptide',
        name: 'Riptide',
        hanzi: '激流',
        effects: [
          { stat: 'waterPower', value: 0.1 },
          { stat: 'riptide', value: 0.2 },
        ],
        text: 'Your water takes a chilled foe out to sea: water deals a fifth more to a chilled foe.',
      },
    },
  ],
});

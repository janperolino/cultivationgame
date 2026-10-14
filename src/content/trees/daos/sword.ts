// The Sword Dao: precision and the single strike (design § The combat Daos). Its side path is the
// sword's pressure, a bearing that talks before it cuts. Drafted in P2.3 from the D2 skeleton;
// **awaiting Jan's review**.
import { defineDao } from '../dao.ts';

export const SWORD_DAO = defineDao({
  id: 'sword',
  name: 'Sword',
  hanzi: '剑',
  what: 'Precision and the single strike: where the blade lands, how true the edge is, and how far its qi goes. An action counts the Sword Dao when it is tagged sword.',
  lean: 'right',
  tiers: [
    // Tier 1: Qi Condensation
    {
      starter: {
        id: 'sword-first-draw',
        name: 'First Draw',
        hanzi: '初剑',
        effects: [{ stat: 'swordPower', value: 0.03 }],
        text: 'You draw the blade once, slowly, and learn where it wants to go.',
      },
      gates: [
        {
          id: 'sword1-heart',
          name: 'Sword Heart',
          nodes: [
            {
              id: 'sword-steady-grip',
              name: 'Steady Grip',
              hanzi: '稳握',
              effects: [{ stat: 'swordHit', value: 0.03 }],
              text: 'A grip that does not tighten when the foe moves.',
            },
            {
              id: 'sword-level-wrist',
              name: 'Level Wrist',
              hanzi: '平腕',
              effects: [{ stat: 'swordHit', value: 0.03 }],
              text: 'The point stays where you sent it, however the arm tires.',
            },
            {
              id: 'sword-sword-heart',
              name: 'Sword Heart',
              hanzi: '剑心',
              effects: [
                { stat: 'swordHit', value: 0.06 },
                { stat: 'swordCrit', value: 0.01 },
              ],
              text: 'Your heart and the blade point the same way: your sword finds what it is aimed at.',
            },
          ],
        },
        {
          id: 'sword1-edge',
          name: 'Keen Edge',
          nodes: [
            {
              id: 'sword-whetstone',
              name: 'Honing',
              hanzi: '砺锋',
              effects: [{ stat: 'swordCrit', value: 0.01 }],
              text: 'You hone the edge each night until paper parts on it.',
            },
            {
              id: 'sword-thin-blade',
              name: 'Thin Blade',
              hanzi: '薄刃',
              effects: [{ stat: 'swordCrit', value: 0.01 }],
              text: 'A thinner edge cuts cleaner and asks less of the arm.',
            },
            {
              id: 'sword-keen-edge',
              name: 'Keen Edge',
              hanzi: '利刃',
              effects: [
                { stat: 'swordCrit', value: 0.02 },
                { stat: 'swordPower', value: 0.04 },
              ],
              text: 'Your edge goes where the armor is thin: sword criticals come more often and cut deeper.',
            },
          ],
        },
        {
          id: 'sword1-qi',
          name: 'Sword Qi',
          nodes: [
            {
              id: 'sword-qi-along-steel',
              name: 'Qi Along the Steel',
              hanzi: '气行剑',
              effects: [{ stat: 'swordPower', value: 0.04 }],
              text: 'Qi runs down the arm and along the blade.',
            },
            {
              id: 'sword-ringing-blade',
              name: 'Ringing Blade',
              hanzi: '鸣锋',
              effects: [{ stat: 'swordPower', value: 0.04 }],
              text: 'The steel hums when the qi is in it.',
            },
            {
              id: 'sword-sword-qi',
              name: 'Sword Qi',
              hanzi: '剑气',
              effects: [
                { stat: 'swordPower', value: 0.08 },
                { stat: 'techniquePower', value: 0.04 },
              ],
              text: 'A thread of qi leaves the point: your sword techniques keep their force at range.',
            },
          ],
        },
      ],
      sides: [
        {
          id: 'sword1-bearing',
          name: 'Sword Bearing',
          nodes: [
            {
              id: 'sword-drawn-stillness',
              name: 'Drawn Stillness',
              hanzi: '静立',
              effects: [{ stat: 'intimidate', value: 0.05 }],
              text: 'You stand with the sword low and say nothing.',
            },
            {
              id: 'sword-cold-stare',
              name: 'Cold Stare',
              hanzi: '冷目',
              effects: [{ stat: 'intimidate', value: 0.05 }],
              text: 'The timid look at the blade, then at you, then away.',
            },
            {
              id: 'sword-sword-bearing',
              name: 'Sword Bearing',
              hanzi: '剑势',
              effects: [{ stat: 'intimidate', value: 0.15 }],
              text: 'A sword not yet drawn already ends arguments: your talk wins against the timid.',
            },
          ],
        },
      ],
      capstone: {
        id: 'sword-one-sword',
        name: 'One Sword',
        hanzi: '一剑',
        effects: [
          { stat: 'swordPower', value: 0.1 },
          { stat: 'oneSword', value: 0.5 },
        ],
        text: 'All you are goes into the first cut: the first sword strike or technique of a fight deals half again as much.',
      },
    },

    // Tier 2: Foundation Establishment
    {
      starter: {
        id: 'sword-foundation-sword',
        name: 'Foundation Sword',
        hanzi: '筑基剑',
        effects: [{ stat: 'swordPower', value: 0.04 }],
        text: 'The sword has a place in the foundation now, and sits there unmoving.',
      },
      gates: [
        {
          id: 'sword2-clear',
          name: 'Clear Heart',
          nodes: [
            {
              id: 'sword-still-mind',
              name: 'Still Mind',
              hanzi: '止水',
              effects: [{ stat: 'swordHit', value: 0.05 }],
              text: 'A mind like a pool on a windless day.',
            },
            {
              id: 'sword-no-stray-thought',
              name: 'No Stray Thought',
              hanzi: '无念',
              effects: [{ stat: 'swordHit', value: 0.05 }],
              text: 'The blade moves only when the thought is finished.',
            },
            {
              id: 'sword-open-eyes',
              name: 'Open Eyes',
              hanzi: '明目',
              effects: [{ stat: 'swordHit', value: 0.05 }],
              text: 'You watch the foe’s shoulders, never his sword.',
            },
            {
              id: 'sword-clear-heart',
              name: 'Clear Heart',
              hanzi: '清心',
              effects: [
                { stat: 'swordHit', value: 0.1 },
                { stat: 'clearHeart', value: 1 },
              ],
              text: 'A heart too clear to be clouded: daze cannot touch you.',
            },
          ],
        },
        {
          id: 'sword2-light',
          name: 'Sword Light',
          nodes: [
            {
              id: 'sword-flash-of-steel',
              name: 'Flash of Steel',
              hanzi: '剑闪',
              effects: [{ stat: 'swordCrit', value: 0.02 }],
              text: 'The foe sees the flash, and then the cut.',
            },
            {
              id: 'sword-bright-cut',
              name: 'Bright Cut',
              hanzi: '明斩',
              effects: [{ stat: 'swordCrit', value: 0.02 }],
              text: 'A cut so clean it leaves no sound behind it.',
            },
            {
              id: 'sword-hairs-breadth',
              name: 'Hair’s Breadth',
              hanzi: '毫厘',
              effects: [{ stat: 'swordCrit', value: 0.02 }],
              text: 'You cut where a hair’s breadth decides it.',
            },
            {
              id: 'sword-sword-light',
              name: 'Sword Light',
              hanzi: '剑光',
              effects: [{ stat: 'critDamage', value: 0.25 }],
              text: 'Your cut is a line of light, and where it lands true it goes deep: criticals deal more.',
            },
          ],
        },
        {
          id: 'sword2-flying',
          name: 'Flying Sword',
          nodes: [
            {
              id: 'sword-qi-thread',
              name: 'Qi Thread',
              hanzi: '气丝',
              effects: [{ stat: 'swordPower', value: 0.05 }],
              text: 'A fine thread of qi from your hand to the hilt.',
            },
            {
              id: 'sword-loosened-hand',
              name: 'Loosened Hand',
              hanzi: '松手',
              effects: [{ stat: 'swordPower', value: 0.05 }],
              text: 'You let go a finger at a time, and the sword stays.',
            },
            {
              id: 'sword-returning-arc',
              name: 'Returning Arc',
              hanzi: '回弧',
              effects: [{ stat: 'swordPower', value: 0.05 }],
              text: 'The blade goes out in a curve and comes home in the same one.',
            },
            {
              id: 'sword-flying-sword',
              name: 'Flying Sword',
              hanzi: '飞剑',
              effects: [{ stat: 'swordPower', value: 0.15 }],
              text: 'The sword leaves your hand and still answers it: sword qi at range is at full power.',
            },
          ],
        },
      ],
      sides: [
        {
          id: 'sword2-pressure',
          name: 'Sword Pressure',
          nodes: [
            {
              id: 'sword-bearing-down',
              name: 'Bearing Down',
              hanzi: '压人',
              effects: [{ stat: 'intimidate', value: 0.1 }],
              text: 'You stop being a man with a sword and become the sword.',
            },
            {
              id: 'sword-sword-pressure',
              name: 'Sword Pressure',
              hanzi: '剑压',
              effects: [{ stat: 'swordAura', value: 0.05 }],
              text: 'Your blade leans on the whole room: foes lose Accuracy against you.',
            },
          ],
        },
        {
          id: 'sword2-riding',
          name: 'Sword-Riding',
          nodes: [
            {
              id: 'sword-standing-blade',
              name: 'Standing Blade',
              hanzi: '立剑',
              effects: [{ stat: 'flight', value: 0.1 }],
              text: 'You learn to stand on the flat of your own blade.',
            },
            {
              id: 'sword-sword-riding',
              name: 'Sword-Riding',
              hanzi: '御剑',
              effects: [{ stat: 'flight', value: 0.25 }],
              text: 'You cross a valley on the sword before a horse is saddled.',
            },
          ],
        },
      ],
      capstone: {
        id: 'sword-sword-rain',
        name: 'Sword Rain',
        hanzi: '剑雨',
        effects: [
          { stat: 'swordPower', value: 0.1 },
          { stat: 'swordRain', value: 1 },
        ],
        text: 'Once a fight, a sword technique falls on every foe at once, like rain.',
      },
    },
  ],
});

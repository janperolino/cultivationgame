// The Spear Dao: reach, the first strike and the line (design § The combat Daos). Its side paths
// are the sweep and the banner, a spear's work among many. Drafted in P2.3 from the D2 skeleton;
// **awaiting Jan's review**.
import { defineDao } from '../dao.ts';

export const SPEAR_DAO = defineDao({
  id: 'spear',
  name: 'Spear',
  hanzi: '枪',
  what: 'Reach, the first strike and the line: who acts first, what the point gets through, and how a held line stands. An action counts the Spear Dao when it is tagged spear.',
  lean: 'right',
  tiers: [
    // Tier 1: Qi Condensation
    {
      starter: {
        id: 'spear-first-thrust',
        name: 'First Thrust',
        hanzi: '初枪',
        effects: [{ stat: 'spearPower', value: 0.03 }],
        text: 'You keep the shaft long and the point honest.',
      },
      gates: [
        {
          id: 'spear1-reach',
          name: 'Reach',
          nodes: [
            {
              id: 'spear-long-grip',
              name: 'Long Grip',
              hanzi: '长握',
              effects: [{ stat: 'initiative', value: 2 }],
              text: 'You hold the shaft near its end and keep the foe at the tip.',
            },
            {
              id: 'spear-lead-foot',
              name: 'Lead Foot',
              hanzi: '前足',
              effects: [{ stat: 'initiative', value: 2 }],
              text: 'The front foot is already forward when the fight starts.',
            },
            {
              id: 'spear-reach',
              name: 'Reach',
              hanzi: '长臂',
              effects: [{ stat: 'initiative', value: 4 }],
              text: 'You are there before the foe has decided to be: you act sooner.',
            },
          ],
        },
        {
          id: 'spear1-piercing',
          name: 'Piercing',
          nodes: [
            {
              id: 'spear-narrow-head',
              name: 'Narrow Head',
              hanzi: '窄锋',
              effects: [{ stat: 'spearPierce', value: 0.05 }],
              text: 'A narrow head finds the gap between plates.',
            },
            {
              id: 'spear-straight-line',
              name: 'Straight Line',
              hanzi: '直线',
              effects: [{ stat: 'spearPierce', value: 0.05 }],
              text: 'The thrust travels in one line, and nothing in it is wasted.',
            },
            {
              id: 'spear-piercing',
              name: 'Piercing',
              hanzi: '穿刺',
              effects: [
                { stat: 'spearPierce', value: 0.1 },
                { stat: 'spearPower', value: 0.04 },
              ],
              text: 'The point goes through what a blade would turn: armor and wards stop a little less.',
            },
          ],
        },
        {
          id: 'spear1-wall',
          name: 'Wall Drill',
          nodes: [
            {
              id: 'spear-planted-butt',
              name: 'Planted Butt',
              hanzi: '拄枪',
              effects: [{ stat: 'defendGuard', value: 0.05 }],
              text: 'You set the butt in the dirt and lean the foe onto the point.',
            },
            {
              id: 'spear-shaft-block',
              name: 'Shaft Block',
              hanzi: '杆挡',
              effects: [{ stat: 'defendGuard', value: 0.05 }],
              text: 'The shaft turns a blow aside as well as any shield.',
            },
            {
              id: 'spear-wall-drill',
              name: 'Wall Drill',
              hanzi: '枪阵',
              effects: [{ stat: 'defendGuard', value: 0.1 }],
              text: 'Hours of drill with a line of other spears: your defend gives more Evasion.',
            },
          ],
        },
      ],
      sides: [
        {
          id: 'spear1-sweep',
          name: 'Sweep',
          nodes: [
            {
              id: 'spear-wide-grip',
              name: 'Wide Grip',
              hanzi: '宽握',
              effects: [{ stat: 'spearPower', value: 0.03 }],
              text: 'Hands spread along the shaft, so the swing has leverage.',
            },
            {
              id: 'spear-turning-hips',
              name: 'Turning Hips',
              hanzi: '转胯',
              effects: [{ stat: 'spearPower', value: 0.03 }],
              text: 'The sweep starts in the hips and ends at the tip.',
            },
            {
              id: 'spear-sweep',
              name: 'Sweep',
              hanzi: '横扫',
              effects: [{ stat: 'sweep', value: 0.5 }],
              text: 'The shaft sweeps wide: a second foe takes half of what the first does.',
            },
          ],
        },
      ],
      capstone: {
        id: 'spear-first-blood',
        name: 'First Blood',
        hanzi: '先血',
        effects: [
          { stat: 'spearPower', value: 0.1 },
          { stat: 'firstBlood', value: 1 },
        ],
        text: 'You are at the foe before they are at you: you act first in the first turn.',
      },
    },

    // Tier 2: Foundation Establishment
    {
      starter: {
        id: 'spear-foundation-spear',
        name: 'Foundation Spear',
        hanzi: '筑基枪',
        effects: [{ stat: 'spearPower', value: 0.04 }],
        text: 'The spear’s line runs from your back foot, through the foundation, to the point.',
      },
      gates: [
        {
          id: 'spear2-long',
          name: 'Long Reach',
          nodes: [
            {
              id: 'spear-quick-hands',
              name: 'Quick Hands',
              hanzi: '快手',
              effects: [{ stat: 'initiative', value: 2 }],
              text: 'The shaft slides through your palms like a rope through a pulley.',
            },
            {
              id: 'spear-far-step',
              name: 'Far Step',
              hanzi: '远步',
              effects: [{ stat: 'initiative', value: 2 }],
              text: 'One long stride closes the gap before the foe has set their feet.',
            },
            {
              id: 'spear-ahead-of-the-eye',
              name: 'Ahead of the Eye',
              hanzi: '先目',
              effects: [{ stat: 'initiative', value: 2 }],
              text: 'You thrust where the foe’s eye is going, not where it is.',
            },
            {
              id: 'spear-long-reach',
              name: 'Long Reach',
              hanzi: '长击',
              effects: [{ stat: 'firstStrike', value: 0.25 }],
              text: 'The first blow of a fight lands from beyond their reach: your first attack deals a quarter more.',
            },
          ],
        },
        {
          id: 'spear2-armor',
          name: 'Armor-Piercing',
          nodes: [
            {
              id: 'spear-hardened-tip',
              name: 'Hardened Tip',
              hanzi: '淬锋',
              effects: [{ stat: 'spearPierce', value: 0.1 }],
              text: 'You quench the head until it will mark an iron plate.',
            },
            {
              id: 'spear-driving-thrust',
              name: 'Driving Thrust',
              hanzi: '推刺',
              effects: [{ stat: 'spearPower', value: 0.05 }],
              text: 'The back hand pushes the whole body behind the point.',
            },
            {
              id: 'spear-plate-seam',
              name: 'Plate Seam',
              hanzi: '甲缝',
              effects: [{ stat: 'spearPierce', value: 0.1 }],
              text: 'You learn where a breastplate is laced, and aim there.',
            },
            {
              id: 'spear-armor-piercing',
              name: 'Armor-Piercing',
              hanzi: '破甲',
              effects: [{ stat: 'spearPierce', value: 0.3 }],
              text: 'The point goes through mail like cloth: armor and wards stop a good part less of it.',
            },
          ],
        },
        {
          id: 'spear2-shield',
          name: 'Shield Wall',
          nodes: [
            {
              id: 'spear-closed-ranks',
              name: 'Closed Ranks',
              hanzi: '合阵',
              effects: [{ stat: 'defendGuard', value: 0.05 }],
              text: 'You stand shoulder to shoulder and the line has no gap in it.',
            },
            {
              id: 'spear-braced-shaft',
              name: 'Braced Shaft',
              hanzi: '撑杆',
              effects: [{ stat: 'defendGuard', value: 0.05 }],
              text: 'The shaft braced against the ground takes a charge without moving.',
            },
            {
              id: 'spear-held-line',
              name: 'Held Line',
              hanzi: '守线',
              effects: [{ stat: 'defendGuard', value: 0.05 }],
              text: 'You do not give a step, and the ones beside you learn not to.',
            },
            {
              id: 'spear-shield-wall',
              name: 'Shield Wall',
              hanzi: '盾墙',
              effects: [{ stat: 'shieldWall', value: 0.25 }],
              text: 'Your defend covers the ranks beside you: each ally gains a quarter more Evasion.',
            },
          ],
        },
      ],
      sides: [
        {
          id: 'spear2-whirl',
          name: 'Whirl',
          nodes: [
            {
              id: 'spear-spinning-shaft',
              name: 'Spinning Shaft',
              hanzi: '转杆',
              effects: [{ stat: 'spearPower', value: 0.05 }],
              text: 'You spin the shaft round your back and keep it moving.',
            },
            {
              id: 'spear-whirl',
              name: 'Whirl',
              hanzi: '回旋',
              effects: [{ stat: 'whirl', value: 1 }],
              text: 'You turn on the spot and the sweep reaches every other foe.',
            },
          ],
        },
        {
          id: 'spear2-banner',
          name: 'Banner',
          nodes: [
            {
              id: 'spear-raised-standard',
              name: 'Raised Standard',
              hanzi: '举旗',
              effects: [{ stat: 'spearHit', value: 0.05 }],
              text: 'You tie a strip of cloth below the head, and the others can find you.',
            },
            {
              id: 'spear-banner',
              name: 'Banner',
              hanzi: '战旗',
              effects: [{ stat: 'banner', value: 0.1 }],
              text: 'Your spear is a rallying point: allies fight with more Accuracy.',
            },
          ],
        },
      ],
      capstone: {
        id: 'spear-dragon-thrust',
        name: 'Dragon Thrust',
        hanzi: '龙刺',
        effects: [
          { stat: 'spearPower', value: 0.1 },
          { stat: 'dragonThrust', value: 1 },
        ],
        text: 'The thrust goes out like a dragon from the clouds: your first thrust each turn cannot miss.',
      },
    },
  ],
});

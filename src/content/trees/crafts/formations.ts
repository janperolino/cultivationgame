// The Formations Dao 阵道 (design § Professions, The craft Dao trees): array flags, discs and the eye of an array.
// Hand is the pacing and placing at the site, Line is the arrays left standing, Lore is the diagrams.
// Tiers 1 and 2 drafted in K2 by a cheap agent; **awaiting Jan's review**. Tiers 3 to 9 carry only their capstones.
import { defineCraft } from '../craft.ts';

export const FORMATIONS_DAO = defineCraft({
  id: 'formations',
  name: 'Formations',
  hanzi: '阵道',
  what: 'Arrays of flags and discs: how true they are set, how many one site holds, and which diagrams you know.',
  starter: {
    id: 'formations-concealing-seal',
    name: 'Concealing Flags',
    hanzi: '隐阵旗',
    recipe: 'concealing-flags',
    text: 'Five flags in the ground, and the clearing looks like empty scrub.',
  },
  tiers: [
    // Tier 1: Qi Condensation
    {
      hand: {
        nodes: [
          {
            id: 'formations-knotted-cord',
            name: 'Knotted Cord',
            hanzi: '结绳',
            effects: [{ stat: 'formationsLift', value: 0.1 }],
            text: 'You pace out the flag spots on a knotted cord, never by eye.',
          },
          {
            id: 'formations-centre-stance',
            name: 'Centre Stance',
            hanzi: '立中',
            effects: [{ stat: 'formationsReach', value: 0.25 }],
            text: 'Standing in the middle, you feel where the qi pools.',
          },
          {
            id: 'formations-lodestone-compass',
            name: 'Lodestone Compass',
            hanzi: '罗盘',
            effects: [{ stat: 'formationsLift', value: 0.2 }],
            text: 'A lodestone settles in its bowl, and the first flag goes in true.',
          },
        ],
        capstone: {
          id: 'formations-true-placement',
          name: 'True Placement',
          hanzi: '正位',
          effects: [{ stat: 'formationsReach', value: 0.5 }],
          text: 'Every flag goes in where the diagram says, and none of them is a finger off.',
        },
      },
      line: {
        nodes: [
          {
            id: 'formations-deep-posts',
            name: 'Deep Posts',
            hanzi: '深桩',
            effects: [{ stat: 'formationsHold', value: 0.05 }],
            text: 'Flag staves driven a forearm deep do not lean in the wind.',
          },
          {
            id: 'formations-spare-staves',
            name: 'Spare Staves',
            hanzi: '备杆',
            effects: [{ stat: 'formationsYield', value: 0.1 }],
            text: 'You cut spare staves from the same bamboo while the knife is out.',
          },
          {
            id: 'formations-cinnabar-border',
            name: 'Cinnabar Border',
            hanzi: '朱边',
            effects: [
              { stat: 'formationsSafety', value: 0.25 },
              { stat: 'formationsSpeed', value: -0.1 },
            ],
            text: "A cinnabar line round the cloth stops the array's qi bleeding out.",
          },
        ],
        capstone: {
          id: 'formations-one-more-array',
          name: 'One More Array',
          hanzi: '再阵',
          effects: [{ stat: 'arraysHeld', value: 1 }],
          text: 'A site that held one array now holds two, and neither disturbs the other.',
        },
      },
      lore: {
        nodes: [
          {
            id: 'formations-gathering-flags-seal',
            name: 'Qi-Gathering Flags',
            hanzi: '聚灵阵旗',
            recipe: 'gathering-flags',
            text: 'The commonest array there is, drawn on the first diagram every cultivator draws.',
          },
          {
            id: 'formations-warding-flags-seal',
            name: 'Warding Flags',
            hanzi: '护阵旗',
            recipe: 'warding-flags',
            text: 'You learn which flag is the eye, and which only look like one.',
          },
          {
            id: 'formations-alarm-flags-seal',
            name: 'Alarm Flags',
            hanzi: '警阵旗',
            recipe: 'alarm-flags',
            effects: [{ stat: 'formationsOdds', value: 0.02 }],
            text: 'A tripwire of qi, strung between three flags, that rings when crossed.',
          },
        ],
        capstone: {
          id: 'formations-array-sight',
          name: 'Array Sight',
          hanzi: '阵眼',
          effects: [{ stat: 'arraySight', value: 1 }],
          text: 'You find the eye of an array at a glance, where others see only flags.',
        },
      },
    },
    // Tier 2: Foundation Establishment
    {
      hand: {
        nodes: [
          {
            id: 'formations-snapped-lines',
            name: 'Snapped Lines',
            hanzi: '弹线',
            effects: [{ stat: 'formationsLift', value: 0.15 }],
            text: 'Snap an ink line between two flags, and the angle checks itself.',
          },
          {
            id: 'formations-corner-gaze',
            name: 'Corner Gaze',
            hanzi: '观角',
            effects: [{ stat: 'formationsReach', value: 0.4 }],
            text: 'You glance at each corner flag and know which one has slipped.',
          },
          {
            id: 'formations-seated-eye',
            name: 'Seated Eye',
            hanzi: '坐眼',
            effects: [{ stat: 'formationsLift', value: 0.3 }],
            text: 'You set the eye stone last, and the whole array settles onto it.',
          },
        ],
        capstone: {
          id: 'formations-perfect-cubit',
          name: 'Perfect Cubit',
          hanzi: '正尺',
          effects: [{ stat: 'formationsLift', value: 0.5 }],
          text: 'Your pacing stick is exactly one cubit, because you cut it that way.',
        },
      },
      line: {
        nodes: [
          {
            id: 'formations-lacquered-staves',
            name: 'Lacquered Staves',
            hanzi: '漆杆',
            effects: [{ stat: 'formationsHold', value: 0.08 }],
            text: 'Lacquer keeps the damp out of the bamboo, and the damp out of the array.',
          },
          {
            id: 'formations-bolt-cutting',
            name: 'Bolt Cutting',
            hanzi: '裁布',
            effects: [{ stat: 'formationsYield', value: 0.15 }],
            text: 'A whole bolt of cloth cut at once gives flags for three arrays.',
          },
          {
            id: 'formations-grounding-ring',
            name: 'Grounding Ring',
            hanzi: '接地',
            effects: [
              { stat: 'formationsSafety', value: 0.4 },
              { stat: 'formationsHold', value: 0.08 },
            ],
            text: 'An iron ring round the site drains a backlash into the earth.',
          },
        ],
        capstone: {
          id: 'formations-shared-eye',
          name: 'Shared Eye',
          hanzi: '共眼',
          effects: [{ stat: 'arraysHeld', value: 1 }],
          text: 'Two arrays share one eye stone, so a third fits where only two did.',
        },
      },
      lore: {
        nodes: [
          {
            id: 'formations-lost-path-flags-seal',
            name: 'Lost-Path Flags',
            hanzi: '迷踪阵旗',
            recipe: 'maze-flags',
            text: 'A walker inside it turns left forever, and the diagram shows why.',
          },
          {
            id: 'formations-array-diagrams',
            name: 'Array Diagrams',
            hanzi: '阵图',
            effects: [{ stat: 'formationsOdds', value: 0.03 }],
            text: 'A roll of ink diagrams, half of them marked in red with what went wrong.',
          },
          {
            id: 'formations-binding-disc-seal',
            name: 'Binding Array Disc',
            hanzi: '困阵盘',
            recipe: 'binding-disc',
            effects: [{ stat: 'formationsPity', value: 0.25 }],
            text: 'A disc of jade carved with nine rings, each of which must close on the last.',
          },
        ],
        capstone: {
          id: 'formations-hidden-seam',
          name: 'Hidden Seam',
          hanzi: '隐隙',
          effects: [
            { stat: 'arraySight', value: 1 },
            { stat: 'formationsOdds', value: 0.04 },
          ],
          text: "You see where another array's lines cross, and where they do not.",
        },
      },
    },
  ],
  later: [
    // Tier 3: Core Formation
    {
      hand: {
        name: 'Eye Stone Hand',
        hanzi: '眼石手',
        text: 'You set the eye stone by hand, and the array hums at once.',
      },
      line: {
        name: 'Hillside Array',
        hanzi: '山阵',
        text: 'A flag array spread over a whole hillside, with a flag on every ridge.',
      },
      lore: {
        name: 'Old Array Slips',
        hanzi: '古阵',
        text: 'A jade slip from a dead array master, its diagrams still sound.',
      },
    },
    // Tier 4: Nascent Soul
    {
      hand: {
        name: 'Soul-Planted Flags',
        hanzi: '神旗',
        text: 'Flags you plant with your soul, from a hundred paces away.',
      },
      line: {
        name: 'Self-Mending Array',
        hanzi: '自愈阵',
        text: 'An array that re-inks its own lines when rain washes them off.',
      },
      lore: {
        name: 'Array Birthing',
        hanzi: '创阵',
        text: 'You draw an array no one has drawn, and it closes on the first try.',
      },
    },
    // Tier 5: Soul Transformation
    {
      hand: {
        name: 'Heaven-Earth Pacing',
        hanzi: '天地步',
        text: "One stride and you have measured a mountain's lines.",
      },
      line: {
        name: 'City-Wide Array',
        hanzi: '城阵',
        text: 'An array that covers a whole city and every roof in it.',
      },
      lore: {
        name: 'Array Canon',
        hanzi: '阵经',
        text: 'You write the first chapter of a canon that other array masters copy.',
      },
    },
    // Tier 6: Void Refinement
    {
      hand: {
        name: 'Void Placement',
        hanzi: '虚位',
        text: 'Flags set in the gaps of space, where no foe can reach them.',
      },
      line: {
        name: 'Array Within Array',
        hanzi: '阵中阵',
        text: 'One array hidden in the eye of another, like a nut inside a nut.',
      },
      lore: {
        name: 'Star Array Charts',
        hanzi: '星阵图',
        text: 'Diagrams copied from the stars, the way they stand on the longest night.',
      },
    },
    // Tier 7: Body Integration
    {
      hand: {
        name: 'Body Array',
        hanzi: '身阵',
        text: 'Your own limbs are the five flags, and the array moves as you do.',
      },
      line: {
        name: 'Bone Array',
        hanzi: '骨阵',
        text: 'An array drawn in your own bones, kept wherever you go.',
      },
      lore: {
        name: 'Array Heart',
        hanzi: '阵心',
        text: 'You hold every diagram in the heart, and no slip is needed.',
      },
    },
    // Tier 8: Mahayana
    {
      hand: {
        name: 'Hundred-Flag Hand',
        hanzi: '百旗手',
        text: 'A hundred flags leave your sleeve and land exactly where you meant.',
      },
      line: {
        name: 'Mountain-Range Array',
        hanzi: '脉阵',
        text: 'An array across a whole range, its flags a day of walking apart.',
      },
      lore: {
        name: 'Complete Array Canon',
        hanzi: '全阵经',
        text: 'Every array in the world is a line in a book you have read to the last page.',
      },
    },
    // Tier 9: Tribulation Transcendence
    {
      hand: {
        name: 'Heaven-Fixing Flag',
        hanzi: '定天旗',
        text: 'One flag that pins a patch of sky in place.',
      },
      line: {
        name: 'Array of a Small World',
        hanzi: '小界阵',
        text: 'An array large enough to hold a small world inside its lines.',
      },
      lore: {
        name: 'Dao Array',
        hanzi: '道阵',
        text: 'Every array in the world is a corner of one array, and you have seen the whole of it.',
      },
    },
  ],
});

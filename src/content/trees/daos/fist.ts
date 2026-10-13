// The Fist Dao: the body, speed and closeness (design § The combat Daos). Its side paths are
// breath and a palm's wind, where the fist leaves the hand. Drafted in P2.3 from the D2 skeleton;
// **awaiting Jan's review**.
import { defineDao } from '../dao.ts';

export const FIST_DAO = defineDao({
  id: 'fist',
  name: 'Fist',
  hanzi: '拳',
  what: 'The body, speed and closeness: how hard the fist lands, how fast it comes again, and how well you stand under blows. An action counts the Fist Dao when it is tagged fist.',
  lean: 'left',
  tiers: [
    // Tier 1: Qi Condensation
    {
      starter: {
        id: 'fist-first-knuckle',
        name: 'First Knuckle',
        hanzi: '初拳',
        effects: [{ stat: 'fistPower', value: 0.03 }],
        text: 'You close the hand, set the thumb outside, and hit a post until it stops hurting.',
      },
      gates: [
        {
          id: 'fist1-iron',
          name: 'Iron Fist',
          nodes: [
            {
              id: 'fist-calloused-knuckles',
              name: 'Calloused Knuckles',
              hanzi: '茧拳',
              effects: [{ stat: 'fistPower', value: 0.04 }],
              text: 'Skin like a horn on the first two knuckles.',
            },
            {
              id: 'fist-wrapped-hands',
              name: 'Wrapped Hands',
              hanzi: '缠手',
              effects: [{ stat: 'fistPower', value: 0.04 }],
              text: 'You bind the wrist each morning so the force goes forward, not into the joint.',
            },
            {
              id: 'fist-iron-fist',
              name: 'Iron Fist',
              hanzi: '铁拳',
              effects: [{ stat: 'fistPower', value: 0.08 }],
              text: 'The whole hand turns to iron at the moment of contact.',
            },
          ],
        },
        {
          id: 'fist1-flurry',
          name: 'Flurry',
          nodes: [
            {
              id: 'fist-quick-jab',
              name: 'Quick Jab',
              hanzi: '快刺拳',
              effects: [{ stat: 'fistHit', value: 0.03 }],
              text: 'A short jab, back before the foe has seen it.',
            },
            {
              id: 'fist-light-hands',
              name: 'Light Hands',
              hanzi: '轻手',
              effects: [{ stat: 'fistHit', value: 0.03 }],
              text: 'You keep the hands loose so they can go wherever the foe is not looking.',
            },
            {
              id: 'fist-flurry',
              name: 'Flurry',
              hanzi: '连击',
              effects: [{ stat: 'flurry', value: 0.5 }],
              text: 'A fist strike as your minor action, at half a strike.',
            },
          ],
        },
        {
          id: 'fist1-stance',
          name: 'Rooted Stance',
          nodes: [
            {
              id: 'fist-horse-stance',
              name: 'Horse Stance',
              hanzi: '马步',
              effects: [{ stat: 'staggerResist', value: 0.1 }],
              text: 'You hold the low stance until your legs stop shaking, then a little longer.',
            },
            {
              id: 'fist-iron-belly',
              name: 'Iron Belly',
              hanzi: '铁腹',
              effects: [{ stat: 'hp', value: 0.04 }],
              text: 'A belly that takes a staff across it and only grunts.',
            },
            {
              id: 'fist-rooted-stance',
              name: 'Rooted Stance',
              hanzi: '生根',
              effects: [
                { stat: 'hp', value: 0.08 },
                { stat: 'staggerResist', value: 0.25 },
              ],
              text: 'Your feet grow into the floor: you take more, and are knocked off balance far less.',
            },
          ],
        },
      ],
      sides: [
        {
          id: 'fist1-breath',
          name: 'Breath of Blows',
          nodes: [
            {
              id: 'fist-breath-on-impact',
              name: 'Breath on Impact',
              hanzi: '击息',
              effects: [{ stat: 'qiOnHit', value: 0.01 }],
              text: 'You breathe out as the fist lands, and a little qi comes back in.',
            },
            {
              id: 'fist-counting-breaths',
              name: 'Counting Breaths',
              hanzi: '数息',
              effects: [{ stat: 'qiOnHit', value: 0.01 }],
              text: 'One breath to a blow, then two blows to a breath.',
            },
            {
              id: 'fist-breath-of-blows',
              name: 'Breath of Blows',
              hanzi: '拳息',
              effects: [{ stat: 'qiOnHit', value: 0.02 }],
              text: 'Every blow you land feeds you: a hit returns a little more of your pool.',
            },
          ],
        },
      ],
      capstone: {
        id: 'fist-hundred-fists',
        name: 'Hundred Fists',
        hanzi: '百拳',
        effects: [
          { stat: 'fistPower', value: 0.1 },
          { stat: 'hundredFists', value: 1 },
        ],
        text: 'Once a fight, a critical opens the foe wide: you take a second main action at once.',
      },
    },

    // Tier 2: Foundation Establishment
    {
      starter: {
        id: 'fist-foundation-fist',
        name: 'Foundation Fist',
        hanzi: '筑基拳',
        effects: [{ stat: 'fistPower', value: 0.04 }],
        text: 'The punch starts in the foundation now, from the floor up through the hips.',
      },
      gates: [
        {
          id: 'fist2-steel',
          name: 'Steel Fist',
          nodes: [
            {
              id: 'fist-bone-hardening',
              name: 'Bone Hardening',
              hanzi: '炼骨',
              effects: [{ stat: 'fistPower', value: 0.05 }],
              text: 'You strike a sack of sand until the bones of the hand ring.',
            },
            {
              id: 'fist-tendon-spring',
              name: 'Tendon Spring',
              hanzi: '筋弹',
              effects: [{ stat: 'fistPower', value: 0.05 }],
              text: 'The tendons store the twist and give it all back at once.',
            },
            {
              id: 'fist-stone-knuckle',
              name: 'Stone Knuckle',
              hanzi: '石拳',
              effects: [{ stat: 'fistPower', value: 0.05 }],
              text: 'You can crack a brick with the first two knuckles and not feel it.',
            },
            {
              id: 'fist-steel-fist',
              name: 'Steel Fist',
              hanzi: '钢拳',
              effects: [{ stat: 'fistPower', value: 0.15 }],
              text: 'Your fist is steel through and through, and it falls like a hammer.',
            },
          ],
        },
        {
          id: 'fist2-storm',
          name: 'Storm of Blows',
          nodes: [
            {
              id: 'fist-rain-of-knuckles',
              name: 'Rain of Knuckles',
              hanzi: '拳雨',
              effects: [{ stat: 'fistPower', value: 0.05 }],
              text: 'The blows come close together, like the first big drops.',
            },
            {
              id: 'fist-no-gap',
              name: 'No Gap',
              hanzi: '无隙',
              effects: [{ stat: 'fistPower', value: 0.05 }],
              text: 'There is no breath between one strike and the next for a foe to use.',
            },
            {
              id: 'fist-turning-wrists',
              name: 'Turning Wrists',
              hanzi: '转腕',
              effects: [{ stat: 'fistPower', value: 0.05 }],
              text: 'You turn the wrist at the last instant, and each blow lands harder than it looks.',
            },
            {
              id: 'fist-storm-of-blows',
              name: 'Storm of Blows',
              hanzi: '拳暴',
              effects: [{ stat: 'flurry', value: 0.5 }],
              text: 'The flurry strike lands at full power: a whole strike as your minor action.',
            },
          ],
        },
        {
          id: 'fist2-immovable',
          name: 'Immovable',
          nodes: [
            {
              id: 'fist-planted-heel',
              name: 'Planted Heel',
              hanzi: '定踵',
              effects: [{ stat: 'staggerResist', value: 0.1 }],
              text: 'The heel digs in at the instant of impact, and holds.',
            },
            {
              id: 'fist-low-center',
              name: 'Low Center',
              hanzi: '沉心',
              effects: [{ stat: 'staggerResist', value: 0.1 }],
              text: 'Your weight sits below the navel, where a push cannot find it.',
            },
            {
              id: 'fist-bent-knee',
              name: 'Bent Knee',
              hanzi: '屈膝',
              effects: [{ stat: 'staggerResist', value: 0.1 }],
              text: 'You bend where others stiffen, so the blow has nothing to break.',
            },
            {
              id: 'fist-immovable',
              name: 'Immovable',
              hanzi: '不动',
              effects: [{ stat: 'steady', value: 1 }],
              text: 'You stand like a boulder in a stream: stagger and unbalance cannot touch you.',
            },
          ],
        },
      ],
      sides: [
        {
          id: 'fist2-wind',
          name: 'Second Wind',
          nodes: [
            {
              id: 'fist-long-exhale',
              name: 'Long Exhale',
              hanzi: '长呼',
              effects: [{ stat: 'fightRegen', value: 0.01 }],
              text: 'You let the breath go slowly between exchanges and feel the ache ease.',
            },
            {
              id: 'fist-second-wind',
              name: 'Second Wind',
              hanzi: '二息',
              effects: [{ stat: 'fightRegen', value: 0.02 }],
              text: 'When the first wind is gone another comes: you mend a little each turn of a fight.',
            },
          ],
        },
        {
          id: 'fist2-palm',
          name: 'Palm Wind',
          nodes: [
            {
              id: 'fist-open-hand',
              name: 'Open Hand',
              hanzi: '开掌',
              effects: [{ stat: 'fistHit', value: 0.05 }],
              text: 'You open the hand at the end of the blow and let the force go on.',
            },
            {
              id: 'fist-palm-wind',
              name: 'Palm Wind',
              hanzi: '掌风',
              effects: [{ stat: 'fistHit', value: 0.1 }],
              text: 'A palm that pushes the air ahead of it, and strikes a foe out of arm’s reach.',
            },
          ],
        },
      ],
      capstone: {
        id: 'fist-body-as-one',
        name: 'Fist and Body as One',
        hanzi: '拳身合一',
        effects: [
          { stat: 'fistPower', value: 0.1 },
          { stat: 'bodyAsOne', value: 1 },
        ],
        text: 'There is no hand, only body: unarmed and fist strikes count your body a stage higher.',
      },
    },
  ],
});

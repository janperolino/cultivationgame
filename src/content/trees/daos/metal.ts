// The Metal Dao: edge, bleed and guard (design § The combat Daos). Its side paths reach into the
// forge: an eye for ore and a steady hand at the anvil. Drafted in P2.3 from the D2 skeleton;
// **awaiting Jan's review**.
import { defineDao } from '../dao.ts';

export const METAL_DAO = defineDao({
  id: 'metal',
  name: 'Metal',
  hanzi: '金',
  what: 'Edge, bleed and guard: how sharp your metal is, how deep it cuts, and how well you wear it. An action counts the Metal Dao when it is tagged metal or deals metal.',
  lean: 'right',
  tiers: [
    // Tier 1: Qi Condensation
    {
      starter: {
        id: 'metal-first-edge',
        name: 'First Edge',
        hanzi: '初锋',
        effects: [{ stat: 'metalPower', value: 0.03 }],
        text: 'Your qi takes a grain, like iron, and you can draw it out thin.',
      },
      gates: [
        {
          id: 'metal1-edge',
          name: 'Edge',
          nodes: [
            {
              id: 'metal-whetstone',
              name: 'Whetstone',
              hanzi: '磨石',
              effects: [{ stat: 'metalPower', value: 0.04 }],
              text: 'You sharpen your qi each night, and each night there is less of it and more edge.',
            },
            {
              id: 'metal-thin-steel',
              name: 'Thin Steel',
              hanzi: '薄钢',
              effects: [{ stat: 'metalPower', value: 0.04 }],
              text: 'Thinner is sharper, until thin means gone.',
            },
            {
              id: 'metal-edge',
              name: 'Edge',
              hanzi: '锋芒',
              effects: [
                { stat: 'metalPower', value: 0.08 },
                { stat: 'metalCrit', value: 0.02 },
              ],
              text: 'Your metal has an edge a hair can feel, and it finds the soft place more often.',
            },
          ],
        },
        {
          id: 'metal1-bleed',
          name: 'Bleed',
          nodes: [
            {
              id: 'metal-clean-cut',
              name: 'Clean Cut',
              hanzi: '净切',
              effects: [{ stat: 'bleedBite', value: 0.15 }],
              text: 'A cut so clean the foe does not feel it, and it does not close.',
            },
            {
              id: 'metal-bitter-iron',
              name: 'Bitter Iron',
              hanzi: '苦铁',
              effects: [{ stat: 'metalCrit', value: 0.01 }],
              text: 'The taste of iron at the back of the throat, and your blade goes for the vein.',
            },
            {
              id: 'metal-bleed',
              name: 'Bleed',
              hanzi: '放血',
              effects: [{ stat: 'stackBleed', value: 1 }],
              text: 'A new bleed of yours adds to the old instead of replacing it.',
            },
          ],
        },
        {
          id: 'metal1-guard',
          name: 'Iron Guard',
          nodes: [
            {
              id: 'metal-iron-shirt',
              name: 'Qi Mail',
              hanzi: '气铠',
              effects: [{ stat: 'physicalResist', value: 0.03 }],
              text: 'Qi laid over the skin like a shirt of mail, a link at a time.',
            },
            {
              id: 'metal-hard-forearm',
              name: 'Hard Forearm',
              hanzi: '硬臂',
              effects: [{ stat: 'physicalResist', value: 0.03 }],
              text: 'You catch a blade on the forearm, and the blade is the one that notches.',
            },
            {
              id: 'metal-iron-guard',
              name: 'Iron Guard',
              hanzi: '铁卫',
              effects: [{ stat: 'physicalResist', value: 0.08 }],
              text: 'Fists and blades glance off you, and you stop flinching.',
            },
          ],
        },
      ],
      sides: [
        {
          id: 'metal1-ore',
          name: 'Ore Sense',
          nodes: [
            {
              id: 'metal-ring-of-rock',
              name: 'Ring of Rock',
              hanzi: '石鸣',
              effects: [{ stat: 'forgeSense', value: 0.05 }],
              text: 'You tap a stone with a knuckle and hear what is inside it.',
            },
            {
              id: 'metal-heft',
              name: 'Heft',
              hanzi: '掂量',
              effects: [{ stat: 'forgeSense', value: 0.05 }],
              text: 'A lump of ore sits in your hand, and you know within a coin how much iron is in it.',
            },
            {
              id: 'metal-ore-sense',
              name: 'Ore Sense',
              hanzi: '识矿',
              effects: [{ stat: 'forgeSense', value: 0.1 }],
              text: 'Any smith would pay to walk a mountain with you.',
            },
          ],
        },
      ],
      capstone: {
        id: 'metal-tempered-edge',
        name: 'Tempered Edge',
        hanzi: '淬锋',
        effects: [
          { stat: 'metalPower', value: 0.1 },
          { stat: 'temperedEdge', value: 0.15 },
        ],
        text: 'Quenched in blood: your metal deals a seventh more to a bleeding foe.',
      },
    },

    // Tier 2: Foundation Establishment
    {
      starter: {
        id: 'metal-foundation-metal',
        name: 'Foundation Metal',
        hanzi: '筑基金',
        effects: [{ stat: 'metalPower', value: 0.04 }],
        text: 'The metal has an anvil now, set in the foundation itself.',
      },
      gates: [
        {
          id: 'metal2-killing',
          name: 'Killing Edge',
          nodes: [
            {
              id: 'metal-hairline',
              name: 'Hairline',
              hanzi: '发丝',
              effects: [{ stat: 'metalCrit', value: 0.02 }],
              text: 'You cut along a line a hair wide, and the foe never saw it.',
            },
            {
              id: 'metal-weak-seam',
              name: 'Weak Seam',
              hanzi: '弱缝',
              effects: [{ stat: 'metalCrit', value: 0.02 }],
              text: 'Every armor has a seam, and your eye goes straight to it.',
            },
            {
              id: 'metal-cold-eye',
              name: 'Cold Eye',
              hanzi: '冷眼',
              effects: [{ stat: 'metalCrit', value: 0.02 }],
              text: 'You look at a throat the way a smith looks at a billet.',
            },
            {
              id: 'metal-killing-edge',
              name: 'Killing Edge',
              hanzi: '杀锋',
              effects: [
                { stat: 'metalCrit', value: 0.04 },
                { stat: 'metalPower', value: 0.1 },
              ],
              text: 'Your metal has stopped being a tool. It goes for the kill, and finds it more often.',
            },
          ],
        },
        {
          id: 'metal2-severing',
          name: 'Severing',
          nodes: [
            {
              id: 'metal-deep-gash',
              name: 'Deep Gash',
              hanzi: '深创',
              effects: [{ stat: 'bleedBite', value: 0.1 }],
              text: 'The cut goes in past the muscle.',
            },
            {
              id: 'metal-drawing-cut',
              name: 'Drawing Cut',
              hanzi: '拖切',
              effects: [{ stat: 'metalPower', value: 0.05 }],
              text: 'You draw the blade as it goes in, and more of the edge does the work.',
            },
            {
              id: 'metal-slow-red',
              name: 'Slow Red',
              hanzi: '缓红',
              effects: [{ stat: 'bleedBite', value: 0.1 }],
              text: 'The bleed runs slow and long, and nothing is going to stop it.',
            },
            {
              id: 'metal-severing',
              name: 'Severing',
              hanzi: '断筋',
              effects: [{ stat: 'severing', value: 1 }],
              text: 'A metal hit of yours bleeds on any hit, not only on a critical.',
            },
          ],
        },
        {
          id: 'metal2-skin',
          name: 'Steel Skin',
          nodes: [
            {
              id: 'metal-plate-ribs',
              name: 'Plate Ribs',
              hanzi: '甲肋',
              effects: [{ stat: 'physicalResist', value: 0.05 }],
              text: 'Each rib is a plate and each breath a hinge.',
            },
            {
              id: 'metal-hammered-back',
              name: 'Hammered Back',
              hanzi: '锻背',
              effects: [{ stat: 'physicalResist', value: 0.05 }],
              text: 'You have been hit there enough that it has stopped being soft.',
            },
            {
              id: 'metal-steel-palms',
              name: 'Steel Palms',
              hanzi: '钢掌',
              effects: [{ stat: 'physicalResist', value: 0.05 }],
              text: 'You can take a blade by the flat and turn it aside.',
            },
            {
              id: 'metal-steel-skin',
              name: 'Steel Skin',
              hanzi: '钢肤',
              effects: [
                { stat: 'physicalResist', value: 0.1 },
                { stat: 'staggerResist', value: 0.25 },
              ],
              text: 'Blows ring off you like off a bell, and a shove no longer moves you.',
            },
          ],
        },
      ],
      sides: [
        {
          id: 'metal2-forge',
          name: 'Forge Sense',
          nodes: [
            {
              id: 'metal-anvil-ear',
              name: 'Anvil Ear',
              hanzi: '砧耳',
              effects: [{ stat: 'forgeSense', value: 0.05 }],
              text: 'You hear in the ring of the hammer when the iron is ready.',
            },
            {
              id: 'metal-forge-sense',
              name: 'Forge Sense',
              hanzi: '炉觉',
              effects: [
                { stat: 'forgeSense', value: 0.1 },
                { stat: 'craftPrecision', value: 0.08 },
              ],
              text: 'The hammer lands where your hand meant it to, every stroke of the night.',
            },
          ],
        },
        {
          id: 'metal2-ringing',
          name: 'Ringing Strike',
          nodes: [
            {
              id: 'metal-true-aim',
              name: 'True Aim',
              hanzi: '准心',
              effects: [{ stat: 'metalHit', value: 0.05 }],
              text: 'The blade goes where the eye goes.',
            },
            {
              id: 'metal-ringing-strike',
              name: 'Ringing Strike',
              hanzi: '鸣击',
              effects: [{ stat: 'metalHit', value: 0.1 }],
              text: 'A stroke that rings like a struck bell, and almost never misses.',
            },
          ],
        },
      ],
      capstone: {
        id: 'metal-unbreaking',
        name: 'Unbreaking',
        hanzi: '不折',
        effects: [
          { stat: 'metalPower', value: 0.1 },
          { stat: 'unbreaking', value: 1 },
        ],
        text: 'Armor will not hold against what bleeds: a bleeding foe’s armor counts a rarity step lower.',
      },
    },
  ],
});

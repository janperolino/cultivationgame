// The Saber Dao: force, momentum and the cleave (design § The combat Daos). Its side paths are the
// roar, which wins a fight before it starts, and the bone-cutter's bleeding. Drafted in P2.3 from
// the D2 skeleton; **awaiting Jan's review**.
import { defineDao } from '../dao.ts';

export const SABER_DAO = defineDao({
  id: 'saber',
  name: 'Saber',
  hanzi: '刀',
  what: 'Force, momentum and the cleave: how hard the blade falls, how each blow feeds the next, and how it finishes the wounded. An action counts the Saber Dao when it is tagged saber.',
  lean: 'left',
  tiers: [
    // Tier 1: Qi Condensation
    {
      starter: {
        id: 'saber-first-swing',
        name: 'First Swing',
        hanzi: '初刀',
        effects: [{ stat: 'saberPower', value: 0.03 }],
        text: 'A saber is thrown, not placed; you learn to throw it.',
      },
      gates: [
        {
          id: 'saber1-cleave',
          name: 'Heavy Cleave',
          nodes: [
            {
              id: 'saber-broad-blade',
              name: 'Broad Blade',
              hanzi: '阔刃',
              effects: [{ stat: 'saberPower', value: 0.04 }],
              text: 'You pick the wide blade, and a wide blade asks for a wide swing.',
            },
            {
              id: 'saber-thick-spine',
              name: 'Thick Spine',
              hanzi: '厚脊',
              effects: [{ stat: 'saberPower', value: 0.04 }],
              text: 'A spine as thick as a thumb carries the weight through the cut.',
            },
            {
              id: 'saber-heavy-cleave',
              name: 'Heavy Cleave',
              hanzi: '重劈',
              effects: [{ stat: 'saberPower', value: 0.1 }],
              text: 'You drop your whole weight into one cut and let the saber finish it.',
            },
          ],
        },
        {
          id: 'saber1-momentum',
          name: 'Momentum',
          nodes: [
            {
              id: 'saber-swinging-arc',
              name: 'Swinging Arc',
              hanzi: '摆弧',
              effects: [{ stat: 'saberPower', value: 0.04 }],
              text: 'The blade comes round on the last swing’s weight.',
            },
            {
              id: 'saber-following-step',
              name: 'Following Step',
              hanzi: '随步',
              effects: [{ stat: 'saberHit', value: 0.03 }],
              text: 'Your feet go where the blade has already gone.',
            },
            {
              id: 'saber-momentum',
              name: 'Momentum',
              hanzi: '势头',
              effects: [{ stat: 'momentum', value: 0.05 }],
              text: 'Each hit in a row adds five in a hundred to the next: a saber that has started does not want to stop.',
            },
          ],
        },
        {
          id: 'saber1-nerve',
          name: 'Butcher’s Nerve',
          nodes: [
            {
              id: 'saber-steady-stomach',
              name: 'Steady Stomach',
              hanzi: '稳胃',
              effects: [{ stat: 'saberCrit', value: 0.01 }],
              text: 'Blood on the blade no longer turns your head.',
            },
            {
              id: 'saber-slaughter-yard',
              name: 'Slaughter Yard',
              hanzi: '屠场',
              effects: [{ stat: 'saberCrit', value: 0.01 }],
              text: 'You learn where a thing is joined by taking it apart.',
            },
            {
              id: 'saber-butchers-nerve',
              name: 'Butcher’s Nerve',
              hanzi: '屠心',
              effects: [{ stat: 'woundedCrit', value: 0.05 }],
              text: 'You can smell a hurt foe, and you do not hesitate: more criticals against the wounded.',
            },
          ],
        },
      ],
      sides: [
        {
          id: 'saber1-roar',
          name: 'Roar',
          nodes: [
            {
              id: 'saber-deep-breath',
              name: 'Deep Breath',
              hanzi: '深息',
              effects: [{ stat: 'intimidate', value: 0.05 }],
              text: 'You fill the chest before the shout, and the foe sees it fill.',
            },
            {
              id: 'saber-chest-voice',
              name: 'Chest Voice',
              hanzi: '胸音',
              effects: [{ stat: 'intimidate', value: 0.05 }],
              text: 'A voice from below the ribs that rattles cups on a shelf.',
            },
            {
              id: 'saber-roar',
              name: 'Roar',
              hanzi: '怒吼',
              effects: [{ stat: 'intimidate', value: 0.15 }],
              text: 'You roar with the blade raised, and the faint-hearted drop theirs.',
            },
          ],
        },
      ],
      capstone: {
        id: 'saber-cleaving-tide',
        name: 'Cleaving Tide',
        hanzi: '裂潮',
        effects: [
          { stat: 'saberPower', value: 0.1 },
          { stat: 'cleavingTide', value: 1 },
        ],
        text: 'Your momentum is a tide and a miss is only a trough: it carries over to the next swing.',
      },
    },

    // Tier 2: Foundation Establishment
    {
      starter: {
        id: 'saber-foundation-saber',
        name: 'Foundation Saber',
        hanzi: '筑基刀',
        effects: [{ stat: 'saberPower', value: 0.04 }],
        text: 'The saber’s weight is in your foundation now, in the legs and the hips.',
      },
      gates: [
        {
          id: 'saber2-mountain',
          name: 'Mountain-Splitting',
          nodes: [
            {
              id: 'saber-rock-breaker',
              name: 'Rock Breaker',
              hanzi: '碎石',
              effects: [{ stat: 'saberPower', value: 0.05 }],
              text: 'You split stones in the yard until the blade stops chipping.',
            },
            {
              id: 'saber-wedge-edge',
              name: 'Wedge Edge',
              hanzi: '楔刃',
              effects: [{ stat: 'saberPierce', value: 0.1 }],
              text: 'The edge is ground thick behind the bevel, like a woodsman’s wedge.',
            },
            {
              id: 'saber-falling-weight',
              name: 'Falling Weight',
              hanzi: '坠势',
              effects: [{ stat: 'saberPower', value: 0.05 }],
              text: 'You let the cut fall instead of pushing it.',
            },
            {
              id: 'saber-mountain-splitting',
              name: 'Mountain-Splitting',
              hanzi: '裂山',
              effects: [
                { stat: 'saberPower', value: 0.1 },
                { stat: 'saberPierce', value: 0.2 },
              ],
              text: 'A cut that goes through a gate post: armor and wards stop a good part less of it.',
            },
          ],
        },
        {
          id: 'saber2-tide',
          name: 'Tide of Blades',
          nodes: [
            {
              id: 'saber-rolling-cut',
              name: 'Rolling Cut',
              hanzi: '滚斩',
              effects: [{ stat: 'saberPower', value: 0.05 }],
              text: 'One cut rolls into the next without a pause between.',
            },
            {
              id: 'saber-wave-on-wave',
              name: 'Wave on Wave',
              hanzi: '叠浪',
              effects: [{ stat: 'saberPower', value: 0.05 }],
              text: 'The second swing arrives before the first has finished falling.',
            },
            {
              id: 'saber-undertow-grip',
              name: 'Undertow Grip',
              hanzi: '暗流握',
              effects: [{ stat: 'saberPower', value: 0.05 }],
              text: 'Your grip turns on the follow-through, and the blade comes back faster.',
            },
            {
              id: 'saber-tide-of-blades',
              name: 'Tide of Blades',
              hanzi: '刀潮',
              effects: [{ stat: 'momentum', value: 0.05 }],
              text: 'Your momentum climbs faster: each hit in a row adds more than it did.',
            },
          ],
        },
        {
          id: 'saber2-executioner',
          name: 'Executioner',
          nodes: [
            {
              id: 'saber-block-and-axe',
              name: 'Block and Axe',
              hanzi: '砧斧',
              effects: [{ stat: 'woundedCrit', value: 0.02 }],
              text: 'You treat a wounded foe as a thing already on the block.',
            },
            {
              id: 'saber-clean-stroke',
              name: 'Clean Stroke',
              hanzi: '净斩',
              effects: [{ stat: 'woundedCrit', value: 0.02 }],
              text: 'One stroke, so the foe is not left to suffer.',
            },
            {
              id: 'saber-no-second-blow',
              name: 'No Second Blow',
              hanzi: '无二刀',
              effects: [{ stat: 'woundedCrit', value: 0.02 }],
              text: 'You have learned to finish a thing the first time.',
            },
            {
              id: 'saber-executioner',
              name: 'Executioner',
              hanzi: '刽子手',
              effects: [{ stat: 'executioner', value: 0.25 }],
              text: 'Your criticals against a foe under half their HP deal a quarter more.',
            },
          ],
        },
      ],
      sides: [
        {
          id: 'saber2-tiger',
          name: 'Tiger Roar',
          nodes: [
            {
              id: 'saber-hunters-growl',
              name: 'Hunter’s Growl',
              hanzi: '低吼',
              effects: [{ stat: 'intimidate', value: 0.1 }],
              text: 'A growl so low the hair stands on the arm before the ear knows why.',
            },
            {
              id: 'saber-tiger-roar',
              name: 'Tiger Roar',
              hanzi: '虎啸',
              effects: [{ stat: 'intimidate', value: 0.2 }],
              text: 'A roar that sends birds up from the next valley, and the timid out of the room.',
            },
          ],
        },
        {
          id: 'saber2-bone',
          name: 'Bone-Cutter',
          nodes: [
            {
              id: 'saber-notched-edge',
              name: 'Notched Edge',
              hanzi: '缺刃',
              effects: [{ stat: 'bleedBite', value: 0.1 }],
              text: 'A nick in the edge that tears more than it cuts.',
            },
            {
              id: 'saber-bone-cutter',
              name: 'Bone-Cutter',
              hanzi: '断骨',
              effects: [
                { stat: 'bleedBite', value: 0.2 },
                { stat: 'saberCrit', value: 0.02 },
              ],
              text: 'You cut between the joints: bleeds bite harder, and criticals come more often.',
            },
          ],
        },
      ],
      capstone: {
        id: 'saber-unstoppable-cleave',
        name: 'Unstoppable Cleave',
        hanzi: '势不可挡',
        effects: [
          { stat: 'saberPower', value: 0.1 },
          { stat: 'cleave', value: 0.5 },
        ],
        text: 'A critical goes through the foe and on: half its damage carries to a second foe.',
      },
    },
  ],
});

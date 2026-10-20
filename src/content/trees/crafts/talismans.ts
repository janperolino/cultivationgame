// The Talismans Dao 符道 (design § Professions, The craft Dao trees): the brush, cinnabar and yellow paper.
// Hand is the wrist and the stroke, Line is the sheets prepared and stacked, Lore is the charms.
// Tiers 1 and 2 drafted in K2 by a cheap agent; **awaiting Jan's review**. Tiers 3 to 9 carry only their capstones.
import { defineCraft } from '../craft.ts';

export const TALISMANS_DAO = defineCraft({
  id: 'talismans',
  name: 'Talismans',
  hanzi: '符道',
  what: 'Charms from the talisman desk: how true a stroke lands, how many sheets a sitting makes, and which charms you can draw.',
  starter: {
    id: 'talismans-ember-seal',
    name: 'Ember Talisman',
    hanzi: '火符',
    recipe: 'ember-talisman',
    text: 'A square of yellow paper and one stroke of cinnabar, and it burns.',
  },
  tiers: [
    // Tier 1: Qi Condensation
    {
      hand: {
        nodes: [
          {
            id: 'talismans-resting-heel',
            name: 'Resting Heel',
            hanzi: '枕腕',
            effects: [{ stat: 'talismansLift', value: 0.1 }],
            text: 'You rest the heel of your hand on the desk, so the brush never wobbles.',
          },
          {
            id: 'talismans-ink-weight',
            name: 'Ink Weight',
            hanzi: '墨重',
            effects: [{ stat: 'talismansReach', value: 0.25 }],
            text: "You read the cinnabar's thickness by how it hangs on the brush tip.",
          },
          {
            id: 'talismans-unbroken-stroke',
            name: 'Unbroken Stroke',
            hanzi: '连笔',
            effects: [{ stat: 'talismansLift', value: 0.2 }],
            text: "A talisman's lines go in without the brush leaving the paper once.",
          },
        ],
        capstone: {
          id: 'talismans-one-breath',
          name: 'One Breath',
          hanzi: '一息',
          effects: [{ stat: 'talismansReach', value: 0.5 }],
          text: 'You draw the whole talisman on a single held breath.',
        },
      },
      line: {
        nodes: [
          {
            id: 'talismans-dry-paper',
            name: 'Dry Paper',
            hanzi: '干纸',
            effects: [{ stat: 'talismansHold', value: 0.05 }],
            text: 'Paper dried by the stove takes ink without blooming.',
          },
          {
            id: 'talismans-ground-cinnabar',
            name: 'Ground Cinnabar',
            hanzi: '细砂',
            effects: [{ stat: 'talismansYield', value: 0.1 }],
            text: 'Cinnabar ground fine goes a third further along the sheet.',
          },
          {
            id: 'talismans-water-bowl',
            name: 'Water Bowl',
            hanzi: '水盏',
            effects: [
              { stat: 'talismansSafety', value: 0.25 },
              { stat: 'talismansHold', value: 0.05 },
            ],
            text: 'A bowl of water on the desk catches the spark when a sheet flares.',
          },
        ],
        capstone: {
          id: 'talismans-the-stack',
          name: 'The Stack',
          hanzi: '叠符',
          effects: [{ stat: 'talismansYield', value: 1 }],
          text: 'You cut and ink a stack at once, ten sheets for the price of one sitting.',
        },
      },
      lore: {
        nodes: [
          {
            id: 'talismans-hiding-seal',
            name: 'Hiding Talisman',
            hanzi: '藏身符',
            recipe: 'hiding-talisman',
            text: 'Four strokes and a dot, a charm every scout sews inside a sleeve.',
          },
          {
            id: 'talismans-iron-rain-seal',
            name: 'Iron Rain Talisman',
            hanzi: '铁雨符',
            recipe: 'iron-rain-talisman',
            text: 'You copy its stroke order thirty times before the paper stops tearing.',
          },
          {
            id: 'talismans-rockfall-seal',
            name: 'Rockfall Talisman',
            hanzi: '落石符',
            recipe: 'rockfall-talisman',
            effects: [{ stat: 'talismansOdds', value: 0.02 }],
            text: 'The heavy lines at its base teach you how a stroke can carry weight.',
          },
        ],
        capstone: {
          id: 'talismans-brush-lore',
          name: 'Brush Lore',
          hanzi: '笔意',
          effects: [{ stat: 'talismansPity', value: 1 }],
          text: 'A misdrawn talisman still shows which stroke went wrong, and you draw it better next time.',
        },
      },
    },
    // Tier 2: Foundation Establishment
    {
      hand: {
        nodes: [
          {
            id: 'talismans-hair-choice',
            name: 'Hair Choice',
            hanzi: '选毫',
            effects: [{ stat: 'talismansLift', value: 0.15 }],
            text: 'Wolf hair for hard strokes, weasel for fine ones, and you know which.',
          },
          {
            id: 'talismans-pressed-turn',
            name: 'Pressed Turn',
            hanzi: '顿笔',
            effects: [{ stat: 'talismansReach', value: 0.4 }],
            text: 'You press where two lines meet, and lift as the qi runs through.',
          },
          {
            id: 'talismans-sealed-corner',
            name: 'Sealed Corner',
            hanzi: '封角',
            effects: [
              { stat: 'talismansLift', value: 0.15 },
              { stat: 'talismansReach', value: 0.4 },
            ],
            text: 'The last stroke seals the corner, and the whole talisman hums.',
          },
        ],
        capstone: {
          id: 'talismans-hanging-wrist',
          name: 'Hanging Wrist',
          hanzi: '悬腕',
          effects: [{ stat: 'talismansLift', value: 0.5 }],
          text: 'The wrist hangs free of the desk, and the line still comes true.',
        },
      },
      line: {
        nodes: [
          {
            id: 'talismans-stove-dried-stock',
            name: 'Stove-Dried Stock',
            hanzi: '烘纸',
            effects: [{ stat: 'talismansHold', value: 0.08 }],
            text: 'A box of sheets kept above the stove never curls.',
          },
          {
            id: 'talismans-trimmed-margins',
            name: 'Trimmed Margins',
            hanzi: '裁边',
            effects: [{ stat: 'talismansYield', value: 0.15 }],
            text: 'Cut the margins close, and one sheet makes two small charms.',
          },
          {
            id: 'talismans-sand-tray',
            name: 'Sand Tray',
            hanzi: '沙盘',
            effects: [
              { stat: 'talismansSafety', value: 0.4 },
              { stat: 'talismansHold', value: 0.08 },
            ],
            text: 'A tray of damp sand under the desk eats stray sparks.',
          },
        ],
        capstone: {
          id: 'talismans-hundred-sheet-stack',
          name: 'Hundred-Sheet Stack',
          hanzi: '百符叠',
          effects: [{ stat: 'talismansYield', value: 0.5 }],
          text: 'A hundred sheets, one soaking, one pass of the brush.',
        },
      },
      lore: {
        nodes: [
          {
            id: 'talismans-draft-sheets',
            name: 'Draft Sheets',
            hanzi: '草稿',
            effects: [{ stat: 'talismansOdds', value: 0.03 }],
            text: 'A pile of cheap paper beside the good, for trying strokes you half remember.',
          },
          {
            id: 'talismans-shade-hiding-seal',
            name: 'Shade-Hiding Talisman',
            hanzi: '影藏符',
            recipe: 'shade-hiding-talisman',
            text: 'A charm that bends your shadow into the wall, and the strokes show how.',
          },
          {
            id: 'talismans-brush-notes',
            name: 'Brush Notes',
            hanzi: '笔记',
            effects: [{ stat: 'talismansPity', value: 0.5 }],
            text: 'Margins of your old sheets, covered in what you would change.',
          },
        ],
        capstone: {
          id: 'talismans-old-masters-hand',
          name: "Old Master's Hand",
          hanzi: '宗师笔',
          effects: [{ stat: 'talismansOdds', value: 0.08 }],
          text: 'You study the charm of a dead master until your brush copies his hesitations too.',
        },
      },
    },
  ],
  later: [
    // Tier 3: Core Formation
    {
      hand: {
        name: 'Blood-Ink Stroke',
        hanzi: '血墨笔',
        text: 'A drop of core blood in the cinnabar, and the line carries a stronger spell.',
      },
      line: {
        name: 'Charm Bundles',
        hanzi: '符束',
        text: 'Bundles of ten charms tied in red cord, each ready for a throw.',
      },
      lore: {
        name: 'Old Charm Slips',
        hanzi: '古符',
        text: 'A yellowed talisman from a dead master, whose strokes you trace.',
      },
    },
    // Tier 4: Nascent Soul
    {
      hand: {
        name: 'Soul-Written Line',
        hanzi: '神符',
        text: "The brush follows your soul's intent, not your hand's.",
      },
      line: {
        name: 'Self-Drawing Desk',
        hanzi: '自书案',
        text: 'A desk whose ink-stone grinds itself and whose brush stands up on its own.',
      },
      lore: {
        name: 'Charm Birthing',
        hanzi: '创符',
        text: 'You draw a talisman no one has drawn, and it flares true.',
      },
    },
    // Tier 5: Soul Transformation
    {
      hand: {
        name: 'Heaven-Thunder Brush',
        hanzi: '天雷笔',
        text: 'A brush of thunderbird feather that writes lightning.',
      },
      line: {
        name: 'Thousand-Charm Kiln',
        hanzi: '千符窑',
        text: 'A kiln that bakes a thousand charms from one block of paper.',
      },
      lore: {
        name: 'Talisman Canon',
        hanzi: '符经',
        text: 'You write the first chapter of a canon that other talisman masters copy.',
      },
    },
    // Tier 6: Void Refinement
    {
      hand: {
        name: 'Void Script',
        hanzi: '虚篆',
        text: 'A talisman written in ink that is not there, and it still works.',
      },
      line: {
        name: 'Void Paper',
        hanzi: '虚纸',
        text: 'Paper that never runs out: you tear off a sheet and the roll is full again.',
      },
      lore: {
        name: 'Star Script',
        hanzi: '星篆',
        text: 'Script copied from star charts, read by day from the bottom of a well.',
      },
    },
    // Tier 7: Body Integration
    {
      hand: {
        name: 'Body-Written Script',
        hanzi: '身篆',
        text: 'You write charms on your own skin, and they stay with you.',
      },
      line: {
        name: 'Living Paper',
        hanzi: '活纸',
        text: 'Paper that grows from your own qi, one sheet to each breath.',
      },
      lore: {
        name: 'Bone Script',
        hanzi: '骨篆',
        text: 'The strokes are written in your bones, and no slip is needed.',
      },
    },
    // Tier 8: Mahayana
    {
      hand: {
        name: 'Cloud-Writing Hand',
        hanzi: '云书',
        text: 'Talismans appear in the air from your fingertip, one stroke of cloud at a time.',
      },
      line: {
        name: 'Ten-Thousand-Sheet Rain',
        hanzi: '万符雨',
        text: 'A rain of ten thousand charms falls from your sleeve at a single word.',
      },
      lore: {
        name: 'Complete Charm Canon',
        hanzi: '全符经',
        text: 'Every talisman in the world is a page in a book you have read to the end.',
      },
    },
    // Tier 9: Tribulation Transcendence
    {
      hand: {
        name: 'Heaven-Writ Brush',
        hanzi: '天书笔',
        text: 'A brush that writes what the sky has written, and the sky obeys.',
      },
      line: {
        name: 'Talisman Sea',
        hanzi: '符海',
        text: 'A sea of charms, each sheet a wave, all yours.',
      },
      lore: {
        name: 'Dao Script',
        hanzi: '道篆',
        text: 'A script so old that it is the lines of the Dao itself.',
      },
    },
  ],
});

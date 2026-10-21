// The codex's entries for methods that eat resources and arts that burn goods (K11), one a row
// of docs/features.md; drafted, awaiting Jan's review.
import type { CodexEntry } from './schema.ts';

export const UPKEEP: readonly CodexEntry[] = [
  {
    id: 'upkeep-methods',
    title: 'Methods that eat resources',
    hanzi: '耗资功法',
    area: 'cultivation',
    text: [
      'Some methods drink every day they are cultivated: spirit stones, a pill, an herb bath 药浴, a vial of beast blood, a stick of incense. Fed, such a method climbs as if it were rarer, a band for light upkeep and two for heavy, and every stage it climbs keeps that rarer growth. A day it goes unfed, it stalls and gains nothing, and a stage climbed starved keeps only its written growth.',
      'Its slip is priced at its written rarity, so anyone can buy one; running it is what costs. An alchemist feeds a pill-fed method from their own furnace, and a herbalist an herb bath from their own beds. Its bonus at a breakthrough stays at its written rarity.',
    ],
    numbers: [
      ['Light upkeep', 'About half a day’s wage a day: 0.5 low at tier 1, 4.5 at tier 2'],
      ['Heavy upkeep', 'About two days’ wage a day: 2 low at tier 1, 18 at tier 2'],
      ['Fed, it climbs as', 'A band rarer on light, two on heavy'],
      ['Frugal upkeep', 'A day paid feeds 1 ÷ (1 − the cut) days'],
    ],
    where: { screen: 'routine', tab: 'day', label: 'Routine › Day, the methods column' },
    met: { test: 'upkeep' },
    way: 'codex',
    feature: 'Methods that eat resources: fed a band rarer for light upkeep, two for heavy',
  },
  {
    id: 'stone-swallowing',
    title: 'Stone swallowing',
    hanzi: '吞灵石',
    area: 'cultivation',
    text: [
      'A method that swallows stones opens the dantian wider: a day of qi seclusion burns twice the stones it could, and those past the old cap give half their worth. It is how a crafter’s fortune at last becomes qi. Nodes on the Qi tree’s Stone Eating and Stone Furnace widen the cap a little more.',
    ],
    numbers: [
      ['Stones a full qi day burns', '{stonesPerDay}, twice that swallowing'],
      ['Past the old cap', 'Half a stone’s worth'],
    ],
    where: { screen: 'cultivate', label: 'Cultivate, the day’s line' },
    met: { test: 'swallowing' },
    way: 'codex',
    feature: 'Stone swallowing 吞灵石: twice the stones a day, those past the cap at half worth',
  },
  {
    id: 'talisman-volley',
    title: 'The talisman volley',
    hanzi: '符雨',
    area: 'fighting',
    text: [
      'A talisman master’s art throws a stack at once: three, five or ten talismans of one stack in one action, each at full power and its own reach, for the art’s qi once. It is thrown only with the Talismans Dao held to the art’s tier. A volley sweeps peers and crowds; across a realm’s border protective qi still holds each sheet.',
    ],
    numbers: [
      ['Three-Talisman Volley', '3, tier 1'],
      ['Five-Pearl Talisman Chain', '5, tier 1'],
      ['Ten-Quarter Talisman Rain', '10, tier 2'],
    ],
    where: { screen: 'cultivate', label: 'The fight, Burn goods' },
    met: { test: 'volley' },
    way: 'codex',
    feature: 'The talisman volley: 3, 5 or 10 talismans thrown in one action',
  },
  {
    id: 'arts-that-burn-goods',
    title: 'Arts that burn goods',
    hanzi: '自爆法宝',
    area: 'fighting',
    text: [
      'A piece blown apart 自爆法宝: a weapon, armor or treasure from the Bag strikes its tier’s blast of foes at five times its strike and never misses, and it is gone. Flags set mid-fight: an array from the Bag with a fight in it stands for your side from the next turn to the end, its eye drawing a tenth of its charge from your stones; you take it up again if you hold the field.',
      'A burning pill 燃血丹 sets the blood alight: every line of your sheet a realm step up for three turns, a turn more a rarity up, then the sheet at half until the day ends. One a day, and only at its own tier. A young master of a great sect may carry one, and the stones for a heavy method.',
    ],
    numbers: [
      ['A piece blown apart', '×5 its strike, 5 foes at tier 1, 10 at tier 2'],
      ['Flags set mid-fight', '3 low for a tier 1 eye'],
      ['A burning pill', 'A realm step for 3 turns at white, then half for the day'],
    ],
    where: { screen: 'cultivate', label: 'The fight, Burn goods and Items' },
    met: { test: 'burn-goods' },
    way: 'codex',
    feature: 'Arts that burn goods: a piece blown apart, flags set mid-fight, the burning pill',
  },
];

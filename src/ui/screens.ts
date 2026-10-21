// The screens the side menu can reach. Later phases add entries here, gated by unlock flags.
// Cultivate is the seated figure and its breakthroughs (the Abode until P3.7's fix); Routine is the
// day wheel with its Practice and Study tabs (Cultivate until then). The Techniques screen lives in
// Routine › Practice since P2.5f, though its unlock and the seen
// record's screen id stay `techniques` (the Practice tab shows with it).
export type ScreenId =
  | 'cultivate'
  | 'routine'
  | 'crafts'
  | 'dwelling'
  | 'map'
  | 'trees'
  | 'bag'
  | 'character'
  | 'people'
  | 'chronicle'
  | 'settings';

export interface ScreenInfo {
  id: ScreenId;
  name: string;
  hanzi: string;
  /** The unlock flag that shows it; screens without one are always there. */
  unlock?: string;
}

export const screens: readonly ScreenInfo[] = [
  { id: 'cultivate', name: 'Cultivate', hanzi: '修炼', unlock: 'cultivate' },
  { id: 'routine', name: 'Routine', hanzi: '日课', unlock: 'routine' },
  { id: 'crafts', name: 'Crafts', hanzi: '艺', unlock: 'crafts' },
  { id: 'dwelling', name: 'Dwelling', hanzi: '居', unlock: 'dwelling' },
  { id: 'map', name: 'Map', hanzi: '舆图', unlock: 'map' },
  { id: 'trees', name: 'Trees', hanzi: '道树', unlock: 'trees' },
  { id: 'bag', name: 'Bag', hanzi: '行囊', unlock: 'bag' },
  { id: 'character', name: 'Character', hanzi: '根骨', unlock: 'character' },
  { id: 'people', name: 'People', hanzi: '人物', unlock: 'people' },
  { id: 'chronicle', name: 'Chronicle', hanzi: '生平', unlock: 'chronicle' },
  { id: 'settings', name: 'Settings', hanzi: '设置' },
];

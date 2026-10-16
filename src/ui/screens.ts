// The screens the side menu can reach. Later phases add entries here, gated by unlock flags. The
// Techniques screen lives in Cultivate › Practice since P2.5f, though its unlock and the seen
// record's screen id stay `techniques` (the Practice tab shows with it).
export type ScreenId =
  | 'abode'
  | 'cultivate'
  | 'map'
  | 'trees'
  | 'bag'
  | 'combat'
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
  { id: 'abode', name: 'Abode', hanzi: '洞府', unlock: 'abode' },
  { id: 'cultivate', name: 'Cultivate', hanzi: '修炼', unlock: 'cultivate' },
  { id: 'map', name: 'Map', hanzi: '舆图', unlock: 'map' },
  { id: 'trees', name: 'Trees', hanzi: '道树', unlock: 'trees' },
  { id: 'bag', name: 'Bag', hanzi: '行囊', unlock: 'bag' },
  { id: 'combat', name: 'Combat', hanzi: '斗法', unlock: 'combat' },
  { id: 'character', name: 'Character', hanzi: '根骨', unlock: 'character' },
  { id: 'people', name: 'People', hanzi: '人物', unlock: 'people' },
  { id: 'chronicle', name: 'Chronicle', hanzi: '生平', unlock: 'chronicle' },
  { id: 'settings', name: 'Settings', hanzi: '设置' },
];

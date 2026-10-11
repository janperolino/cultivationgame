// The screens the side menu can reach. Later phases add entries here, gated by unlock flags.
export type ScreenId = 'abode' | 'cultivate' | 'settings';

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
  { id: 'settings', name: 'Settings', hanzi: '设置' },
];

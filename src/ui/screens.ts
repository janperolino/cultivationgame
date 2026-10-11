// The screens the side menu can reach. Later phases add entries here, gated by unlock flags.
export type ScreenId = 'abode';

export interface ScreenInfo {
  id: ScreenId;
  name: string;
  hanzi: string;
}

export const screens: readonly ScreenInfo[] = [{ id: 'abode', name: 'Abode', hanzi: '洞府' }];

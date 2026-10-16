// The seals an encounter wears on the map and its card (P3.7): one by kind, a goal's 赏.
import type { Template } from '../content/encounters/schema.ts';

export const KIND_SEAL: Record<string, string> = {
  beast: '兽',
  cultivator: '修',
  mortal: '人',
  place: '地',
  omen: '兆',
  plot: '缘',
};

export function sealOf(t: Template): string {
  return t.goal ? '赏' : (KIND_SEAL[t.kind] ?? '事');
}

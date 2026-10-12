import { describe, expect, it } from 'vitest';
import {
  colorWarning,
  contrast,
  DEFAULT_ACCENT,
  DEFAULT_CRACK,
  DEFAULT_RARITY,
  parseHex,
  PRESETS,
  VOID,
} from './colors.ts';

describe('colors', () => {
  it('reads hex colors', () => {
    expect(parseHex('#fff')).toEqual([255, 255, 255]);
    expect(parseHex('#7fc7d9')).toEqual([127, 199, 217]);
    expect(parseHex('teal')).toBeNull();
  });

  it('measures contrast the WCAG way', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#777777')).toBe(1);
  });

  it('the defaults and every preset pass their own checks', () => {
    expect(colorWarning('accent', DEFAULT_ACCENT)).toBeNull();
    expect(colorWarning('crack', DEFAULT_CRACK)).toBeNull();
    for (const p of PRESETS) {
      expect(colorWarning('accent', p.accent), p.name).toBeNull();
      expect(colorWarning('crack', p.crack), p.name).toBeNull();
    }
    for (const [id, hex] of Object.entries(DEFAULT_RARITY)) {
      expect(contrast(hex, VOID), id).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('warns on dark colors and on an accent that blurs its meaning', () => {
    expect(colorWarning('accent', '#202020')).toMatch(/hard to read/i);
    expect(colorWarning('crack', '#101820')).toMatch(/too dark/i);
    expect(colorWarning('accent', DEFAULT_RARITY.green)).toMatch(/green rarity/);
    expect(colorWarning('accent', '#e08a6a')).toMatch(/warning/);
    expect(colorWarning('gold', '#333333')).toMatch(/hard to read/i);
    expect(colorWarning('gold', DEFAULT_ACCENT)).toMatch(/accent/);
  });
});

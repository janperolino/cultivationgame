import { describe, expect, it } from 'vitest';
import { cleanSettings, DEFAULT_SETTINGS } from './settings.ts';

describe('settings', () => {
  it('keeps good values and drops bad ones back to the defaults', () => {
    const s = cleanSettings({
      activeSlot: 2,
      textScale: 9,
      motion: 'sideways',
      accent: '#123456',
      crack: 'not a color',
      rarity: { gold: '#ffaa00', mauve: '#ffffff', red: 4 },
      web: 2.6,
      weather: -1,
    });
    expect(s.activeSlot).toBe(2);
    expect(s.textScale).toBe(1.5);
    expect(s.motion).toBe('system');
    expect(s.accent).toBe('#123456');
    expect(s.crack).toBe(DEFAULT_SETTINGS.crack);
    expect(s.rarity).toEqual({ gold: '#ffaa00' });
    expect(s.web).toBe(3);
    expect(s.weather).toBe(0);
    expect(s.rim).toBe(1);
  });

  it('an empty store is the defaults', () => {
    expect(cleanSettings({})).toEqual(DEFAULT_SETTINGS);
  });
});

// P2.5f: Cultivate's tabs show once they hold something.
import { describe, expect, it } from 'vitest';
import { gainCopy, gainTechnique } from '../core/life.ts';
import { newLife } from '../core/state.ts';
import { cultivateTabs, TAB_OF } from './cultivateTabs.ts';

const base = newLife({ name: 'Han Li', seed: 'tabs' });

describe('Cultivate tabs', () => {
  it('show neither Practice nor Study to a life with no technique and no copy', () => {
    expect(cultivateTabs(base)).toEqual(['cultivation']);
  });

  it('show Practice with the first technique and Study with the first copy', () => {
    expect(cultivateTabs(gainTechnique(base, 'rampart-palm'))).toEqual(['cultivation', 'practice']);
    expect(cultivateTabs(gainCopy(base, 'manual:tide-counting'))).toEqual(['cultivation', 'study']);
  });

  it('send each kind of hour to its tab', () => {
    expect(TAB_OF.practice).toBe('practice');
    expect(TAB_OF.study).toBe('study');
    expect(TAB_OF.qi).toBe('cultivation');
    expect(TAB_OF.sleep).toBe('cultivation');
  });
});

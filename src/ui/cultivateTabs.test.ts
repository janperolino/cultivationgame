// Cultivate's tabs: Cultivation and Study from the start, Practice with a first technique.
import { describe, expect, it } from 'vitest';
import { gainTechnique } from '../core/life.ts';
import { newLife } from '../core/state.ts';
import { cultivateTabs, TAB_OF } from './cultivateTabs.ts';

const base = newLife({ name: 'Han Li', seed: 'tabs' });

describe('Cultivate tabs', () => {
  it('show Cultivation and Study from the start, since both kinds of hour are open', () => {
    expect(cultivateTabs(base)).toEqual(['cultivation', 'study']);
  });

  it('show Practice with the first technique', () => {
    expect(cultivateTabs(gainTechnique(base, 'rampart-palm'))).toEqual([
      'cultivation',
      'practice',
      'study',
    ]);
  });

  it('send each kind of hour to its tab', () => {
    expect(TAB_OF.practice).toBe('practice');
    expect(TAB_OF.study).toBe('study');
    expect(TAB_OF.qi).toBe('cultivation');
    expect(TAB_OF.sleep).toBe('cultivation');
  });
});

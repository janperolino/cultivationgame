// Routine's tabs: Day and Study from the start, Practice with a first technique.
import { describe, expect, it } from 'vitest';
import { gainTechnique } from '../core/life.ts';
import { newLife } from '../core/state.ts';
import { routineTabs, TAB_OF } from './routineTabs.ts';

const base = newLife({ name: 'Han Li', seed: 'tabs' });

describe('Routine tabs', () => {
  it('show Day and Study from the start, since both kinds of hour are open', () => {
    expect(routineTabs(base)).toEqual(['day', 'study']);
  });

  it('show Practice with the first technique', () => {
    expect(routineTabs(gainTechnique(base, 'rampart-palm'))).toEqual([
      'day',
      'practice',
      'study',
    ]);
  });

  it('send each kind of hour to its tab', () => {
    expect(TAB_OF.practice).toBe('practice');
    expect(TAB_OF.study).toBe('study');
    expect(TAB_OF.qi).toBe('day');
    expect(TAB_OF.sleep).toBe('day');
  });
});

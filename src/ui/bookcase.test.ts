// P2.5c: a spine's size, the hover card's words and the bookcase's search.
import { describe, expect, it } from 'vitest';
import { manual } from '../content/manuals.ts';
import { registerManuals } from '../content/nodes.ts';
import { gainManual, gainTechnique } from '../core/life.ts';
import { madeUpManuals } from '../core/madeUpManuals.ts';
import { newLife } from '../core/state.ts';
import {
  cardMeta,
  matchesManual,
  nodeMark,
  nodeWords,
  openWords,
  spineHeight,
  spineLabel,
  spineWidth,
} from './bookcase.ts';

const made = madeUpManuals(150);
registerManuals(made.manuals);
const life = newLife({ name: 'Han Li', seed: 'spines' });

describe('spines', () => {
  it('stand 23 to 34 px wide and grow with their nodes up to four', () => {
    for (const m of made.manuals) {
      expect(spineWidth(m)).toBeGreaterThanOrEqual(23);
      expect(spineWidth(m)).toBeLessThanOrEqual(34);
      expect(spineHeight(m)).toBeLessThanOrEqual(146);
    }
    const formula = manual('garrison-breath-count');
    expect(spineWidth(formula)).toBe(23);
    const scripture = made.manuals.find((m) => m.kind === 'scripture')!;
    expect(spineWidth(scripture)).toBe(34);
    const one = made.manuals.find((m) => m.kind === 'formula' && m.nodes.length === 1)!;
    const two = made.manuals.find((m) => m.kind === 'formula' && m.nodes.length === 2)!;
    expect(spineHeight(two) - spineHeight(one)).toBe(4);
  });

  it('name the manual for a screen reader', () => {
    const c = gainManual(life, 'garrison-breath-count').player;
    expect(spineLabel(c, manual('garrison-breath-count'))).toBe(
      'Garrison Breath-Count, white formula, 0 of 1 learned',
    );
  });
});

describe('the hover card', () => {
  it('says what the manual is and where it stands', () => {
    const c = gainManual(life, 'garrison-breath-count').player;
    const m = manual('garrison-breath-count');
    expect(cardMeta(c, m)).toBe('White formula · beside Qi, tier 1 · 0 of 1 learned');
    expect(openWords(m, true)).toBe('Click to open it on the Qi tree');
    expect(openWords(m, false)).toBe('Click to open its own tree above');
    const scripture = made.manuals.find((x) => x.host === null)!;
    expect(cardMeta(c, scripture)).toContain('above the trees');
  });

  it('marks a node ready only when it can be bought and works', () => {
    const m = manual('garrison-breath-count');
    const n = m.nodes[0]!;
    const poor = gainManual(life, m.id).player;
    const rich = { ...poor, insight: { current: 1000, earned: 1000 } };
    expect(nodeMark(poor, n)).toBe('waiting');
    expect(nodeWords(poor, m, n)).toBe(`${n.cost} insight`);
    expect(nodeMark(rich, n)).toBe('ready');
    expect(nodeWords(rich, m, n)).toBe('ready to learn');
    const learned = { ...rich, nodes: [...rich.nodes, n.id] };
    expect(nodeWords(learned, m, n)).toBe('learned');
  });

  it("says an Art's node wakes at its technique's mastery, learned or not", () => {
    const c = gainTechnique(life, 'rampart-palm').player;
    const rich = { ...c, insight: { current: 1000, earned: 1000 } };
    const m = manual('art-rampart-palm');
    const n = m.nodes[0]!;
    expect(nodeMark(rich, n)).toBe('sealed');
    expect(nodeWords(rich, m, n)).toBe('wakes at Comprehension');
    expect(nodeWords({ ...rich, nodes: [n.id] }, m, n)).toBe('learned, wakes at Comprehension');
  });

  it("says a loose manual's node above your realm is sealed", () => {
    const big = made.manuals.find((m) => m.nodes.some((n) => n.tier === 2))!;
    const n = big.nodes.find((x) => x.tier === 2)!;
    const c = { ...life.player, manuals: [big.id], insight: { current: 1e5, earned: 1e5 } };
    expect(nodeWords(c, big, n)).toBe('sealed above your realm');
  });
});

describe('the search', () => {
  it('finds a manual by name, hanzi, node or stat', () => {
    const m = manual('stone-eyes-lamp');
    expect(matchesManual(m, '')).toBe(true);
    expect(matchesManual(m, 'stone eyes')).toBe(true);
    expect(matchesManual(m, '石眼')).toBe(true);
    expect(matchesManual(m, 'many readers')).toBe(true);
    expect(matchesManual(m, 'insight')).toBe(true);
    expect(matchesManual(m, 'tempering')).toBe(false);
  });
});

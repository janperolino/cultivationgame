// The opening, built: the guides (core/guides.ts), the screen building itself, the first minor
// breakthrough held for its veil, once a lineage; the codex (core/codex.ts), an entry for every
// row of the feature list, shown once met; and save v48.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CODEX, MET_TESTS, CODEX_SLOTS } from '../content/codex/index.ts';
import { FIRST_IDS } from '../content/firsts.ts';
import { GUIDE_IDS, GUIDES } from '../content/guides.ts';
import { codexMet, meetCodex, noteCodex, seeCodex } from './codex.ts';
import { createLife, createNextLife, type Creation } from './creation.ts';
import {
  built,
  finishAllGuides,
  finishGuide,
  guideNow,
  noteGuides,
  type GuideContext,
} from './guides.ts';
import { firstBreath, switchMethod } from './life.ts';
import { loadSave, makeSave, SAVE_VERSION } from './save/format.ts';
import { newLife, withPlayer, type GameState } from './state.ts';

const creation: Creation = {
  name: 'Han Li',
  pronouns: 'they/them',
  look: '',
  mode: 'ironman',
  seed: 'guides',
  choice: 'along',
  roll: {
    root: 'true',
    elements: ['wood', 'fire'],
    body: 'farmhands-frame',
    soul: 'plain-mind',
    fate: 'ordinary-fate',
    origin: 'cave-orphan',
  },
};

const at: GuideContext = { screen: 'cultivate' };
const now = (s: GameState, ctx: GuideContext = at) => guideNow(s, ctx)?.id ?? null;
/** What the state's change notes, as the store runs it after each change. */
const settle = (s: GameState) => noteCodex(noteGuides(s));

describe('the first seclusion builds the screen', () => {
  it('opens on the figure and the qi bar, with the method to take up', () => {
    const s = createLife(creation);
    expect(s.lineage.guides).toEqual([]);
    expect(now(s)).toBe('take-up');
    expect(built(s, 'take-up')).toBe(true);
    for (const p of ['orbs', 'focus', 'band', 'tray', 'rail', 'rail-rest'] as const) {
      expect(built(s, p), p).toBe(false);
    }
    // Elsewhere, nothing fires: a guide fires where its feature lives.
    expect(now(s, { screen: 'world' })).toBeNull();
  });

  it('walks take-up, the bar, the first orb and focus, each piece coming in turn', () => {
    let s = settle(switchMethod(createLife(creation), 'qi', 'garrison-standard').state);
    expect(s.lineage.guides).toEqual(['take-up']);
    expect(now(s)).toBe('qi-bar');
    s = finishGuide(s, 'qi-bar');
    expect(built(s, 'orbs')).toBe(true);
    // The orb's veil waits for an orb on screen.
    expect(now(s)).toBeNull();
    expect(now(s, { screen: 'cultivate', orb: true })).toBe('first-orb');
    expect(GUIDES['first-orb'].form).toBe('veil');
    s = settle(firstBreath(s));
    expect(s.lineage.guides).toContain('first-orb');
    expect(built(s, 'focus')).toBe(true);
    expect(now(s)).toBe('focus');
    s = finishGuide(s, 'focus');
    expect(built(s, 'rail')).toBe(true);
    expect(built(s, 'rail-rest')).toBe(false);
  });

  it('holds the first minor breakthrough for its veil, then hands it back to auto', () => {
    let s = createLife(creation);
    expect(s.player.plan.auto).toBe('off');
    s = finishAllGuides(s);
    expect(s.player.plan.auto).toBe('safe');
    expect(built(s, 'rail-rest')).toBe(true);
  });

  it("skips with I know this, or every guide with I've played before", () => {
    const s = createLife(creation);
    expect(finishGuide(s, 'take-up').lineage.guides).toEqual(['take-up']);
    expect(finishGuide(finishGuide(s, 'take-up'), 'take-up').lineage.guides).toEqual(['take-up']);
    expect(finishAllGuides(s).lineage.guides).toEqual([...GUIDE_IDS]);
    expect(now(finishAllGuides(s))).toBeNull();
  });

  it('runs once a lineage: the next life is walked through nothing done', () => {
    const done = { ...finishAllGuides(createLife(creation)), ended: { day: 0, cause: 'test' } };
    const next = createNextLife(done, { ...creation, seed: 'guides-2' });
    expect(next.lineage.guides).toEqual([...GUIDE_IDS]);
    expect(next.player.plan.auto).toBe('safe');
    expect(now(next)).toBeNull();
  });

  it('comes whole with guides off, and gives NPCs and tests every guide done', () => {
    const s = createLife(creation);
    const off = { ...s, hints: { ...s.hints, on: false } };
    expect(now(off)).toBeNull();
    expect(built(off, 'rail-rest')).toBe(true);
    expect(newLife({ name: 'Elder Mo' }).lineage.guides).toEqual([...GUIDE_IDS]);
  });

  it('fires the fight turn over everything, and the rest where they live', () => {
    const s = finishAllGuides(createLife(creation));
    const fresh = { ...s, lineage: { ...s.lineage, guides: [] } };
    const fighting = {
      ...fresh,
      fight: { from: { kind: 'spar' as const, who: 'x' }, start: 0, now: 0, actions: [] },
    };
    expect(now(fighting, { screen: 'fight' })).toBe('fight-turn');
    const later = {
      ...fresh,
      lineage: {
        ...fresh.lineage,
        guides: GUIDE_IDS.filter((g) => !['first-course', 'place-doors', 'first-buy'].includes(g)),
      },
    };
    expect(now(later, { screen: 'world' })).toBe('first-course');
    expect(now(later, { screen: 'world', inside: true })).toBe('place-doors');
    expect(now(later, { screen: 'world', inside: true, shop: true })).toBe('first-buy');
  });
});

/** The first column of every row of the feature list's tables, as written. */
function featureRows(): string[] {
  const md = readFileSync(new URL('../../docs/features.md', import.meta.url), 'utf8');
  return md
    .split('\n')
    .filter((l) => l.startsWith('| ') && !l.startsWith('| Feature') && !l.startsWith('|---'))
    .map((l) => l.split('|')[1]!.trim());
}

describe('the codex', () => {
  it('holds an entry for every row of the feature list, and only those', () => {
    const rows = featureRows();
    expect(rows.length).toBeGreaterThan(100);
    // Word for word, but for the curly apostrophe prettier's drafts carry.
    const features = CODEX.map((e) => e.feature.replace(/’/g, "'"));
    for (const r of rows) expect(features, r).toContain(r);
    expect(CODEX.length).toBe(rows.length);
    expect(new Set(CODEX.map((e) => e.id)).size).toBe(CODEX.length);
  });

  it('names only met rules, guides, firsts and slots that exist', () => {
    for (const e of CODEX) {
      const m = e.met;
      if ('test' in m) expect(MET_TESTS, e.id).toContain(m.test);
      if ('guide' in m) expect(GUIDE_IDS, e.id).toContain(m.guide);
      if ('first' in m) expect(FIRST_IDS, e.id).toContain(m.first);
      if (typeof e.way === 'object') expect(GUIDE_IDS, e.id).toContain(e.way.guide);
      const words = [...e.text, ...(e.numbers ?? []).flat()].join(' ');
      for (const [, slot] of words.matchAll(/\{(\w+)\}/g)) {
        expect(CODEX_SLOTS, `${e.id}: {${slot}}`).toHaveProperty(slot!);
      }
    }
    // Every guide ends on an entry it adds.
    for (const id of GUIDE_IDS) expect(CODEX.map((e) => e.id)).toContain(GUIDES[id].codex);
  });

  it('shows an entry once its feature is met, new until opened, kept by the lineage', () => {
    let s = createLife(creation);
    s = noteCodex(s);
    const first = codexMet(s).map((e) => e.id);
    expect(first).toContain('creation');
    expect(first).not.toContain('orbs');
    // The journal waits for the first seclusion's screen to be built.
    expect(s.unlocks).not.toContain('journal');
    expect(noteCodex(finishAllGuides(s)).unlocks).toContain('journal');
    s = noteCodex(finishGuide(s, 'first-orb'));
    expect(s.lineage.codex.orbs).toBe('new');
    s = seeCodex(s, 'orbs');
    expect(s.lineage.codex.orbs).toBe('seen');
    // What the UI sees happen meets its entries.
    expect(codexMet(s).some((e) => e.id === 'haggle')).toBe(false);
    expect(meetCodex(s, 'shop').lineage.codex).toHaveProperty('haggle');
    const next = createNextLife({ ...s, ended: { day: 0, cause: 'test' } }, creation);
    expect(next.lineage.codex.orbs).toBe('seen');
  });
});

describe('save v48', () => {
  it('brings a v47 life up past its guides, with an empty journal and codex', () => {
    const s = createLife(creation);
    const raw = JSON.parse(JSON.stringify(makeSave(s, 0))) as {
      version: number;
      state: Record<string, unknown> & { lineage: Record<string, unknown> };
    };
    raw.version = 47;
    delete raw.state.journal;
    delete raw.state.lineage.guides;
    delete raw.state.lineage.codex;
    const back = loadSave(raw);
    expect(back.version).toBe(SAVE_VERSION);
    expect(back.state.lineage.guides).toEqual([...GUIDE_IDS]);
    expect(back.state.lineage.codex).toEqual({});
    expect(back.state.journal).toEqual({ quests: [], followed: null });
    expect(withPlayer(back.state, back.state.player).lineage.guides).toHaveLength(GUIDE_IDS.length);
  });
});

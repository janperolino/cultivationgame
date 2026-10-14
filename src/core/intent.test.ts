// The Intent ladder (design § The combat Daos, The Intent ladder): earning a stage with a
// capstone and a moment, a genius a tier early, what a stage does in a fight and how intent meets
// intent, NPCs by pedigree, and the v17 migration.
import { describe, expect, it } from 'vitest';
import { card } from '../content/cards/index.ts';
import {
  DOMAIN_FOE_DEFENSE,
  DOMAIN_FOE_EVASION,
  INTENT_ACCURACY,
  INTENT_ATTACK,
  INTENT_FOE_ACCURACY,
} from '../content/intent.ts';
import { template } from '../content/roster.ts';
import { cardWho, resolveCard } from './cards.ts';
import { eventText } from './chronicle.ts';
import { combatant, fromCultivator, weapon } from './combat/combatant.ts';
import { generateCultivator } from './combat/generate.ts';
import {
  brinkDaos,
  fightOver,
  intentEdge,
  preview,
  resolveTurn,
  type Fight,
  startFight,
  winner,
} from './combat/fight.ts';
import {
  intentMoment,
  intentRisen,
  npcIntent,
  readyDaos,
  readyFor,
  stageName,
  topStage,
} from './intent.ts';
import { Rng } from './rng.ts';
import { loadSave, makeSave, SAVE_VERSION } from './save/format.ts';
import { endSpar, YOU } from './spar.ts';
import { newLife, withPlayer, type GameState } from './state.ts';

const ONE_SWORD = 'sword-one-sword';
const SWORD_RAIN = 'sword-sword-rain';

const base = newLife({ name: 'Mo Yan', seed: 'intent' });

/** A sword cultivator at a realm, holding these nodes, with these talents. */
function swordsman(
  nodes: string[],
  o: { realm?: 'qi-condensation' | 'foundation-establishment'; talents?: string[] } = {},
): GameState {
  const p = base.player;
  return withPlayer(base, {
    ...p,
    qi: { ...p.qi, realm: o.realm ?? 'foundation-establishment', stage: 1 },
    nodes,
    talents: o.talents ?? [],
  });
}

const swordTech = {
  id: 'cut',
  name: 'cut',
  pinyin: '',
  hanzi: '',
  ladder: 'qi' as const,
  tier: 1,
  rarity: 'white' as const,
  line: 'cut',
  chapter: 1,
  daos: ['sword'],
  form: 'thrust' as const,
  damage: 'physical' as const,
  power: 40,
  qiCost: 0,
  source: 'test',
  text: 'test',
};

describe('earning a stage', () => {
  it('needs the tier 2 capstone and a moment: the capstone readies, the moment breaks through', () => {
    const unready = swordsman([]);
    expect(readyFor(unready.player, 'sword')).toBeNull();
    expect(intentMoment(unready, 'sword', 'epiphany')).toBe(unready);

    const ready = swordsman([SWORD_RAIN]);
    expect(readyFor(ready.player, 'sword')).toBe(1);
    expect(readyDaos(ready.player)).toEqual(['sword']);
    const opened = intentMoment(ready, 'sword', 'epiphany');
    expect(opened.player.intent).toEqual({ sword: 1 });
    expect(eventText(opened, opened.chronicle.at(-1)!)).toContain('Sword Intent 剑意');
    expect(intentRisen(ready.player, opened.player)).toEqual([{ dao: 'sword', stage: 1 }]);
    // Domain waits on tier 4's capstone, which isn't written yet: nothing more to be ready for.
    expect(readyFor(opened.player, 'sword')).toBeNull();
  });

  it('opens on the tier 1 capstone for a genius: Sword Heart at Qi Condensation', () => {
    const plain = swordsman([ONE_SWORD], { realm: 'qi-condensation' });
    expect(readyFor(plain.player, 'sword')).toBeNull();
    const heart = swordsman([ONE_SWORD], { realm: 'qi-condensation', talents: ['sword-heart'] });
    expect(readyFor(heart.player, 'sword')).toBe(1);
    expect(intentMoment(heart, 'sword', 'brink').player.intent.sword).toBe(1);
    // The Innate Sword Root is the same genius; a genius in Sword is none in Fire.
    const root = withPlayer(plain, { ...plain.player, root: 'sword' });
    expect(readyFor(root.player, 'sword')).toBe(1);
    expect(readyFor(heart.player, 'fire')).toBeNull();
  });

  it('comes from an epiphany card that names the Dao', () => {
    const ready = swordsman([SWORD_RAIN]);
    const k = card('dao-epiphany');
    const who = cardWho(ready.player);
    expect(who.slots.dao).toBe('Sword');
    expect(who.slots.intent).toBe('Sword Intent 剑意');
    const s: GameState = {
      ...ready,
      cards: {
        ...ready.cards,
        pending: [{ uid: 1, card: k.id, day: ready.calendar.day }],
      },
    };
    const r = resolveCard(s, 1, 0);
    expect(r.ok).toBe(true);
    expect(r.state.player.intent.sword).toBe(1);
  });

  it('comes from a fight won after acting with the Dao from under a tenth of your HP', () => {
    const ready = swordsman([SWORD_RAIN]);
    const me = fromCultivator(ready.player, YOU);
    const low = {
      ...me,
      hp: 5,
      maxHp: 100,
      weapon: weapon('sword', 1, 'white'),
      accuracy: 1e6,
      techniques: { cut: { technique: swordTech, accuracy: 1 } },
    };
    const foe = combatant({ id: 'foe', name: 'Foe', side: 'foes', hp: 1, maxHp: 100 });
    const rng = new Rng(3);
    /** Cuts until the foe falls, the foe never acting. */
    const cutDown = (hp: number): Fight => {
      let f = startFight([{ ...low, hp }, { ...foe }]);
      const cut = { actor: low.id, main: { type: 'technique', id: 'cut', target: 'foe' } } as const;
      for (let i = 0; i < 20 && !fightOver(f); i++) f = resolveTurn(f, [cut], rng).fight;
      return f;
    };
    const brink = cutDown(5);
    expect(winner(brink)).toBe(YOU);
    expect(brinkDaos(brink.combatants[0]!)).toEqual(['sword']);
    expect(endSpar(ready, brink, 'Foe').player.intent.sword).toBe(1);
    // A fight won at full HP marks no Dao and earns nothing.
    const easy = cutDown(100);
    expect(brinkDaos(easy.combatants[0]!)).toEqual([]);
    expect(endSpar(ready, easy, 'Foe').player.intent).toEqual({});
  });
});

describe('intent in a fight', () => {
  const none = { intent: {} };
  const intent = { intent: { sword: 1 } };
  const domain = { intent: { sword: 2 } };

  it('lifts the Dao actions and presses a foe below it; Domain adds Evasion and Defense', () => {
    expect(intentEdge(intent, none, ['sword'])).toEqual({
      accuracy: INTENT_ACCURACY,
      attack: INTENT_ATTACK,
      evasion: 1,
      defense: 1,
    });
    expect(intentEdge(intent, none, ['fire']).accuracy).toBe(1);
    expect(intentEdge(domain, none, ['sword'])).toEqual({
      accuracy: INTENT_ACCURACY,
      attack: INTENT_ATTACK,
      evasion: DOMAIN_FOE_EVASION,
      defense: DOMAIN_FOE_DEFENSE,
    });
    // The foe below aims at you at ×0.9, whatever Dao they strike with.
    expect(intentEdge(none, intent, ['saber']).accuracy).toBe(INTENT_FOE_ACCURACY);
  });

  it('is cancelled by a foe at your stage or above in any Dao: intent meets intent', () => {
    expect(intentEdge(intent, { intent: { fire: 1 } }, ['sword'])).toEqual({
      accuracy: 1,
      attack: 1,
      evasion: 1,
      defense: 1,
    });
    // Domain over a foe's Intent keeps all of it, and the foe is the one pressed.
    expect(intentEdge(domain, intent, ['sword']).defense).toBe(DOMAIN_FOE_DEFENSE);
    expect(intentEdge(intent, domain, ['sword']).accuracy).toBe(INTENT_FOE_ACCURACY);
    expect(topStage({ sword: 1, fire: 2 })).toBe(2);
  });

  it('shows in the hit chance a sword cultivator at Foundation sees once Intent opens', () => {
    const ready = swordsman([SWORD_RAIN]);
    const opened = intentMoment(ready, 'sword', 'epiphany');
    const foe = combatant({ id: 'foe', name: 'Foe', side: 'foes' });
    const chance = (s: GameState) => {
      const me = {
        ...fromCultivator(s.player, YOU),
        techniques: { cut: { technique: swordTech, accuracy: 1 } },
      };
      const p = preview(startFight([me, { ...foe }]), me.id, {
        type: 'technique',
        id: 'cut',
        target: 'foe',
      });
      return p!;
    };
    expect(fromCultivator(opened.player, YOU).intent).toEqual({ sword: 1 });
    expect(chance(opened).chance).toBeGreaterThan(chance(ready).chance);
    expect(chance(opened).damage).toBeGreaterThan(chance(ready).damage);
  });
});

describe('NPC intent by pedigree', () => {
  it('follows the pedigree table', () => {
    expect(npcIntent('rogue', 'foundation-establishment')).toBe(0);
    expect(npcIntent('rogue', 'core-formation')).toBe(1);
    expect(npcIntent('rogue', 'nascent-soul')).toBe(1);
    expect(npcIntent('great-sect', 'qi-condensation')).toBe(0);
    expect(npcIntent('great-sect', 'foundation-establishment')).toBe(1);
    expect(npcIntent('great-sect', 'nascent-soul')).toBe(2);
    expect(npcIntent('sacred-land', 'core-formation')).toBe(2);
    expect(npcIntent('chosen', 'qi-condensation')).toBe(1);
  });

  it('puts it on the weapon’s Dao of a generated cultivator', () => {
    const t = template('beast-butcher-disciple');
    if (t.kind !== 'cultivator') throw new Error('a cultivator template');
    const npc = generateCultivator(t, 'foundation-establishment', 1, new Rng(9));
    expect(npc.combatant.intent).toEqual({ [t.weapon]: npcIntent(t.pedigree, npc.realm) });
  });

  it('names each stage in its Dao’s own words', () => {
    expect(stageName('saber', 2)).toEqual({ name: 'Saber Domain', hanzi: '刀域' });
  });
});

describe('the v17 save', () => {
  it('gives an old life no intent and learns Sword Intent the node as Sword Bearing', () => {
    const raw = JSON.parse(JSON.stringify(makeSave(swordsman([]), 1)));
    raw.version = 16;
    delete raw.state.player.intent;
    raw.state.player.nodes = ['sword-sword-intent'];
    const loaded = loadSave(raw);
    expect(loaded.version).toBe(SAVE_VERSION);
    expect(loaded.state.player.intent).toEqual({});
    expect(loaded.state.player.nodes).toEqual(['sword-sword-bearing']);
  });
});

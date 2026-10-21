// Combat's sound (design § Combat, "Effects fill the wait"): it reads the same five tags as the
// effects and nothing else. The form gives the blow, the damage type a tail laid over it, the result
// its flourish, and the attacker's realm the scale, as the effects scale: as recorded at Qi
// Condensation, slower and deeper at Foundation, a quake under it at Core Formation, all of it at
// its largest from Nascent Soul up.
import type { DamageType, OutcomeForm, OutcomeResult } from '../../content/combat.ts';
import { realmIndex, type RealmId } from '../../content/realms.ts';
import { ELEMENT_CUE, FORM_CUE, type EffectId } from './table.ts';

/** One sound of a blow: which effect, how fast, how loud, how much low end, how long after. */
export interface Layer {
  id: EffectId;
  /** Playback rate: under 1 plays slower and deeper. */
  rate: number;
  gain: number;
  /** A low shelf's boost, in dB. */
  low: number;
  delay: number;
}

export interface ShotTags {
  form: OutcomeForm;
  type: DamageType | null;
  realm: RealmId;
  result: OutcomeResult;
}

/** By scale, 0 at Qi Condensation to 3 from Nascent Soul up. */
const RATE = [1, 0.9, 0.8, 0.7];
const GAIN = [1, 1.1, 1.2, 1.3];
const LOW = [0, 2, 5, 8];
const QUAKE = [0, 0, 0.6, 1];

/** The layers one outcome plays, in the order they start. */
export function shotLayers(t: ShotTags): Layer[] {
  const scale = Math.min(3, realmIndex(t.realm));
  const at = (id: EffectId | null, gain: number, delay = 0): Layer[] =>
    id ? [{ id, rate: RATE[scale]!, gain: gain * GAIN[scale]!, low: LOW[scale]!, delay }] : [];
  const form = FORM_CUE[t.form];
  const tail = t.type ? ELEMENT_CUE[t.type] : null;
  const quake = QUAKE[scale]! > 0 ? at('res-quake', QUAKE[scale]!) : [];
  switch (t.result) {
    case 'miss':
      return [...at(form, 0.5), ...at('res-miss', 0.9, 30)];
    case 'backfire':
      return [...at('res-backfire', 1), ...at(tail, 0.8, 40), ...quake];
    case 'critical':
      return [...at(form, 1), ...at(tail, 0.9, 40), ...at('res-critical', 1, 60), ...quake];
    case 'hit':
      return [...at(form, 1), ...at(tail, 0.8, 40), ...quake];
    case 'failed':
      return at(form, 0.6);
    default:
      // Held, escaped and swayed: the action's own sound.
      return at(form, 1);
  }
}
